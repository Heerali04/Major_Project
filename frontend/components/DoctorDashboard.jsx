import React, { useEffect, useState } from "react";
import axios from "axios";

const DoctorDashboard = ({ userId, token }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [reports, setReports] = useState([]);

  // Fetch all users who have reports
  useEffect(() => {
    axios
      .get("http://localhost:5000/reports", {
        params: { role: "doctor" },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch reports for the selected user
  useEffect(() => {
    if (!selectedUserId) return;

    axios
      .get("http://localhost:5000/reports", {
        params: { role: "doctor", target_user_id: selectedUserId },
      })
      .then((res) => setReports(res.data))
      .catch((err) => console.error(err));
  }, [selectedUserId]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Doctor Dashboard</h1>

      <div className="flex">
        {/* User List */}
        <div className="w-1/4 border-r pr-4">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <ul>
            {users.map((u) => (
              <li
                key={u._id}
                className={`p-2 cursor-pointer rounded hover:bg-gray-200 ${
                  selectedUserId === u._id ? "bg-gray-300" : ""
                }`}
                onClick={() => setSelectedUserId(u._id)}
              >
                {u.username || u._id}
              </li>
            ))}
          </ul>
        </div>

        {/* Reports */}
        <div className="w-3/4 pl-4">
          <h2 className="text-xl font-semibold mb-2">
            {selectedUserId ? `Reports for ${users.find(u => u._id === selectedUserId)?.username}` : "Select a user"}
          </h2>

          {reports.length === 0 && selectedUserId && (
            <p>No reports found for this user.</p>
          )}

          {reports.map((report) => (
            <div key={report._id || report.id} className="mb-4 p-4 border rounded bg-gray-50">
              <p><strong>Disease:</strong> {report.disease}</p>
              {report.matched_symptoms?.length > 0 && (
                <p><strong>Matched Symptoms:</strong> {report.matched_symptoms.join(", ")}</p>
              )}
              {report.suggestion?.["AI Suggestion"] && (
                <div className="mt-2">
                  <strong>AI Suggestions:</strong>
                  <ul className="list-disc ml-5">
                    {report.suggestion["AI Suggestion"].map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.suggestion?.["Reasoning"] && (
                <div className="mt-2">
                  <strong>Reasoning:</strong>
                  <ul className="list-disc ml-5">
                    {report.suggestion["Reasoning"].map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.suggestion?.["Risk Level"] && report.suggestion?.["Risk Probability"] && (
                <p className="mt-2">
                  <strong>Risk Level:</strong> {report.suggestion["Risk Level"]} (
                  {(report.suggestion["Risk Probability"] * 100).toFixed(1)}%)
                </p>
              )}
              {report.raw_text && (
                <div className="mt-2">
                  <strong>Raw Text:</strong>
                  <pre className="bg-gray-100 p-2 rounded">{report.raw_text}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
