import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./Dashboard";
import MultiReportUpload from "./MultiReportUpload";

function App() {
  return (
    <Router>
      {/* Navbar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">ZoonoticAI</h1>
        <div className="flex gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "text-white bg-blue-500 px-3 py-1 rounded font-medium"
                : "text-blue-500 hover:text-blue-700 font-medium"
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              isActive
                ? "text-white bg-blue-500 px-3 py-1 rounded font-medium"
                : "text-blue-500 hover:text-blue-700 font-medium"
            }
          >
            Upload Reports
          </NavLink>
        </div>
      </nav>

      {/* Page Content */}
      <div className="p-6 min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<MultiReportUpload />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
