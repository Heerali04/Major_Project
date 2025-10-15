import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ResultsPage.css";

const ResultsPage = ({ darkMode, userId, isDoctor }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // ------------------ Fetch Reports ------------------
  const fetchReports = async () => {
    // 💡 CORRECTION 1: Handle cases where userId is null but isDoctor is true (or vice versa)
    if (!userId && !isDoctor) return; 
    setLoading(true);
    try {
      const role = isDoctor ? "doctor" : "user";
      // Construct URL: Doctor uses only role, User uses role and user_id
      const url = `http://localhost:5000/reports?role=${role}${
        !isDoctor && userId ? `&user_id=${userId}` : ""
      }`;

      const res = await axios.get(url);

      let fetchedReports = [];
      if (isDoctor) {
        // 💡 CORRECTION 2: When isDoctor is true, the server returns an array of USER OBJECTS, 
        // each containing a 'reports' array. We need to flatten ALL reports from ALL users.
        if (Array.isArray(res.data)) {
          // Flatten reports from all user objects and sort them by date (latest first)
          fetchedReports = res.data.flatMap(u => u.reports)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      } else {
        // User view: server returns the array of reports directly, already sorted.
        fetchedReports = res.data;
      }

      setReports(fetchedReports || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      alert("Failed to fetch reports. Please check the server status.");
    }
    setLoading(false);
  };

  useEffect(() => {
    // 💡 Correction 3: Use an empty array for dependency if userId is 'guest'
    // or ensure `userId` is not undefined before fetching.
    if (userId) { 
      fetchReports();
    }
  }, [userId, isDoctor]);

  // ------------------ Clear Reports ------------------
  const handleClearReports = async () => {
    // Simple check to ensure we have context
    if (!userId && !isDoctor) return;
    
    // Check for reports before confirming deletion
    if (!isDoctor && reports.length === 0) return;

    const confirmMessage = isDoctor
      ? "Are you sure you want to delete ALL patient reports? This action cannot be undone."
      : "Are you sure you want to delete ALL your reports? This action cannot be undone.";

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      // Determine the correct endpoint based on the role
      let endpoint = isDoctor
        ? "http://localhost:5000/doctor/clear_all_reports"
        : `http://localhost:5000/reports?user_id=${userId}`; // User-specific clear

      const res = await axios.delete(endpoint);

      if (res.data.success) {
        alert(res.data.message);
        // Refetch the remaining reports (which should be none for user)
        await fetchReports();
      } else {
        alert("Failed to clear reports: " + (res.data.error || res.data.message));
      }
    } catch (err) {
      console.error("Error clearing reports:", err);
      alert("Failed to clear reports. Please check server status.");
    }
    setLoading(false);
  };

  // ------------------ PDF Download ------------------
  const handleDownloadPDF = (report) => {
    // 💡 CORRECTION 4: The server endpoint is `download_report/{id}`
    // You only need the report ID, the server handles the response type (PDF)
    const downloadUrl = `http://localhost:5000/download_report/${report._id}`;

    // Use a simple window open. The server is configured to send the PDF file 
    // with the `Content-Disposition: attachment` header, which prompts a download.
    window.open(downloadUrl, '_blank');
  };

  // ------------------ Utility Functions ------------------
  const getRiskClass = (level) => {
    if (!level) return "";
    switch (level.toLowerCase()) {
      case "high":
        return "risk-high";
      case "moderate":
        return "risk-moderate";
      case "low":
        return "risk-low";
      default:
        return "";
    }
  };

  // Determine if the clear button should be disabled
  const disableClear = reports.length === 0;

  // ------------------ Render ------------------
  return (
    <div className={`results-page ${darkMode ? "dark" : ""}`}>
      <div className="reports-header">
        <h2>{isDoctor ? "All Patient Reports" : "Your Reports"}</h2>
        <button
          onClick={handleClearReports}
          disabled={loading || disableClear}
          className="clear-reports-btn"
        >
          {isDoctor ? "Clear All Reports" : "Clear My Reports"}
        </button>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <div className="reports-list">
          {reports.map((report, idx) => (
            <div key={report._id || idx} className="report-card">
              {/* Header */}
              <div className="report-card-header">
                <h3>Report {idx + 1} - {report.disease || "Analysis"}</h3>
                <button 
                  onClick={() => handleDownloadPDF(report)}
                  className="download-pdf-btn"
                >
                  Download PDF
                </button>
              </div>

              {/* Body */}
              <div className="report-card-body">
                {isDoctor && (
                  <div className="report-data-item">
                    <span className="data-label">Patient ID:</span>
                    <span className="data-value">{report.user_id}</span>
                  </div>
                )}
                <div className="report-data-item">
                  <span className="data-label">Test Result:</span>
                  <span className="data-value">{report.result || 'N/A'}</span>
                </div>
                <div className="report-data-item">
                  <span className="data-label">Risk Level:</span>
                  <span className={`data-value ${getRiskClass(report.risk_level)}`}>
                    {/* Use the top-level `risk_level` field */}
                    {report.risk_level || "N/A"} 
                  </span>
                </div>
                <div className="report-data-item">
                  <span className="data-label">Ct Values:</span>
                  <span className="data-value">
                    {/* Handle both string representation and object fallback */}
                    {report.ct_value || (report.ct_values ? JSON.stringify(report.ct_values) : "N/A")}
                  </span>
                </div>
                <div className="report-data-item">
                  <span className="data-label">Source:</span>
                  <span className="data-value">{report.source || 'Manual Entry'}</span>
                </div>
                <div className="report-data-item">
                  <span className="data-label">Created At:</span>
                  <span className="report-date">
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>
                {/* Confidence/Symptoms only if available */}
                {(report.confidence || report.symptoms_reported) && (
                  <div className="report-data-item full-width">
                    <span className="data-label">Details:</span>
                    <span className="data-value">
                        {report.confidence ? `Confidence: ${report.confidence}%` : ''}
                        {report.confidence && report.symptoms_reported ? ' | ' : ''}
                        {report.symptoms_reported ? `Symptoms: ${report.symptoms_reported}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Suggestions (Rule-based) */}
              <div className="ai-suggestions-section">
                <p className="data-label" style={{marginTop: '15px', marginBottom: '5px'}}>AI Recommendations (Model-Based):</p>
                <ul>
                  {/* Safely map over the nested array */}
                  {report.suggestion?.["AI Suggestion"]?.map((sug, i) => (
                    <li key={i} className="data-value">{sug}</li>
                  ))}
                  {(!report.suggestion?.["AI Suggestion"] || report.suggestion["AI Suggestion"].length === 0) && (
                    <li className="data-value">No specific model-based suggestions provided.</li>
                  )}
                </ul>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;