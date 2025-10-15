// frontend/components/DoctorDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import ReportCharts from "./ReportCharts";
import {
  FaNotesMedical,
  FaUserInjured,
  FaUserMd,
  FaChartPie,
  FaFileMedicalAlt,
} from "react-icons/fa";
import "./DoctorDashboard.css"; // We'll keep using your CSS file

const DoctorDashboard = () => {
  const [usersWithReports, setUsersWithReports] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // A single useEffect to fetch all data at once
  useEffect(() => {
    setLoading(true);
    axios
      .get("http://localhost:5000/reports", { params: { role: "doctor" } })
      .then((res) => {
        setUsersWithReports(res.data);
        // Automatically select the first user if data exists
        if (res.data && res.data.length > 0) {
          setSelectedUser(res.data[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch doctor data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const reports = selectedUser ? selectedUser.reports : [];

  const getRiskLevelClass = (level) => {
    switch (level?.toLowerCase()) {
      case "high": return "risk-high";
      case "medium": return "risk-medium";
      case "low": return "risk-low";
      default: return "risk-default";
    }
  };

  return (
    <div className="doctor-dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <FaNotesMedical style={{ fontSize: '1.5rem', color: '#22d3ee' }} />
          <h1>Doctor Panel</h1>
        </div>
        <nav className="sidebar-nav">
          <h3 className="sidebar-nav-title">Patients</h3>
          {loading ? (
            <p style={{padding: '0 1rem'}}>Loading...</p>
          ) : (
            <ul className="patient-list">
              {usersWithReports.map((user) => (
                <li key={user.user_id}>
                  <a
                    href="#"
                    className={`patient-link ${selectedUser?.user_id === user.user_id ? "selected" : ""}`}
                    onClick={(e) => { e.preventDefault(); setSelectedUser(user); }}
                  >
                    <FaUserInjured />
                    <span>{user.username} ({user.reports.length})</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <div className="main-content">
        <header className="dashboard-header">
          <h2>Welcome Back, Doctor!</h2>
        </header>

        <main className="dashboard-main">
          {loading ? <p>Loading dashboard...</p> : (
            <>
              <div className="summary-cards">
                <div className="card">
                  <div className="card-icon" style={{ backgroundColor: '#cffafe' }}>
                    <FaUserMd style={{ color: '#0891b2' }} />
                  </div>
                  <div className="card-info">
                    <p className="label">Selected Patient</p>
                    <p className="value">{selectedUser?.username || "N/A"}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon" style={{ backgroundColor: '#d1fae5' }}>
                    <FaFileMedicalAlt style={{ color: '#059669' }} />
                  </div>
                  <div className="card-info">
                    <p className="label">Total Reports</p>
                    <p className="value">{reports.length}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon" style={{ backgroundColor: '#ffe4e6' }}>
                    <FaChartPie style={{ color: '#e11d48' }} />
                  </div>
                  <div className="card-info">
                    <p className="label">High-Risk Reports</p>
                    <p className="value">{reports.filter(r => r.suggestion?.["Risk Level"] === 'High').length}</p>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <h3>Patient Reports for {selectedUser?.username}</h3>
                </div>
                <div className="table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Disease</th>
                        <th>Risk Level</th>
                        <th>Risk Probability</th>
                        <th>Matched Symptoms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length > 0 ? (
                        reports.map((report) => (
                          <tr key={report._id}>
                            <td className="disease-cell">{report.disease}</td>
                            <td>
                              <span className={`risk-badge ${getRiskLevelClass(report.suggestion?.["Risk Level"])}`}>
                                {report.suggestion?.["Risk Level"] || "N/A"}
                              </span>
                            </td>
                            <td>{(report.suggestion?.["Risk Probability"] * 100).toFixed(1)}%</td>
                            <td>{report.matched_symptoms?.join(", ") || "None"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No reports found for this user.
                          </td>
</tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="charts-section">
                <ReportCharts reports={reports} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboard;