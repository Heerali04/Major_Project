import React from "react";

function ResultDisplay({ result }) {
  if (!result) return null;

  return (
    <div className="mt-6 p-6 bg-gray-100 rounded-2xl shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-3">Analysis Result</h2>
      <p><strong>Rabies Ct:</strong> {result.Ct_Rabies ?? "Not found"}</p>
      <p><strong>Nipah Ct:</strong> {result.Ct_Nipah ?? "Not found"}</p>
      <p><strong>Dengue Ct:</strong> {result.Ct_Dengue ?? "Not found"}</p>
      <p className="mt-3 text-xl font-semibold text-red-600">
        {result.Diagnosis}
      </p>
    </div>
  );
}

export default ResultDisplay;
