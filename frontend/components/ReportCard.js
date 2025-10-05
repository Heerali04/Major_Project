import React from 'react';

// This component expects a single 'report' object as a prop
const ReportCard = ({ report, index }) => {
    return (
        <div key={index} className="report-card">
            <p>
                <b>Disease:</b> {report.disease}
            </p>
            <p>
                <b>Result:</b> {report.result}
            </p>
            <p>
                <b>Ct Values:</b> {report.ct_value || "N/A"}
            </p>
            <p>
                <b>AI Suggestions:</b>
            </p>
            <ul>
                {report.suggestion?.["AI Suggestion"]?.map((sug, i) => (
                    <li key={i}>{sug}</li>
                ))}
            </ul>
            <p>
                <b>Source:</b> {report.source}
            </p>
            <p>
                <b>Created At:</b> {new Date(report.created_at).toLocaleString()}
            </p>
        </div>
    );
};

export default ReportCard;