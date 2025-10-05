import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ResultsPage.css";

const ResultsPage = ({ darkMode, userId, isDoctor }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // 💡 CRITICAL CHANGE: Make fetchReports callable from deletion handler
  // Fetch reports for the user or doctor
  const fetchReports = async () => {
    // If a user ID is not available for a user, or if we're not a doctor, stop.
    if (!userId && !isDoctor) return;
    setLoading(true);
    try {
      const role = isDoctor ? "doctor" : "user";
      // Construct the URL with user_id only if it's a regular user view
      const url = `http://localhost:5000/reports?role=${role}${!isDoctor ? `&user_id=${userId}` : ""}`;
      
      const res = await axios.get(url);
      
      // The doctor view returns an array of user objects, which we need to flatten for display
      // The user view returns an array of reports directly
      const fetchedReports = isDoctor ? res.data.flatMap(u => u.reports) : res.data;
      
      setReports(fetchedReports || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      alert("Failed to fetch reports.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [userId, isDoctor]); // Added isDoctor to dependency array for clarity

// --------------------------------------------------------------------------------
// 💡 CRITICAL CHANGES: handleClearReports function logic
// --------------------------------------------------------------------------------
const handleClearReports = async () => {
  if (!isDoctor && !userId) return; // Safety check
  if (reports.length === 0 && !isDoctor) return; // Only prevent non-doctors from confirming an empty clear

  const confirmMessage = isDoctor 
    ? "Are you sure you want to delete ALL patient reports? This action cannot be undone."
    : "Are you sure you want to delete ALL your reports? This action cannot be undone.";

  if (!window.confirm(confirmMessage)) return;

  setLoading(true);
  try {
    let endpoint = "";
    
    if (isDoctor) {
      // Doctor/Admin Global Clear Endpoint
      endpoint = "http://localhost:5000/doctor/clear_all_reports";
      // Note: The /admin/clear_all_data route is redundant but could also be used.
      // We use /doctor/clear_all_reports as it is role-specific.
    } else {
      // User-specific Clear Endpoint
      endpoint = `http://localhost:5000/reports?user_id=${userId}`;
    }

    const res = await axios.delete(endpoint);
    
    if (res.data.success) {
      // 💡 Key fix: Instead of only clearing local state (which might be complex 
      // in the doctor view), re-fetch the data to confirm the deletion.
      alert(res.data.message);
      await fetchReports(); // Re-fetch to update the UI
    } else {
      alert("Failed to clear reports: " + (res.data.error || res.data.message));
    }
  } catch (err) {
    console.error("Error clearing reports:", err);
    alert("Failed to clear reports. Please check server status.");
  }
  setLoading(false);
};
// --------------------------------------------------------------------------------

  // Risk level class for styling (Unchanged)
  const getRiskClass = (level) => {
    if (!level) return "";
    switch (level.toLowerCase()) {
      case "high":
        return "risk-high";
      case "case":
        return "risk-case";
      case "moderate":
        return "risk-moderate";
      case "low":
        return "risk-low";
      default:
        return "";
    }
  };

  // --------------------------------------------------------------------------------
  // 💡 Minor logic change in render: determine if the clear button should be disabled
  // --------------------------------------------------------------------------------
  // Calculate displayReports for rendering and check if the array is empty for button logic
  const displayReports = isDoctor ? reports.flatMap(u => u.reports || []) : reports;
  const disableClear = displayReports.length === 0;

  return (
    <div className={`results-page ${darkMode ? "dark" : ""}`}>
      <div className="reports-header">
        <h2>{isDoctor ? "All Patient Reports" : "Your Reports"}</h2>
        <button
          onClick={handleClearReports}
          disabled={loading || disableClear} // Disable during loading or if no reports exist
          className="clear-reports-btn"
        >
          {isDoctor ? "Clear All Reports" : "Clear My Reports"}
        </button>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : displayReports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        // Render the flattened array (displayReports)
        displayReports.map((report, idx) => (
          <div key={idx} className="report-card">
            {/* Display username/user_id in doctor view for context */}
            {isDoctor && (
              <p><b>Patient ID:</b> {report.user_id}</p>
            )}
            <p><b>Disease:</b> {report.disease}</p>
            <p><b>Result:</b> {report.result}</p>
            <p><b>Ct Values:</b> {report.ct_value || JSON.stringify(report.ct_values) || "N/A"}</p>
            <p>
              <b>Risk Level:</b>{" "}
              <span className={getRiskClass(report.suggestion?.["Risk Level"])}>
                {report.suggestion?.["Risk Level"] || "N/A"}
              </span>
            </p>
            <p><b>AI Suggestions:</b></p>
            <ul>
              {report.suggestion?.["AI Suggestion"]?.map((sug, i) => (
                <li key={i}>{sug}</li>
              ))}
            </ul>
            <p><b>Source:</b> {report.source}</p>
            <p><b>Created At:</b> {new Date(report.created_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default ResultsPage;