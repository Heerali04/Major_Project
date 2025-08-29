from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
from PyPDF2 import PdfReader

app = Flask(__name__)
CORS(app)  # Allow frontend React app to access backend

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# -----------------------------
# Helper function: extract text
# -----------------------------
def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

# -----------------------------
# Helper: analyze a single report
# -----------------------------
def analyze_single_report(file_path):
    text = extract_text_from_pdf(file_path)

    # -----------------------------
    # Extract patient info
    # -----------------------------
    patient_id = re.search(r"Patient ID:\s*(\S+)", text)
    name = re.search(r"Name:\s*(.+)", text)
    age = re.search(r"Age/Gender:\s*(\d+)", text)
    gender = re.search(r"Age/Gender:\s*\d+\s*/\s*(\w+)", text)

    # -----------------------------
    # Extract disease name
    # -----------------------------
    disease_match = re.search(r"Real time Qualitative RT-PCR Report \((.+)\)", text)
    disease = disease_match.group(1).strip() if disease_match else "Unknown"

    # -----------------------------
    # Extract Ct values
    # -----------------------------
    e_gene = re.search(r"E-gene Ct Value\s+(\d+)", text)
    rd_rp = re.search(r"RdRp gene Ct Value\s+(\d+)", text)
    n_gene = re.search(r"N-gene Ct Value\s+(\d+)", text)

    ct_e_gene = int(e_gene.group(1)) if e_gene else None
    ct_rd_rp = int(rd_rp.group(1)) if rd_rp else None
    ct_n_gene = int(n_gene.group(1)) if n_gene else None

    # -----------------------------
    # Extract qualitative result
    # -----------------------------
    qualitative = re.search(rf"{disease}.*?(Positive|Negative|Inconclusive)", text, re.IGNORECASE)
    qualitative_result = qualitative.group(1) if qualitative else "Unknown"

    # -----------------------------
    # Final classification
    # -----------------------------
    if qualitative_result.lower() == "positive":
        diagnosis = f"{disease} Detected"
    elif qualitative_result.lower() == "negative":
        diagnosis = f"No {disease} Detected"
    elif qualitative_result.lower() == "inconclusive":
        diagnosis = f"Inconclusive for {disease}"
    else:
        diagnosis = "Unable to determine"

    return {
        "Patient_ID": patient_id.group(1) if patient_id else None,
        "Name": name.group(1).strip() if name else None,
        "Age": int(age.group(1)) if age else None,
        "Gender": gender.group(1) if gender else None,
        "Disease": disease,
        "Ct_E_gene": ct_e_gene,
        "Ct_RdRp_gene": ct_rd_rp,
        "Ct_N_gene": ct_n_gene,
        "Qualitative_Result": qualitative_result,
        "Diagnosis": diagnosis
    }

# -----------------------------
# API Endpoint for Single Report
# -----------------------------
@app.route("/analyze", methods=["POST"])
def analyze_report():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(file_path)

    result = analyze_single_report(file_path)
    return jsonify(result)

# -----------------------------
# API Endpoint for Multiple Reports
# -----------------------------
@app.route("/analyze-multiple", methods=["POST"])
def analyze_multiple_reports():
    if "files" not in request.files:
        return jsonify({"error": "No files part"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files selected"}), 400

    results = []
    for file in files:
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
        file.save(file_path)
        results.append(analyze_single_report(file_path))

    return jsonify(results)

# -----------------------------
# Run Flask
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
