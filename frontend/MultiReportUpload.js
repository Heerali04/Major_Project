import React, { useState } from "react";

function MultiReportUpload() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select at least one file!");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze-multiple", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to analyze reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-lg rounded-2xl">
      <h1 className="text-2xl font-bold mb-4 text-center">
        🧾 Multi Report Analyzer
      </h1>

      {/* File Input */}
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFileChange}
        className="block w-full mb-4 border p-2 rounded cursor-pointer"
      />

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Upload & Analyze"}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">📊 Results</h2>
          <div className="space-y-4">
            {results.map((report, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg shadow-sm bg-gray-50"
              >
                <p><strong>Patient ID:</strong> {report.Patient_ID}</p>
                <p><strong>Name:</strong> {report.Name}</p>
                <p><strong>Age:</strong> {report.Age} / <strong>Gender:</strong> {report.Gender}</p>
                <p><strong>Disease:</strong> {report.Disease}</p>
                <p><strong>Ct E-gene:</strong> {report.Ct_E_gene}</p>
                <p><strong>Ct RdRp-gene:</strong> {report.Ct_RdRp_gene}</p>
                <p><strong>Ct N-gene:</strong> {report.Ct_N_gene}</p>
                <p><strong>Qualitative Result:</strong> {report.Qualitative_Result}</p>
                <p className="text-blue-700 font-semibold">
                  <strong>Diagnosis:</strong> {report.Diagnosis}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiReportUpload;
