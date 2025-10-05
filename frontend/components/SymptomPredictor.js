import { useState } from "react";
import "./pages.css";

function SymptomPredictor() {
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePredict = async () => {
    if (!symptoms.trim()) {
      setError("Please enter at least one symptom.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("http://127.0.0.1:5000/predict_symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          user_id: localStorage.getItem("user_id") || "test_user",
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to get prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSymptoms("");
    setResult(null);
    setError("");
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Symptom-Based Prediction</h1>

      <textarea
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        placeholder="Enter patient symptoms... (comma-separated)"
        className="w-full border p-2 rounded"
        rows={4}
      />

      <div className="flex gap-2 mt-2">
        <button
          onClick={handlePredict}
          disabled={loading || !symptoms.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? "Predicting..." : "Predict"}
        </button>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Clear
        </button>
      </div>

      {error && <p className="text-red-600 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 p-4 border rounded bg-gray-100 shadow">
          <h3 className="text-lg font-semibold">Prediction: {result.disease}</h3>

          <p>
            <strong>Matched Symptoms:</strong>{" "}
            {result.matched_symptoms?.length
              ? result.matched_symptoms.join(", ")
              : "None"}
          </p>

          {result.suggestion && (
            <div className="mt-3 p-3 bg-white border rounded shadow-sm">
              <h4 className="font-semibold mb-1">AI Suggestion</h4>
              <p>
                <strong>Risk Probability:</strong>{" "}
                {(result.suggestion["Risk Probability"] * 100).toFixed(1)}%
              </p>
              <p>
                <strong>Risk Level:</strong>{" "}
                <span
                  className={`px-2 py-1 rounded text-white ${
                    result.suggestion["Risk Level"] === "High"
                      ? "bg-red-500"
                      : result.suggestion["Risk Level"] === "Moderate"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                >
                  {result.suggestion["Risk Level"]}
                </span>
              </p>

              {result.suggestion["Reasoning"] && (
                <div className="mt-2">
                  <strong>Reasoning:</strong>
                  <ul className="list-disc ml-5 text-sm">
                    {result.suggestion["Reasoning"].map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestion["AI Suggestion"] && (
                <div className="mt-2">
                  <strong>Recommendations:</strong>
                  <ul className="list-disc ml-5 text-sm">
                    {result.suggestion["AI Suggestion"].map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SymptomPredictor;
