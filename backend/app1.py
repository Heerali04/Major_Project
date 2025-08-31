from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
from PyPDF2 import PdfReader
from pymongo import MongoClient
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow frontend React app to access backend

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# -----------------------------
# MongoDB connection
# -----------------------------
client = MongoClient("mongodb://localhost:27017/")  # local MongoDB
db = client["zoonotic_reports"]                     # database
reports_collection = db["reports"]                 # collection

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

    # Patient info
    patient_id = re.search(r"Patient ID[: ]\s*(\S+)", text, re.IGNORECASE)
    name = re.search(r"Name[: ]\s*(.+)", text, re.IGNORECASE)
    age_gender = re.search(r"Age[/ ]?Gender[: ]\s*(\d+)\s*/\s*(\w+)", text, re.IGNORECASE)

    age = int(age_gender.group(1)) if age_gender else None
    gender = age_gender.group(2).title() if age_gender else None

    # Disease
    disease_match = re.search(r"(Rabies|Nipah|Dengue|Influenza)", text, re.IGNORECASE)
    disease = disease_match.group(1).title() if disease_match else "Unknown"

    # Ct values
    e_gene = re.search(r"E[- ]?gene\s*Ct\s*Value\s*([0-9.]+)", text, re.IGNORECASE)
    rd_rp  = re.search(r"RdRp\s*gene\s*Ct\s*Value\s*([0-9.]+)", text, re.IGNORECASE)
    n_gene = re.search(r"N[- ]?gene\s*Ct\s*Value\s*([0-9.]+|-)", text, re.IGNORECASE)

    ct_e_gene = float(e_gene.group(1)) if e_gene and e_gene.group(1) != "-" else None
    ct_rd_rp  = float(rd_rp.group(1)) if rd_rp and rd_rp.group(1) != "-" else None
    ct_n_gene = float(n_gene.group(1)) if n_gene and n_gene.group(1) != "-" else None

    # Qualitative result
    qualitative = re.search(r"(Positive|Negative|Inconclusive)", text, re.IGNORECASE)
    qualitative_result = qualitative.group(1).title() if qualitative else "Unknown"

    # Diagnosis
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
        "Age": age,
        "Gender": gender,
        "Disease": disease,
        "Ct_E_gene": ct_e_gene,
        "Ct_RdRp_gene": ct_rd_rp,
        "Ct_N_gene": ct_n_gene,
        "Qualitative_Result": qualitative_result,
        "Diagnosis": diagnosis
    }

# -----------------------------
# API Endpoint: Upload multiple reports
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

        # Analyze report
        report_data = analyze_single_report(file_path)

        # Save to MongoDB
        report_id = save_report_to_db(report_data)
        report_data["_id"] = report_id

        results.append(report_data)

    return jsonify(results)

def save_report_to_db(report_data):
    # Add timestamp
    report_data["uploaded_at"] = datetime.utcnow()
    # Insert into MongoDB
    result = reports_collection.insert_one(report_data)
    return str(result.inserted_id)

# -----------------------------
# API Endpoint: Get all reports (with search/filter)
# -----------------------------
@app.route("/reports", methods=["GET"])
def get_all_reports():
    search = request.args.get("search", "")
    result_filter = request.args.get("result", "").lower()

    query = {}
    if search:
        query["$or"] = [
            {"Patient_ID": {"$regex": search, "$options": "i"}},
            {"Name": {"$regex": search, "$options": "i"}},
            {"Disease": {"$regex": search, "$options": "i"}},
        ]
    if result_filter in ["positive", "negative", "inconclusive"]:
        query["Qualitative_Result"] = {"$regex": result_filter, "$options": "i"}

    reports = list(reports_collection.find(query, {"_id": 0}).sort("uploaded_at", -1))
    return jsonify(reports)

# -----------------------------
# API Endpoint: Dashboard statistics
# -----------------------------
@app.route("/reports/stats", methods=["GET"])
def get_report_stats():
    total_reports = reports_collection.count_documents({})
    positive = reports_collection.count_documents({"Qualitative_Result": "Positive"})
    negative = reports_collection.count_documents({"Qualitative_Result": "Negative"})
    patients = reports_collection.distinct("Patient_ID")  # unique patients

    disease_distribution = reports_collection.aggregate([
        {"$group": {"_id": "$Disease", "count": {"$sum": 1}}}
    ])
    disease_dist = {item["_id"]: item["count"] for item in disease_distribution}

    return jsonify({
        "total_reports": total_reports,
        "positive_cases": positive,
        "negative_cases": negative,
        "patients_analyzed": len(patients),
        "disease_distribution": disease_dist
    })

# -----------------------------
# API Endpoint: Single patient report
# -----------------------------
@app.route("/reports/<patient_id>", methods=["GET"])
def get_patient_report(patient_id):
    report = reports_collection.find_one({"Patient_ID": patient_id}, {"_id": 0})
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return jsonify(report)

# -----------------------------
# Home
# -----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "✅ ZoonoticAI Dashboard Backend is running!"})

# -----------------------------
# Run Flask
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
