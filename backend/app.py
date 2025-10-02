import os
import re
import random
from datetime import datetime
from PIL import Image
# import pytesseract # Commented out since OCR is unused in core logic
# import fitz # Commented out since PDF processing is unused in core logic
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from pymongo import MongoClient

# ---------------- Flask Setup ----------------
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe" # Commented out OCR path
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

# ---------------- Database Setup ----------------
MONGO_URI = "mongodb://localhost:27017"
client = MongoClient(MONGO_URI)
db = client["zoonotic_ai"]
users_collection = db["users"]
reports_collection = db["reports"]

# Indexes
reports_collection.create_index("disease")
reports_collection.create_index("created_at")
reports_collection.create_index("user_id")

# ---------------- Constants ----------------
# Threshold below which a result is classified as non-zoonotic/common illness
NON_ZOONOTIC_THRESHOLD = 0.3

# ---------------- Helpers ----------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_report(report_entry, user_id=None):
    if user_id:
        try:
            report_entry["user_id"] = ObjectId(user_id)
        except:
            report_entry["user_id"] = user_id
    result = reports_collection.insert_one(report_entry.copy())
    return str(result.inserted_id)

def serialize_report(report):
    # Convert MongoDB's internal ID
    report["_id"] = str(report["_id"]) 
    
    # Ensure ct_values is an object for consistency
    if isinstance(report.get("ct_values"), str) and report["ct_values"] == "N/A":
        report["ct_values"] = {}
        
    # Convert ObjectId user_id to string for frontend compatibility
    if isinstance(report.get("user_id"), ObjectId):
        report["user_id"] = str(report["user_id"])
    return report

# ---------------- Symptom-Disease Mapping ----------------
# Format: {disease: {symptom: weight}} - Higher weight means more critical/unique symptom
SYMPTOM_DISEASE_MAP = {
    "dengue": {"fever": 2, "headache": 2, "rash": 1, "vomiting": 3, "fatigue": 1},
    "nipah": {"fever": 3, "headache": 2, "cough": 2, "vomiting": 3, "fatigue": 1, "confusion": 3},
    "rabies": {"fever": 2, "headache": 2, "dog bite": 3, "salivation": 3, "agitation": 3, "paralysis": 3},
    "zoonotic": {"fever": 2, "cough": 1, "sneezing": 1, "rash": 1, "vomiting": 2}
}
# A set of all known symptoms for easier lookup/validation
ALL_SYMPTOMS = set(s for disease_map in SYMPTOM_DISEASE_MAP.values() for s in disease_map.keys())


# ---------------- AI Suggestion Logic ----------------
def dynamic_suggestions(disease, risk_level, symptoms, risk_prob=0.2):
    """Generates tailored suggestions based on the identified disease and risk."""

    # NEW LOGIC: Handle common illness results
    if disease == "Common Illness/Non-Zoonotic":
        selected = [
            "Monitor symptoms for the next 48 hours. If they worsen, consult a doctor.",
            "Consider over-the-counter medication (e.g., pain relievers, cold medicine).",
            "Stay well-hydrated and ensure adequate rest.",
            "Maintain excellent hand hygiene to prevent spreading common viruses."
        ]
        reasoning = [
            f"Symptoms ({', '.join(symptoms) if symptoms else 'None'}) are mild and do not strongly correlate with high-risk zoonotic diseases.",
            "Likely a common cold, flu, or seasonal allergy."
        ]
        # Always return Low risk for common illness results
        return {"AI Suggestion": selected, "Reasoning": reasoning, "Risk Level": "Low", "Risk Probability": 0.0}

    # Existing logic for specific zoonotic diseases
    pool = {
        "High": ["Seek immediate medical attention", "Isolate yourself", "Monitor symptoms closely"],
        "Moderate": ["Consult healthcare professional", "Monitor symptoms daily", "Stay hydrated"],
        "Low": ["Monitor your symptoms", "Maintain hygiene", "Rest adequately"]
    }
    
    # Ensure pool selection is safe
    suggestion_pool = pool.get(risk_level, pool["Low"])
    selected = random.sample(suggestion_pool, min(3, len(suggestion_pool)))
    
    reasoning = [
        f"Disease: {disease}",
        f"Symptoms matched: {', '.join(symptoms) if symptoms else 'None'}",
        f"Risk classified as {risk_level} ({risk_prob * 100:.1f}%)"
    ]
    return {"AI Suggestion": selected, "Reasoning": reasoning, "Risk Level": risk_level, "Risk Probability": risk_prob}


def analyze_symptoms(symptoms):
    """Calculates the best-match disease and risk level based on reported symptoms."""
    symptoms_lower = [s.strip().lower() for s in symptoms]
    
    best_match = {"disease": "Unknown Zoonotic", "score": 0, "total_possible": 0, "matched_symptoms": []}
    
    for disease, symptom_map in SYMPTOM_DISEASE_MAP.items():
        current_score = 0
        total_possible = sum(symptom_map.values())
        matched_symptoms = []
        
        for symptom, weight in symptom_map.items():
            if symptom in symptoms_lower:
                current_score += weight
                matched_symptoms.append(symptom)

        if current_score > best_match["score"]:
            best_match["score"] = current_score
            best_match["total_possible"] = total_possible
            best_match["disease"] = disease.capitalize()
            best_match["matched_symptoms"] = matched_symptoms

    if best_match["total_possible"] > 0:
        risk_prob = best_match["score"] / best_match["total_possible"]
    else:
        # If no relevant symptoms were provided, default to 0 probability.
        risk_prob = 0.0

    # --- NEW TRIAGE LOGIC: Override to Non-Zoonotic below threshold ---
    if risk_prob < NON_ZOONOTIC_THRESHOLD:
        risk_level = "Low"
        return {
            "disease": "Common Illness/Non-Zoonotic",
            "risk_level": risk_level,
            "risk_prob": 0.0, # Reset probability for common illness
            # Only list the symptoms that matched *any* known symptom for clarity
            "matched_symptoms": [s for s in symptoms_lower if s in ALL_SYMPTOMS] 
        }
    # --- END NEW TRIAGE LOGIC ---


    # Apply risk levels for confirmed potential zoonotic matches
    if risk_prob >= 0.7:
        risk_level = "High"
    elif risk_prob >= NON_ZOONOTIC_THRESHOLD:
        risk_level = "Moderate"
    else:
        # Should technically be caught by the override above, but kept for robustness
        risk_level = "Low" 

    return {
        "disease": best_match["disease"],
        "risk_level": risk_level,
        "risk_prob": risk_prob,
        "matched_symptoms": best_match["matched_symptoms"]
    }


# ---------------- Auth Routes ----------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
    if users_collection.find_one({"username": username}):
        return jsonify({"success": False, "message": "Username already exists"}), 400

    hashed_pw = generate_password_hash(password)
    result = users_collection.insert_one({"username": username, "password": hashed_pw, "role": role})
    return jsonify({
        "success": True,
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    })

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    user = users_collection.find_one({"username": username, "role": role}) 
    if user and check_password_hash(user["password"], password):
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user_id": str(user["_id"]),
            "role": user.get("role", "user")
        })

    return jsonify({"success": False, "message": "Invalid username, password, or role"}), 401


# ---------------- File Upload (Minimal version) ----------------
@app.route("/upload", methods=["POST"])
def upload_file():
    # Placeholder for file processing and OCR
    
    user_id = request.form.get("user_id")
    if not user_id: return jsonify({"error": "Missing user_id"}), 400

    # Mock Analysis Result (Ensure all fields are present for testing)
    disease = "Dengue"
    result = "Positive"
    ct_values = {"NS1 gene": 22.5, "E gene": 24.1}
    # Mock suggestion based on a known disease
    suggestion = dynamic_suggestions(disease, "Moderate", ["fever", "headache"], 0.5)

    report_entry = {
        "disease": disease,
        "result": result,
        "ct_values": ct_values,
        "ct_value": ", ".join([f"{g}: {v}" for g, v in ct_values.items()]),
        "suggestion": suggestion,
        "created_at": datetime.utcnow(),
        "source": "upload"
    }

    inserted_id = save_report(report_entry, user_id=user_id)
    report_entry["id"] = inserted_id
    report_entry["user_id"] = user_id
    # Ensure the ObjectId user_id is serialized before returning
    if isinstance(report_entry.get("user_id"), ObjectId):
        report_entry["user_id"] = str(report_entry["user_id"])
    return jsonify(report_entry)


# ---------------- Symptom Analysis Route ----------------
@app.route("/analyze_symptoms", methods=["POST"])
def analyze_symptoms_route():
    data = request.json
    user_id = data.get("user_id")
    symptoms_raw = data.get("symptoms", "")
    
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
        
    if isinstance(symptoms_raw, str):
        symptoms_list = [s.strip().lower() for s in symptoms_raw.split(",") if s.strip()]
    elif isinstance(symptoms_raw, list):
        symptoms_list = [s.strip().lower() for s in symptoms_raw if s.strip()]
    else:
        return jsonify({"error": "Symptoms must be a list or a comma-separated string"}), 400

    if not symptoms_list:
        return jsonify({"error": "No symptoms provided for analysis"}), 400

    # 1. Perform Analysis (Triage logic applied inside)
    analysis_result = analyze_symptoms(symptoms_list)

    disease = analysis_result["disease"]
    risk_level = analysis_result["risk_level"]
    risk_prob = analysis_result["risk_prob"]
    matched_symptoms = analysis_result["matched_symptoms"]
    
    # 2. Get Suggestions
    suggestion = dynamic_suggestions(disease, risk_level, matched_symptoms, risk_prob)

    # 3. Save Report
    report_entry = {
        "disease": disease,
        "result": f"Symptom Match: {risk_level}",
        "ct_values": "N/A",  
        "ct_value": "N/A",
        "symptoms_reported": ", ".join(symptoms_list), 
        "suggestion": suggestion,
        "created_at": datetime.utcnow(),
        "source": "symptom_manual"
    }

    inserted_id = save_report(report_entry, user_id=user_id)
    
    # 4. Prepare Response
    response_data = {
        "id": inserted_id,
        "user_id": user_id,
        "disease": disease,
        "risk_level": risk_level,
        "suggestion": suggestion,
        "matched_symptoms": matched_symptoms
    }
    
    return jsonify(response_data), 200


# ---------------- Get Reports (FIXED for Doctor Grouping) ----------------
@app.route("/reports", methods=["GET"])
def get_reports():
    role = request.args.get("role", "user")
    user_id_param = request.args.get("user_id")

    try:
        if role == "doctor":
            # Retrieve all user IDs that have reports
            user_ids_with_reports = reports_collection.distinct("user_id")
            users_list = []

            for uid in user_ids_with_reports:
                try:
                    obj_uid = ObjectId(uid)
                except:
                    obj_uid = uid

                # Get user details
                user_doc = users_collection.find_one({"_id": obj_uid})
                username = user_doc["username"] if user_doc else f"User {str(uid)}"

                # Fetch all reports for this user (sorted by most recent first)
                reports = [
                    serialize_report(r)
                    for r in reports_collection.find({"user_id": obj_uid}).sort("created_at", -1)
                ]

                # Group data by unique user and include in the list
                users_list.append({
                    "user_id": str(uid),
                    "username": username,
                    "reports": reports
                })

            return jsonify(users_list)
        else:
            # User role: Filter by user_id
            if not user_id_param:
                return jsonify({"error": "Missing user_id"}), 400

            try:
                query_id = ObjectId(user_id_param)
            except:
                query_id = user_id_param

            reports = [
                serialize_report(r)
                for r in reports_collection.find({"user_id": query_id}).sort("created_at", -1)
            ]
            return jsonify(reports)

    except Exception as e:
        print(f"Error getting reports: {e}")
        return jsonify({"error": "Internal server error"}), 500

# ---------------- Report Deletion (User-Specific) ----------------
@app.route("/reports", methods=["DELETE"])
def delete_reports_by_user():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id in query parameter."}), 400

    try:
        try:
            delete_query = {"user_id": ObjectId(user_id)}
        except:
            delete_query = {"user_id": user_id}
            
        reports_collection.delete_many(delete_query)

        return jsonify({"success": True, "message": "Reports cleared."}), 200

    except Exception as e:
        print(f"Error during report deletion: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------- Global Data Clear Route ----------------
@app.route("/admin/clear_all_data", methods=["DELETE"])
def clear_all_reports_global():
    try:
        result = reports_collection.delete_many({})
        
        return jsonify({
            "success": True, 
            "message": f"Global clear successful. {result.deleted_count} reports deleted."
        }), 200
    except Exception as e:
        print(f"Error during global data clear: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------- Run ----------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
