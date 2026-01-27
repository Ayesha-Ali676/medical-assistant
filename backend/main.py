import os
# Updated CORS origins to support port 5174
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List
import shutil
from models import PatientRecord, AIHistorySummary, LabResult, ScanResult
from ai_service import get_gemini_summary, analyze_medical_report
from safety_engine import check_vital_safety, check_lab_safety, check_drug_interactions
from clinical_rules_engine import ClinicalRulesEngine, RiskLevel
from risk_assessment import ClinicalDecisionSupport, RiskScorer
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
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
print(f"CORS Allowed Origins: {allowed_origins}")
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
    Analyze patient data using clinical rules engine and AI reasoning.
    For physician review only - NOT for diagnostic use.
    
    This endpoint performs:
    1. Real-time clinical risk assessment (deterministic rules)
    2. Safety checks (vital signs, lab values)
    3. AI-powered clinical reasoning and explanation
    """
    try:
        # Step 1: Clinical Risk Assessment (Dataset-Free)
        risk_assessment = ClinicalDecisionSupport.generate_assessment(record)
        
        if not risk_assessment.get("success"):
            raise Exception(f"Risk assessment failed: {risk_assessment.get('error')}")
        
        assessment = risk_assessment["assessment"]
        
        # Step 2: Safety Checks
        vital_alerts = check_vital_safety(record.get('vitals', {}))
        lab_results_list = record.get('lab_results', [])
        lab_alerts = check_lab_safety(lab_results_list)
        medications_list = record.get('current_medications', [])
        drug_alerts = check_drug_interactions(medications_list)
        
        # Step 3: AI Reasoning (Explanation & Interpretation)
        try:
            ai_summary = get_gemini_summary(record)
            summary_dict = ai_summary.dict() if hasattr(ai_summary, 'dict') else ai_summary
        except Exception as e:
            logger.warning(f"AI summary generation failed: {str(e)}")
            summary_dict = {"clinical_narrative": "AI summary unavailable"}
        
        # Step 4: Compile Response
        response_data = {
            "clinical_assessment": assessment,
            "safety_alerts": {
                "vitals": vital_alerts,
                "labs": lab_alerts,
                "medications": drug_alerts
            },
            "ai_interpretation": summary_dict,
            "workflow": {
                "requires_immediate_attention": assessment.get("requires_immediate_attention", False),
                "risk_level": assessment.get("level"),
                "next_steps": assessment.get("recommendation")
            },
            "disclaimer": "This is a decision support tool. All findings require physician validation. Not for diagnostic use."
        }
        
        return response_data
        
    except Exception as e:
        logger.error(f"ERROR in analyze_patient: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/clinical-assessment")
async def clinical_assessment(patient_data: dict):
    """
    Dedicated endpoint for clinical risk assessment.
    Dataset-free, real-time evaluation using clinical rules.
    
    Input:
    {
        "vitals": {"bp": "140/90", "hr": 88, "spo2": 97, "temp": 36.5},
        "symptoms": ["headache", "fatigue"],
        "age": 45,
        "gender": "M",
        "medical_history": ["hypertension"],
        "medications": ["lisinopril 10mg"],
        "allergies": []
    }
    """
    try:
        result = ClinicalDecisionSupport.generate_assessment(patient_data)
        return result
    except Exception as e:
        logger.error(f"Clinical assessment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")
    
    
    
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=True)