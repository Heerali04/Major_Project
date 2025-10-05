import React, { useState } from "react";
import axios from "axios";
import "./SymptomsPage.css";

export default function SymptomsPage({ darkMode = false }) {
  const [symptoms, setSymptoms] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setReport(null);

    if (!symptoms.trim()) {
      setError("Please enter at least one symptom.");
      return;
    }

    const user_id = localStorage.getItem("user_id") || "test_user";
    setLoading(true);

    try {
      const symptomsArray = symptoms
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      // 🔑 Updated endpoint
      const res = await axios.post("http://127.0.0.1:5000/predict_symptoms", {
        user_id,
        symptoms: symptomsArray,
      });

      setReport(res.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to get prediction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSymptoms("");
    setReport(null);
    setError("");
  };

  const getRiskClass = (level) => {
    if (!level) return "";
    switch (level.toLowerCase()) {
      case "high":
        return "risk-high";
      case "moderate":
        return "risk-moderate";
      case "low":
        return "risk-low";
      default:
        return "";
    }
  };

  return (
    <div className={`symptoms-page ${darkMode ? "dark" : ""}`}>
      <h1>Zoonotic AI Symptom Analyzer</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="symptom-input">
          Enter Symptoms (comma-separated):
        </label>
        <input
          id="symptom-input"
          type="text"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="e.g., fever, cough, cold, headache"
          aria-label="Enter symptoms"
        />

        <div className="button-group">
          <button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "Predicting..." : "Predict"}
          </button>

          <button type="button" onClick={handleClear} disabled={loading}>
            Clear
          </button>
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {report && (
        <div className="report-card" role="region" aria-label="Prediction Report">
          <h2>Prediction Result</h2>

          <p>
            <strong>Disease Match:</strong> {report.disease}
          </p>

          {report.suggestion?.["Risk Level"] &&
            report.suggestion?.["Risk Probability"] && (
              <div
                className={`risk-level-display ${getRiskClass(
                  report.suggestion["Risk Level"]
                )}`}
              >
                <strong>Risk Level:</strong> {report.suggestion["Risk Level"]} (
                {(report.suggestion["Risk Probability"] * 100).toFixed(1)}%)
              </div>
            )}

          {report.matched_symptoms?.length > 0 && (
            <p>
              <strong>Matched Symptoms:</strong>{" "}
              {report.matched_symptoms.join(", ")}
            </p>
          )}

          {report.suggestion?.["AI Suggestion"] && (
            <div>
              <strong>AI Suggestions:</strong>
              <ul>
                {report.suggestion["AI Suggestion"].map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {report.suggestion?.["Reasoning"] && (
            <div>
              <strong>Reasoning:</strong>
              <ul>
                {report.suggestion["Reasoning"].map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
