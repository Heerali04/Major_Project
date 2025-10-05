import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./UploadPage.css";

export default function UploadPage({ darkMode = false }) { 
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", localStorage.getItem("user_id") || "test_user");

    try {
      const res = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReport(res.data);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to upload file. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (level) => {
    if (!level) return "";
    switch (level.toLowerCase()) {
      case "high": return "risk-high";
      case "moderate": return "risk-moderate";
      case "low": return "risk-low";
      default: return "";
    }
  };

  // Calculate risk based on Ct values
  const calculateCtRisk = (ctValues) => {
    if (!ctValues || Object.keys(ctValues).length === 0) return {level: "Unknown", text: "N/A"};
    
    // Example logic:
    // Ct < 20 => High risk
    // Ct 20-30 => Moderate
    // Ct > 30 => Low
    const numericCts = Object.values(ctValues)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
    if (numericCts.length === 0) return {level: "Unknown", text: "N/A"};

    const minCt = Math.min(...numericCts);

    if (minCt < 20) return {level: "High", text: minCt};
    if (minCt <= 30) return {level: "Moderate", text: minCt};
    return {level: "Low", text: minCt};
  };

  const ctRisk = report ? calculateCtRisk(report.ct_values) : null;

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

      {report && (
        <div className="report-card">
          <h3>Analysis Result</h3>
          <p><strong>Disease:</strong> {report.disease}</p>
          <p><strong>Result:</strong> {report.result}</p>

          {/* Ct values display */}
          {report.ct_values && report.ct_values !== "N/A" && (
            <div>
              <strong>Ct Values:</strong>
              <ul>
                {Object.entries(report.ct_values).map(([gene, value]) => (
                  <li key={gene}>{gene}: {value}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk level based on Ct */}
          {ctRisk && (
            <p className={`risk-level-display ${getRiskClass(ctRisk.level)}`}>
              <strong>Risk Level (Ct-based):</strong> {ctRisk.level} (Min Ct: {ctRisk.text})
            </p>
          )}

          {/* Original AI suggestions */}
          {report.suggestion?.["AI Suggestion"] && (
            <div>
              <strong>AI Suggestions:</strong>
              <ul>
                {report.suggestion["AI Suggestion"].map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
