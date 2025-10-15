// frontend/components/ReportCharts.jsx
import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ReportCharts = ({ reports }) => {
  // This component now receives the reports directly for the selected user.
  if (!reports || reports.length === 0) {
    return <div className="card"><p>No data available to display charts.</p></div>;
  }

  const barChartData = {
    labels: reports.map((report) => report.disease || 'Report'),
    datasets: [
      {
        label: 'Risk Probability',
        data: reports.map(report => (report.suggestion?.["Risk Probability"] || 0) * 100),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const diseaseCounts = reports.reduce((acc, report) => {
    const diseaseName = report.disease || "Unknown";
    acc[diseaseName] = (acc[diseaseName] || 0) + 1;
    return acc;
  }, {});

  const pieChartData = {
    labels: Object.keys(diseaseCounts),
    datasets: [
      {
        data: Object.values(diseaseCounts),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      },
    ],
  };

  return (
    <div className="summary-cards"> {/* Re-using the grid layout from the cards */}
      <div className="card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Risk Probability (%)</h3>
        <Bar data={barChartData} />
      </div>
      <div className="card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Disease Distribution</h3>
        <Pie data={pieChartData} />
      </div>
    </div>
  );
};

export default ReportCharts;