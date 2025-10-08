import os
import re
import pytesseract
import fitz
import random
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from bson import ObjectId, json_util  # Import json_util for robust ObjectId handling
from openai import OpenAI  # ✅ LLM integration

# --- ML Imports ---
import joblib
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

# --- Rule-Based Logic (Unchanged) ---

SYMPTOM_DISEASE_MAP = {
    "Rabies": {"anxiety": 1, "bite": 2, "saliva": 1, "hallucination": 1, "paralysis": 1, "hydrophobia": 2, "agitation": 1},
    "Nipah": {"fever": 1, "headache": 1, "seizure": 1, "respiratory distress": 2, "encephalitis": 2, "confusion": 1, "cough": 1, "vomiting": 1},
    "Dengue": {"fever": 1, "headache": 1, "rash": 1, "bleeding": 2, "joint pain": 1, "nausea": 1, "vomiting": 1}
}

# ---------------- Flask Setup ----------------
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

# ---------------- MongoDB ----------------
MONGO_URI = "mongodb://localhost:27017"
client = MongoClient(MONGO_URI)
db = client["zoonotic_ai"]
users_collection = db["users"]
reports_collection = db["reports"]

# Indexes
reports_collection.create_index("disease")
reports_collection.create_index("created_at")
reports_collection.create_index("user_id")

# ---------------- OpenAI Setup ----------------
openai_api_key = os.getenv("OPENAI_API_KEY", "YOUR_API_KEY_HERE")
llm_client = OpenAI(api_key=openai_api_key)

# ---------------- Helpers ----------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def map_confidence_to_risk(confidence):
    if confidence >= 80:
        return "High"
    elif confidence >= 50:
        return "Moderate"
    else:
        return "Low"

def dynamic_suggestions(disease, risk_level, symptoms, risk_prob=0.2):
    if disease in ["Common Illness/Non-Zoonotic", "Unknown"]:
        selected = [
            "Monitor symptoms for the next 48 hours. If they worsen, consult a doctor.",
            "Consider over-the-counter medication (e.g., pain relievers, cold medicine).",
            "Stay well-hydrated and ensure adequate rest."
        ]
        reasoning = [
            f"Symptoms ({', '.join(symptoms) if symptoms else 'None'}) are mild and do not strongly correlate with high-risk zoonotic diseases.",
            "Prediction confidence is low, suggesting a common illness."
        ]
        return {"AI Suggestion": selected, "Reasoning": reasoning, "Risk Level": "Low", "Risk Probability": 0.0}

    pool = {
        "High": ["Seek immediate medical attention", "Isolate yourself and restrict animal contact", "Monitor symptoms closely (e.g., neurological changes)"],
        "Moderate": ["Consult healthcare professional for further testing", "Monitor symptoms daily", "Stay hydrated"],
        "Low": ["Monitor your symptoms for progression", "Maintain hygiene and avoid contact with animals", "Rest adequately"]
    }
    
    suggestion_pool = pool.get(risk_level, pool["Low"])
    selected = random.sample(suggestion_pool, min(3, len(suggestion_pool)))
    
    reasoning = [
        f"Predicted Disease: {disease}",
        f"Symptoms matched: {', '.join(symptoms) if symptoms else 'None'}",
        f"Risk classified as {risk_level} ({risk_prob * 100:.1f}%) via XGBoost model."
    ]
    return {"AI Suggestion": selected, "Reasoning": reasoning, "Risk Level": risk_level, "Risk Probability": risk_prob}

def save_report(report_entry):
    try:
        user_id = report_entry.get("user_id")
        if user_id and isinstance(user_id, str) and user_id != "guest":
            try:
                report_entry["user_id"] = ObjectId(user_id)
            except:
                pass
        
        suggestion = report_entry.get("suggestion")
        if isinstance(suggestion, dict):
            report_entry["suggestion_full"] = suggestion
            report_entry["risk_level"] = suggestion.get("Risk Level")
            report_entry["risk_probability"] = suggestion.get("Risk Probability")
            report_entry["suggestion_summary"] = (
                f"Risk: {suggestion.get('Risk Level', 'N/A')} "
                f"({suggestion.get('Risk Probability', 0) * 100:.1f}%). "
                f"Advice: {', '.join(suggestion.get('AI Suggestion', []))}"
            )
            del report_entry["suggestion"]

        result = reports_collection.insert_one(report_entry.copy())
        return str(result.inserted_id)
    except Exception as e:
        raise RuntimeError(f"Failed to save report: {str(e)}")

def serialize_report(report):
    report_copy = report.copy()
    report_copy["_id"] = str(report_copy["_id"])
    
    if isinstance(report_copy.get("user_id"), ObjectId):
        report_copy["user_id"] = str(report_copy["user_id"])
    
    if "suggestion_full" in report_copy:
        report_copy["suggestion"] = report_copy["suggestion_full"]
    elif "suggestion_summary" in report_copy:
        report_copy["suggestion"] = {
            "AI Suggestion": [],
            "Reasoning": [report_copy["suggestion_summary"]],
            "Risk Level": report_copy.get("risk_level", "Unknown"),
            "Risk Probability": report_copy.get("risk_probability", 0)
        }
    if "llm_suggestion" not in report_copy:
        report_copy["llm_suggestion"] = "N/A"
    return report_copy

# ---------------- Load ML Models ----------------
FEATURE_NAMES = [
    "anxiety", "bite", "muscle pain", "saliva", "hallucination", 
    "seizure", "respiratory distress", "rash", "paralysis", "headache", 
    "bleeding", "hydrophobia", "cold", "fever", "joint pain", 
    "encephalitis", "agitation", "animal contact", "nausea", 
    "confusion", "cough", "vomiting"
]

SYNONYM_MAP = {
    "bodyache": "muscle pain", "muscle ache": "muscle pain",
    "fear of water": "hydrophobia",
    "breathing": "respiratory distress", "breathing issue": "respiratory distress",
    "respiratory": "respiratory distress",
    "dog": "animal contact", "animal": "animal contact",
    "scratch": "bite", "bite wound": "bite",
    "pain": "joint pain", "body pain": "joint pain",
    "chills": "fever", "temperature": "fever",
    "sore throat": "cough", "throat pain": "cough"
}

# Simple symptom-to-general-disease mapping
SINGLE_SYMPTOM_FALLBACK = {
    "fever": "Viral / Non-Zoonotic",
    "cough": "Viral / Non-Zoonotic",
    "cold": "Viral / Non-Zoonotic",
    "headache": "Viral / Non-Zoonotic",
    "nausea": "Viral / Non-Zoonotic",
    "vomiting": "Viral / Non-Zoonotic",
    "joint pain": "Viral / Non-Zoonotic",
    "rash": "Viral / Non-Zoonotic",
    "diarrhea": "Viral / Non-Zoonotic"
}


xgb_model = None
label_encoder = None

try:
    xgb_model = joblib.load("xgboost_disease_model.pkl")
    label_encoder = joblib.load("label_encoder.pkl")
    print("✅ XGBoost + LabelEncoder loaded successfully.")
except Exception as e:
    print(f"⚠️ Warning: Could not load ML models - {e}. Symptom prediction will fail.")

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
    users_collection.insert_one({"username": username, "password": hashed_pw, "role": role})
    return jsonify({"success": True, "message": "User registered successfully"})

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

# ---------------- File Upload / OCR (Unchanged) ----------------
@app.route("/upload", methods=["POST"])
def upload_file():
    user_id = request.form.get("user_id")
    if not user_id: 
        return jsonify({"error": "Missing user_id"}), 400
    
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        file.save(file_path)
        
        text = ""
        if filename.lower().endswith(".pdf"):
            with fitz.open(file_path) as doc:
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    text += page.get_text()
        else:
            config = r"--oem 3 --psm 6"
            text = pytesseract.image_to_string(Image.open(file_path), config=config)

        disease_match = re.search(r"(Dengue|Nipah|Rabies|Zoonotic)", text, re.IGNORECASE)
        result_match = re.search(r"Overall result:\s*(Positive|Negative|Detected|Not Detected)", text, re.IGNORECASE)

        ct_values = {}
        matches_format1 = re.findall(r"([A-Za-z0-9]+ gene).?\(Ct\s*=?\s*([\d.]+)\)", text, re.IGNORECASE)
        matches_format2 = re.findall(r"(NS1 gene|E gene|N gene|G gene)\s+(Detected|Positive|Negative)\s*([\d.]+)?", text, re.IGNORECASE)

        for gene, value in matches_format1:
            ct_values[gene.strip()] = value
        for gene, _, value in matches_format2:
            if value: ct_values[gene.strip()] = value

        disease = disease_match.group(1) if disease_match else "Unknown"
        result = result_match.group(1) if result_match else "Unknown"

        def ct_to_risk(ct_vals):
            numeric_cts = [float(v) for v in ct_vals.values() if v and re.match(r"^\d+\.?\d*$", v)]
            if not numeric_cts: return "Unknown"
            min_ct = min(numeric_cts)
            if min_ct < 20: return "High"
            if min_ct <= 30: return "Moderate"
            return "Low"

        risk_level = ct_to_risk(ct_values)

        suggestion = dynamic_suggestions(
            disease=disease,
            risk_level=risk_level,
            symptoms=[],
            risk_prob=1.0
        )

        report_entry = {
            "user_id": user_id,
            "disease": disease,
            "result": result,
            "ct_values": ct_values if ct_values else "N/A",
            "ct_value": ", ".join([f"{g}: {v}" for g, v in ct_values.items()]) if ct_values else "N/A",
            "suggestion": suggestion,
            "raw_text": text,
            "created_at": datetime.utcnow(),
            "source": "upload"
        }

        inserted_id = save_report(report_entry)
        
        return jsonify({
            "disease": disease,
            "matched_symptoms": [],
            "suggestion": suggestion,
            "_id": inserted_id,
            "user_id": user_id,
            "result": result,
            "ct_values": ct_values,
            "risk_level": risk_level
        })

    except Exception as e:
        print(f"❌ Upload failed: {str(e)}") 
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# ---------------- Predict Symptoms ----------------
@app.route("/predict_symptoms", methods=["POST"])
def predict_symptoms():
    if xgb_model is None or label_encoder is None:
        return jsonify({"error": "ML model not loaded. Check server logs."}), 500

    data = request.get_json()
    user_id = data.get("user_id") 
    symptoms_raw = data.get("symptoms", "")
    
    if isinstance(symptoms_raw, str):
        input_symptoms = [s.strip().lower() for s in symptoms_raw.split(",") if s.strip()]
    elif isinstance(symptoms_raw, list):
        input_symptoms = [s.strip().lower() for s in symptoms_raw if s.strip()]
    else:
        return jsonify({"error": "Symptoms must be a string or list"}), 400

    # Normalize using your synonyms
    normalized_symptoms = [SYNONYM_MAP.get(s, s) for s in input_symptoms]

    # --- Single symptom fallback ---
    SINGLE_SYMPTOM_FALLBACK = {
        "fever": "Viral / Non-Zoonotic",
        "cough": "Viral / Non-Zoonotic",
        "cold": "Viral / Non-Zoonotic",
        "headache": "Viral / Non-Zoonotic",
        "nausea": "Viral / Non-Zoonotic",
        "vomiting": "Viral / Non-Zoonotic",
        "joint pain": "Viral / Non-Zoonotic",
        "rash": "Viral / Non-Zoonotic",
        "diarrhea": "Viral / Non-Zoonotic"
    }

    if len(normalized_symptoms) == 1 and normalized_symptoms[0] in SINGLE_SYMPTOM_FALLBACK:
        disease = SINGLE_SYMPTOM_FALLBACK[normalized_symptoms[0]]
        confidence = 90  # high confidence for fallback
        risk_level = "Low"
        matched_symptoms = normalized_symptoms

        suggestion_object = dynamic_suggestions(
            disease=disease,
            risk_level=risk_level,
            symptoms=matched_symptoms,
            risk_prob=confidence/100
        )

        llm_suggestion = f"Based on the symptom '{normalized_symptoms[0]}', it is likely a {disease}. Monitor symptoms and consult a doctor if they worsen."

        report_entry = {
            "user_id": user_id,
            "disease": disease,
            "result": f"ML Risk: {risk_level}",
            "symptoms_reported": ", ".join(input_symptoms),
            "matched_symptoms": matched_symptoms,
            "confidence": confidence,
            "suggestion": suggestion_object,
            "llm_suggestion": llm_suggestion,
            "created_at": datetime.utcnow(),
            "source": "fallback-single-symptom"
        }

        inserted_id = save_report(report_entry)

        return jsonify({
            "disease": disease,
            "confidence": confidence,
            "matched_symptoms": matched_symptoms,
            "suggestion": suggestion_object,
            "llm_suggestion": llm_suggestion,
            "result": f"ML Risk: {risk_level}",
            "_id": inserted_id,
            "user_id": user_id
        })

    # --- ML Prediction for multiple symptoms ---
    feature_vector = [1 if f in normalized_symptoms else 0 for f in FEATURE_NAMES]
    X = pd.DataFrame([feature_vector], columns=FEATURE_NAMES)

    try:
        proba = xgb_model.predict_proba(X)[0]
        prediction_enc = np.argmax(proba)
        disease = label_encoder.inverse_transform([prediction_enc])[0]
        confidence = round(float(np.max(proba)) * 100, 2)
    except Exception as e:
        print(f"⚠️ XGBoost Prediction Error: {e}")
        return jsonify({"error": "Failed to run ML prediction."}), 500

    risk_level = map_confidence_to_risk(confidence)
    matched_symptoms = [s for s in normalized_symptoms if s in FEATURE_NAMES and X.iloc[0][s] == 1]

    if confidence < 10: 
        disease = "Common Illness/Non-Zoonotic"

    suggestion_object = dynamic_suggestions(
        disease=disease, 
        risk_level=risk_level, 
        symptoms=matched_symptoms, 
        risk_prob=(confidence / 100)
    )

    # ✅ LLM suggestion
    try:
        prompt = f"""
        You are an AI medical assistant specialized in zoonotic diseases.
        Patient shows symptoms: {', '.join(matched_symptoms) if matched_symptoms else 'No major symptoms reported'}.
        Detected disease: {disease}.
        Risk level: {risk_level}.
        Confidence: {confidence}%.
        Provide 3 safe and helpful health suggestions (avoid medication or prescriptions).
        """
        llm_response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )
        llm_suggestion = llm_response.choices[0].message.content.strip()
    except Exception as e:
        llm_suggestion = "LLM suggestion unavailable due to API error."

    report_entry = {
        "user_id": user_id,
        "disease": disease,
        "result": f"ML Risk: {risk_level}",
        "symptoms_reported": ", ".join(input_symptoms),
        "matched_symptoms": matched_symptoms,
        "confidence": confidence,
        "suggestion": suggestion_object,
        "llm_suggestion": llm_suggestion,
        "created_at": datetime.utcnow(),
        "source": "ml-symptoms-structured"
    }

    inserted_id = save_report(report_entry)

    return jsonify({
        "disease": disease,
        "confidence": confidence,
        "matched_symptoms": matched_symptoms,
        "suggestion": suggestion_object,
        "llm_suggestion": llm_suggestion,
        "result": f"ML Risk: {risk_level}",
        "_id": inserted_id,
        "user_id": user_id
    })


# ---------------- Fetch Reports (Updated with LLM) ----------------
@app.route("/reports", methods=["GET"])
def get_reports():
    role = request.args.get("role", "user")
    user_id_param = request.args.get("user_id")

    try:
        if role == "doctor":
            user_ids_with_reports = reports_collection.distinct("user_id")
            users_list = []
            for uid in user_ids_with_reports:
                str_uid = str(uid) if isinstance(uid, ObjectId) else uid
                user_doc = None
                if isinstance(uid, ObjectId):
                    user_doc = users_collection.find_one({"_id": uid})
                elif uid != "guest":
                    user_doc = users_collection.find_one({"_id": ObjectId(uid)}) if ObjectId.is_valid(uid) else users_collection.find_one({"username": uid})
                username = user_doc["username"] if user_doc else ("Guest User" if uid == "guest" else f"User {str_uid}")
                reports_cursor = reports_collection.find({"user_id": uid}).sort("created_at", -1)
                reports = []
                for r in reports_cursor:
                    r_serial = serialize_report(r)
                    # ✅ If LLM suggestion missing, generate dynamically
                    if r_serial.get("llm_suggestion") == "N/A":
                        try:
                            prompt = f"""
                            You are an AI medical assistant specialized in zoonotic diseases.
                            Patient shows symptoms: {', '.join(r_serial.get('matched_symptoms', []))}.
                            Detected disease: {r_serial.get('disease')}.
                            Risk level: {r_serial.get('risk_level')}.
                            Confidence: {r_serial.get('confidence', 0)}%.
                            Provide 3 safe and helpful health suggestions (avoid medication or prescriptions).
                            """
                            llm_response = llm_client.chat.completions.create(
                                model="gpt-4o-mini",
                                messages=[{"role": "user", "content": prompt}],
                                temperature=0.7,
                                max_tokens=200
                            )
                            r_serial["llm_suggestion"] = llm_response.choices[0].message.content.strip()
                        except:
                            r_serial["llm_suggestion"] = "LLM suggestion unavailable."
                    reports.append(r_serial)
                users_list.append({"user_id": str_uid, "username": username, "reports": reports})
            return jsonify(users_list)
        else:
            if not user_id_param:
                return jsonify({"error": "Missing user_id"}), 400
            query_options = [user_id_param]
            if user_id_param != "guest":
                try:
                    query_options.append(ObjectId(user_id_param))
                except:
                    pass
            reports_cursor = reports_collection.find({"user_id": {"$in": query_options}}).sort("created_at", -1)
            reports = []
            for r in reports_cursor:
                r_serial = serialize_report(r)
                if r_serial.get("llm_suggestion") == "N/A":
                    try:
                        prompt = f"""
                        You are an AI medical assistant specialized in zoonotic diseases.
                        Patient shows symptoms: {', '.join(r_serial.get('matched_symptoms', []))}.
                        Detected disease: {r_serial.get('disease')}.
                        Risk level: {r_serial.get('risk_level')}.
                        Confidence: {r_serial.get('confidence', 0)}%.
                        Provide 3 safe and helpful health suggestions (avoid medication or prescriptions).
                        """
                        llm_response = llm_client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[{"role": "user", "content": prompt}],
                            temperature=0.7,
                            max_tokens=200
                        )
                        r_serial["llm_suggestion"] = llm_response.choices[0].message.content.strip()
                    except:
                        r_serial["llm_suggestion"] = "LLM suggestion unavailable."
                reports.append(r_serial)
            return jsonify(reports)
    except Exception as e:
        print(f"Error fetching reports: {e}")
        return jsonify({"error": "Failed to fetch reports. " + str(e)}), 500

# ---------------- Report Deletion (User-Specific) ----------------
@app.route("/reports", methods=["DELETE"])
def delete_reports_by_user():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"success": False, "message": "Missing user_id in query parameter."}), 400

    try:
        # --- CRITICAL CHANGE: Query for both possible data types ---
        
        # 1. Start with the plain string ID (e.g., "guest" or an ID stored as string)
        query_options = [user_id]
        
        # 2. Add the ObjectId version if the string is a valid ObjectId format
        if user_id != "guest":
            try:
                query_options.append(ObjectId(user_id))
            except:
                pass # Not a valid ObjectId string, proceed with just the string
        
        # Create the MongoDB $in query to match either string or ObjectId format
        delete_query = {"user_id": {"$in": query_options}}
        
        result = reports_collection.delete_many(delete_query)

        return jsonify({"success": True, "message": f"Reports cleared successfully. {result.deleted_count} reports deleted."}), 200

    except Exception as e:
        print(f"Error during report deletion: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ---------------- Clear All Reports for Doctor (Unchanged) ----------------
@app.route("/doctor/clear_all_reports", methods=["DELETE"])
def doctor_clear_all_reports():
    try:
        result = reports_collection.delete_many({})
        return jsonify({
            "success": True,
            "message": f"All patient reports cleared successfully. {result.deleted_count} reports deleted."
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
        
# ---------------- Global Data Clear Route (Unchanged) ----------------
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

# ---------------- Run App ----------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
