import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import Modal from "react-modal";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale, // x-axis
  LinearScale,   // y-axis
  BarElement,    // Bar chart
  ArcElement,    // Pie chart
  Title,
  Tooltip,
  Legend
);

Modal.setAppElement("#root");

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    try {
      const query = [];
      if (search) query.push(`search=${search}`);
      if (filterResult) query.push(`result=${filterResult}`);
      const queryString = query.length > 0 ? `?${query.join("&")}` : "";

      const res = await axios.get(`http://localhost:5000/reports${queryString}`);
      setReports(res.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  }, [search, filterResult]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/reports/stats");
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [fetchReports, fetchStats]);

  const openModal = (report) => {
    setSelectedReport(report);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setModalOpen(false);
  };

  // Prepare chart data
  const diseaseData = {
    labels: stats.disease_distribution ? Object.keys(stats.disease_distribution) : [],
    datasets: [
      {
        label: "Disease Count",
        data: stats.disease_distribution ? Object.values(stats.disease_distribution) : [],
        backgroundColor: "rgba(99, 102, 241, 0.7)",
      },
    ],
  };

  const positiveNegativeData = {
    labels: ["Positive", "Negative"],
    datasets: [
      {
        label: "Reports",
        data: [stats.positive_cases || 0, stats.negative_cases || 0],
        backgroundColor: ["#10B981", "#EF4444"],
      },
    ],
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">ZoonoticAI Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow text-center">
          <h2 className="text-gray-500">Total Reports</h2>
          <p className="text-2xl font-bold">{stats.total_reports || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <h2 className="text-gray-500">Positive Cases</h2>
          <p className="text-2xl font-bold">{stats.positive_cases || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <h2 className="text-gray-500">Negative Cases</h2>
          <p className="text-2xl font-bold">{stats.negative_cases || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow text-center">
          <h2 className="text-gray-500">Patients Analyzed</h2>
          <p className="text-2xl font-bold">{stats.patients_analyzed || 0}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by Patient ID, Name, or Disease"
          className="p-2 rounded border flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="p-2 rounded border"
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
        >
          <option value="">All Results</option>
          <option value="Positive">Positive</option>
          <option value="Negative">Negative</option>
          <option value="Inconclusive">Inconclusive</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Patient ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Age</th>
              <th className="p-2">Gender</th>
              <th className="p-2">Disease</th>
              <th className="p-2">E-gene Ct</th>
              <th className="p-2">RdRp Ct</th>
              <th className="p-2">N-gene Ct</th>
              <th className="p-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((rep, idx) => (
              <tr
                key={idx}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => openModal(rep)}
              >
                <td className="p-2">{rep.Patient_ID}</td>
                <td className="p-2">{rep.Name}</td>
                <td className="p-2">{rep.Age}</td>
                <td className="p-2">{rep.Gender}</td>
                <td className="p-2">{rep.Disease}</td>
                <td className="p-2">{rep.Ct_E_gene || "-"}</td>
                <td className="p-2">{rep.Ct_RdRp_gene || "-"}</td>
                <td className="p-2">{rep.Ct_N_gene || "-"}</td>
                <td className="p-2">{rep.Qualitative_Result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Disease Distribution</h2>
          <Bar data={diseaseData} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Positive vs Negative</h2>
          <Pie data={positiveNegativeData} />
        </div>
      </div>

      {/* Patient Modal */}
      <Modal
        isOpen={modalOpen}
        onRequestClose={closeModal}
        contentLabel="Patient Report"
        className="bg-white p-6 rounded shadow max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start"
      >
        {selectedReport && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Patient Report</h2>
            <p><strong>Patient ID:</strong> {selectedReport.Patient_ID}</p>
            <p><strong>Name:</strong> {selectedReport.Name}</p>
            <p><strong>Age:</strong> {selectedReport.Age}</p>
            <p><strong>Gender:</strong> {selectedReport.Gender}</p>
            <p><strong>Disease:</strong> {selectedReport.Disease}</p>
            <p><strong>E-gene Ct:</strong> {selectedReport.Ct_E_gene || "-"}</p>
            <p><strong>RdRp Ct:</strong> {selectedReport.Ct_RdRp_gene || "-"}</p>
            <p><strong>N-gene Ct:</strong> {selectedReport.Ct_N_gene || "-"}</p>
            <p><strong>Result:</strong> {selectedReport.Qualitative_Result}</p>
            <p><strong>Diagnosis:</strong> {selectedReport.Diagnosis}</p>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
