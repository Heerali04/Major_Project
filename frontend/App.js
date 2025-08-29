import React, { useState } from "react";
import UploadForm from "./UploadForm";
import ResultDisplay from "./ResultDisplay";
import MultiReportUpload from "./MultiReportUpload";

function App() {
  const [result, setResult] = useState(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Zoonotic Disease Detection</h1>
      <UploadForm setResult={setResult} />
      <ResultDisplay result={result} />
      <MultiReportUpload />
    </div>
  );
}

export default App;
