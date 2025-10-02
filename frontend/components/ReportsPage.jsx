import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ReportsPage.css"; // Ensure you have the CSS file for styling

const ReportsPage = ({ darkMode }) => {
    const [users, setUsers] = useState([]);
    // Use a complex object for selectedUser to maintain its reports
    const [selectedUser, setSelectedUser] = useState(null); 
    const [loading, setLoading] = useState(true);

    // Function to fetch and process reports (SIMPLIFIED and working with grouped backend data)
    const fetchAndProcessReports = async () => {
        setLoading(true);
        try {
            // Backend is expected to return an array of unique user objects, 
            // each with a nested 'reports' array.
            const res = await axios.get(`http://localhost:5000/reports?role=doctor`);
            const uniqueUsers = res.data; // Use the grouped data directly
            
            setUsers(uniqueUsers);

            // Maintain selected user state across refreshes
            if (selectedUser) {
                // Find the user object in the new data based on the ID of the previously selected user
                const reSelectedUser = uniqueUsers.find(u => u.user_id === selectedUser.user_id);
                // If found, re-select it; otherwise, select the first user or null
                setSelectedUser(reSelectedUser || uniqueUsers[0] || null);
            } else if (uniqueUsers.length > 0) {
                // If no user was previously selected, select the first one
                setSelectedUser(uniqueUsers[0]);
            }
        } catch (err) {
            console.error("Error fetching doctor reports:", err);
            alert("Failed to fetch reports. Ensure the Flask server is running and accessible.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndProcessReports();
    }, []); // Run only once on mount

    // --- FUNCTION: Handle Deletion for SELECTED User ---
    const handleClearUserReports = async () => {
        if (!selectedUser || selectedUser.reports.length === 0) return;

        const isConfirmed = window.confirm(
            `Are you sure you want to delete ALL reports for ${selectedUser.username}? This action cannot be undone.`
        );

        if (isConfirmed) {
            try {
                // Calls the user-specific DELETE endpoint
                await axios.delete(`http://localhost:5000/reports?user_id=${selectedUser.user_id}`);
                await fetchAndProcessReports(); // Reload data
                alert(`Reports for ${selectedUser.username} cleared successfully.`);
            } catch (err) {
                console.error("Error clearing user reports:", err);
                alert("Failed to clear reports. Check the server connection.");
            }
        }
    };

    // --- FUNCTION: Handle Global Deletion ---
    const handleGlobalClear = async () => {
        if (users.length === 0) {
            alert("No reports found to clear globally.");
            return;
        }

        const isConfirmed = window.confirm(
            "SECURITY WARNING: Are you sure you want to delete ALL REPORTS for ALL USERS? This action cannot be undone."
        );

        if (isConfirmed) {
            try {
                // Calls the dedicated global DELETE endpoint
                await axios.delete("http://localhost:5000/admin/clear_all_data");
                await fetchAndProcessReports();
                setSelectedUser(null);
                alert("All application data successfully cleared!");
            } catch (err) {
                console.error("Error clearing global reports:", err);
                alert("Failed to perform global clear. Check the server connection.");
            }
        }
    };

    return (
        <div className={`doctor-dashboard ${darkMode ? "dark" : ""}`}>
            
            {/* Header and Global Clear Button */}
            <div className="dashboard-header-with-button">
                <h2>Doctor Dashboard</h2>
                <button
                    onClick={handleGlobalClear}
                    disabled={loading || users.length === 0}
                    className="global-clear-btn"
                >
                    Clear ALL Reports (Global)
                </button>
            </div>

            <div className="dashboard-content">

                {/* Users List Panel */}
                <div className="users-list">
                    <h3>Users with Reports</h3>
                    {loading ? (
                        <p>Loading users...</p>
                    ) : users.length === 0 ? (
                        <p>No users found.</p>
                    ) : (
                        users.map(user => (
                            <button
                                key={user.user_id}
                                onClick={() => setSelectedUser(user)}
                                className={selectedUser && selectedUser.user_id === user.user_id ? 'active user-button' : 'user-button'}
                            >
                                {user.username} ({user.reports.length})
                            </button>
                        ))
                    )}
                </div>

                {/* Selected User Reports Panel */}
                {selectedUser ? (
                    <div className="user-reports">
                        <div className="user-reports-header">
                            <h3>Reports for {selectedUser.username}</h3>
                            <button
                                onClick={handleClearUserReports}
                                disabled={selectedUser.reports.length === 0}
                                className="clear-reports-btn"
                            >
                                Clear All Reports
                            </button>
                        </div>

                        {selectedUser.reports.length === 0 ? (
                            <p>No reports found for this user.</p>
                        ) : (
                            // Detailed Report Card Display Logic
                            selectedUser.reports.map((report, idx) => (
                                <div key={report._id || idx} className="report-card">
                                    {/* Use optional chaining to safely display data */}
                                    <p><b>Disease:</b> {report.disease || "N/A"}</p>
                                    <p><b>Result:</b> {report.result || "N/A"}</p>
                                    <p><b>Ct Values:</b> {report.ct_value || "N/A"}</p>
                                    <p>
                                        <strong>Risk Level:</strong> {report.suggestion?.["Risk Level"] || "N/A"} (
                                        {report.suggestion?.["Risk Probability"] ? (report.suggestion["Risk Probability"] * 100).toFixed(1) : "N/A"}%)
                                    </p>
                                    <p><b>AI Suggestions:</b></p>
                                    <ul>
                                        {report.suggestion?.["AI Suggestion"]?.map((sug, i) => <li key={i}>{sug}</li>) || <li>No suggestions available.</li>}
                                    </ul>
                                    <p><b>Source:</b> {report.source || "N/A"}</p>
                                    <p><b>Created At:</b> {report.created_at ? new Date(report.created_at).toLocaleString() : "N/A"}</p>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="user-reports">
                        <p>{loading ? "Loading..." : "Select a user from the left panel to view their reports."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;