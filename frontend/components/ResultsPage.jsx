import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ResultsPage.css";

const ResultsPage = ({ darkMode, userId }) => {
  const [reports, setReports] = useState([]);

  // Function to fetch reports
  const fetchReports = () => {
    if (userId) {
      axios.get(`http://localhost:5000/reports?role=user&user_id=${userId}`)
        .then(res => setReports(res.data))
        .catch(err => console.error("Error fetching reports:", err));
    }
  };

  useEffect(() => {
    fetchReports();
  }, [userId]);

  // Function to handle clearing/deleting all reports for the user
  const handleClearReports = async () => {
    // Only proceed if there are reports to clear
    if (reports.length === 0) return;

    // A simple confirmation before deleting
    const isConfirmed = window.confirm(
      "Are you sure you want to delete ALL your reports? This action cannot be undone."
    );

    if (isConfirmed) {
      try {
        // Assuming your backend has an endpoint to delete all reports for a user
        // You might need to adjust the DELETE URL based on your API design
        await axios.delete(`http://localhost:5000/reports?user_id=${userId}`);

        // Update the state to clear the reports from the UI
        setReports([]);

        console.log("Reports cleared successfully.");
      } catch (err) {
        console.error("Error clearing reports:", err);
        alert("Failed to clear reports. Please try again.");
      }
    }
  };

  return (
    <div className={`results-page ${darkMode ? "dark" : ""}`}>
      <div className="reports-header">
        <h2>Your Reports</h2>
        {/* The clear button is disabled if there are no reports */}
        <button
          onClick={handleClearReports}
          disabled={reports.length === 0}
          className="clear-reports-btn" // Add a class for styling
        >
          Clear All Reports
        </button>
      </div>

      {reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        reports.map((report, idx) => (
          <div key={idx} className="report-card">
            <p>
              <b>Disease:</b> {report.disease}
            </p>
            <p>
              <b>Result:</b> {report.result}
            </p>
            <p>
              <b>Ct Values:</b> {report.ct_value || "N/A"}
            </p>
            <p>
              <b>AI Suggestions:</b>
            </p>
            <ul>
              {report.suggestion?.["AI Suggestion"]?.map((sug, i) => (
                <li key={i}>{sug}</li>
              ))}
            </ul>
            <p>
              <b>Source:</b> {report.source}
            </p>
            <p>
              <b>Created At:</b> {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default ResultsPage;