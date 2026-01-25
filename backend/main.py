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
async def analyze_patient(record: PatientRecord):
    """
    Analyze patient data using Gemini AI and safety checks
    For physician review only
    """
    try:
        # 1. Get AI Summary from Gemini
        summary = get_gemini_summary(record.dict())
        
        # 2. Run Rule-Based Safety Checks
        vital_alerts = check_vital_safety(record.vitals)
        lab_alerts = check_lab_safety(record.lab_results)
        drug_alerts = check_drug_interactions([m.dict() for m in record.current_medications])
        
        # 3. ML Risk Scoring
        # Extract features for ML model (simplified)
        systolic = int(record.vitals.get("bp", "120/80").split('/')[0])
        hr = int(record.vitals.get("hr", 72))
        hba1c = next((l.value for l in record.lab_results if l.test_name.lower() == "hba1c"), 5.5)
        
        priority_score = ml_service.predict_priority(record.age, systolic, hr, hba1c)
        
        return {
            "summary": summary,
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
                "score": summary.urgency_score,
                "level": summary.priority_level
            },
            "disclaimer": "For physician review only"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=True)
