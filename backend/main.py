import os
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List
import shutil
from models import PatientRecord, AIHistorySummary, LabResult, ScanResult
from ai_service import get_gemini_summary, analyze_medical_report
from safety_engine import check_vital_safety, check_lab_safety, check_drug_interactions
from ml_service import ml_service
import traceback
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="MedAssist Clinical Decision Support API",
    description="For physician review only - Not for diagnostic use",
    version="2.0.0"
)

# Configure CORS for React frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "MedAssist Clinical Decision Support API",
        "version": "2.0.0",
        "disclaimer": "For physician review only",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "MedAssist Backend",
        "version": "2.0.0"
    }

@app.get("/patients", response_model=List[dict])
async def get_patients():
    """Get all patients from the database"""
    try:
        # Resolve path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        patients_path = os.path.join(current_dir, "..", "data", "patients.json")
        
        with open(patients_path, "r") as f:
            patients = json.load(f)
            
        return patients
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Patients database not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/patients", response_model=dict)
async def create_patient(patient: dict):
    """Add a new patient to the database"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        patients_path = os.path.join(current_dir, "..", "data", "patients.json")
        
        with open(patients_path, "r") as f:
            patients = json.load(f)
            
        patients.append(patient)
        
        with open(patients_path, "w") as f:
            json.dump(patients, f, indent=2)
            
        return {"status": "success", "message": "Patient added successfully", "patient_id": patient.get("patient_id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-report", response_model=ScanResult)
async def scan_report(file: UploadFile = File(...)):
    """Upload and analyze a medical report image"""
    try:
        content = await file.read()
        # Analyze using Gemini
        result = analyze_medical_report(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report analysis failed: {str(e)}")

@app.post("/analyze-patient", response_model=dict)
async def analyze_patient(record: dict):
    """
    Analyze patient data using Gemini AI and safety checks
    For physician review only
    """
    try:
        # 1. Get AI Summary from Gemini
        summary = get_gemini_summary(record)
        
        # 2. Run Rule-Based Safety Checks
        vital_alerts = check_vital_safety(record.get('vitals', {}))
        
        # Lab results
        lab_results_list = record.get('lab_results', [])
        lab_alerts = check_lab_safety(lab_results_list)
        
        # Medications
        medications_list = record.get('current_medications', [])
        drug_alerts = check_drug_interactions(medications_list)
        
        # 3. ML Risk Scoring
        # Extract features for ML model (simplified)
        vitals = record.get('vitals', {})
        systolic = int(vitals.get("bp", "120/80").split('/')[0])
        hr = int(vitals.get("hr", 72))
        
        # Safely get HbA1c value
        hba1c = 5.5  # default
        for lab in lab_results_list:
            if lab.get("test_name", "").lower() == "hba1c":
                hba1c = float(lab.get("value", 5.5))
                break
        
        age = record.get('age', 50)
        priority_score = ml_service.predict_priority(age, systolic, hr, hba1c)
        
        # Convert summary to dict if it's a Pydantic model
        summary_dict = summary.dict() if hasattr(summary, 'dict') else summary
        
        response_data = {
            "summary": summary_dict,
            "alerts": {
                "vitals": vital_alerts,
                "labs": lab_alerts,
                "medications": drug_alerts
            },
            "ml_risk": {
                "priority_score": priority_score,
                "label": ["Low", "Moderate", "High"][priority_score]
            },
            "ai_triage": {
                "score": summary_dict.get("urgency_score", 5),
                "level": summary_dict.get("priority_level", "Moderate")
            },
            "disclaimer": "For physician review only"
        }
        
        return response_data
        
    except Exception as e:
        logger.error(f"ERROR in analyze_patient: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    
    
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=True)