import React, { useState } from "react";
import axios from "axios";
// 1. Import useNavigate from react-router-dom
import { useNavigate } from "react-router-dom";
import "./UploadPage.css";

export default function UploadPage({ darkMode = false }) { 
  const [file, setFile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2. Initialize the navigate function
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", localStorage.getItem("user_id") || "test_user");

    try {
      const res = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newReport = { ...res.data, id: res.data.report_id || Date.now() }; 
      setReports([newReport, ...reports]);
      
      // 3. Navigate to the desired link on success
      // If your homepage is at '/', use:
      // navigate("/");
      
      // If you want to redirect to a /results page, use:
      navigate("/results"); // Assuming '/results' is the route for viewing reports

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload file. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`upload-page ${darkMode ? "dark" : ""}`}>
      <h2>Upload Zoonotic Test Report</h2>

      <div className="upload-controls">
        <input
          type="file"
          onChange={(e) => {
            setFile(e.target.files[0]);
            setError("");
          }}
        />
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload & Analyze"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {/* The component will redirect after a successful upload, 
          so displaying the reports here is now optional/temporary. */}
      {reports.length > 0 && (
        <>
          <h3>Latest Upload Analysis (Redirecting...)</h3>
          <div className="uploaded-reports-list">
            {reports.map((r) => (
              <div key={r.id} className="report-card">
                <h3>
                  {r.disease} - {r.result}
                </h3>
                <p>
                  <strong>Risk Level:</strong> {r.suggestion?.["Risk Level"]}
                </p>
                {/* ... other report details */}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}