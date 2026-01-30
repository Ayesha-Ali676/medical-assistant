import os
# Updated CORS origins to support port 5174
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from typing import List
import shutil
from models import PatientRecord, AIHistorySummary, LabResult, ScanResult
from ai_service import get_gemini_summary, analyze_medical_report
from safety_engine import check_vital_safety, check_lab_safety, check_drug_interactions
from clinical_rules_engine import ClinicalRulesEngine, RiskLevel
from risk_assessment import ClinicalDecisionSupport, RiskScorer
from emergency_alerts import EmergencyAlert, AlertLevel, create_alert, get_patient_alerts, resolve_alert, get_active_alerts, VitalSigns
from demo_scenarios import DEMO_PATIENTS, DEMO_ALERTS, get_demo_patient, get_all_demo_patients, get_demo_alerts
import traceback
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env from the backend directory
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

app = FastAPI(
    title="MedAssist Clinical Decision Support API",
    description="For physician review only - Not for diagnostic use",
    version="2.0.0"
)

# Configure CORS for React frontend
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174")
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

@app.post("/generate-soap-note")
async def generate_soap_note_endpoint(record: dict):
    with open("endpoint_hits.log", "a") as f:
        f.write("Hit /generate-soap-note\n")
    """
    Generate a professional clinical SOAP note using AI.
    S: Subjective - Patient's complaints
    O: Objective - Vitals and Labs
    A: Assessment - Clinical reasoning
    P: Plan - Recommendations
    """
    try:
        from ai_service import generate_soap_note
        soap_note = generate_soap_note(record)
        return {"soap_note": soap_note}
    except Exception as e:
        logger.error(f"SOAP note generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
    
# Add this endpoint after the @app.post("/patients") endpoint in main.py

@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient from the database"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        patients_path = os.path.join(current_dir, "..", "data", "patients.json")
        
        # Read current patients
        with open(patients_path, "r") as f:
            patients = json.load(f)
        
        # Find and remove the patient
        original_count = len(patients)
        patients = [p for p in patients if p.get("patient_id") != patient_id]
        
        if len(patients) == original_count:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        
        # Save updated list
        with open(patients_path, "w") as f:
            json.dump(patients, f, indent=2)
        
        return {
            "status": "success", 
            "message": f"Patient {patient_id} deleted successfully",
            "deleted_count": original_count - len(patients)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# EMERGENCY ALERT ENDPOINTS - HACKATHON WINNING FEATURES
# ============================================================================

@app.post("/emergency-alert")
async def create_emergency_alert(
    patient_id: str,
    patient_name: str,
    alert_level: AlertLevel,
    message: str,
    heart_rate: int = None,
    blood_pressure: str = None,
    oxygen_level: int = None,
    temperature: float = None,
    risk_score: int = None
):
    """
    Create an emergency alert with immediate notifications
    
    Alert Levels:
    - CRITICAL: Red - immediate action required (SOS)
    - WARNING: Orange - urgent attention needed
    - INFO: Blue - monitor and observe
    - NORMAL: Green - all okay
    """
    try:
        # Build vitals if provided
        vitals = None
        if any([heart_rate, blood_pressure, oxygen_level, temperature]):
            vitals = VitalSigns(
                heart_rate=heart_rate or 80,
                blood_pressure=blood_pressure or "120/80",
                oxygen_level=oxygen_level or 98,
                temperature=temperature or 37.0
            )
        
        alert = EmergencyAlert(
            patient_id=patient_id,
            patient_name=patient_name,
            alert_level=alert_level,
            message=message,
            vitals=vitals,
            risk_score=risk_score
        )
        
        result = await create_alert(alert)
        return result
        
    except Exception as e:
        logger.error(f"Emergency alert creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts/{patient_id}")
async def get_patient_alerts_endpoint(patient_id: str):
    """
    Get all alerts for a specific patient
    Returns: critical, warning, and info alerts
    """
    try:
        return get_patient_alerts(patient_id)
    except Exception as e:
        logger.error(f"Failed to retrieve alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts/active/all")
async def get_all_active_alerts():
    """
    Get all currently active alerts across all patients
    Useful for doctor dashboard and monitoring
    """
    try:
        return {
            "active_alerts": get_active_alerts(),
            "total_active": len(get_active_alerts()),
            "critical_count": len([a for a in get_active_alerts() if a["alert_level"] == "CRITICAL"])
        }
    except Exception as e:
        logger.error(f"Failed to retrieve active alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert_endpoint(alert_id: str):
    """Mark an alert as resolved"""
    try:
        success = resolve_alert(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "alert_resolved", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emergency-sos")
async def emergency_sos_button(patient_id: str, patient_name: str):
    """
    Emergency SOS Button - Highest priority alert
    Immediately notifies all contacts
    """
    try:
        alert = EmergencyAlert(
            patient_id=patient_id,
            patient_name=patient_name,
            alert_level=AlertLevel.CRITICAL,
            message=f"🆘 EMERGENCY SOS ACTIVATED by patient {patient_name}",
            risk_score=100  # Maximum risk
        )
        
        result = await create_alert(alert)
        result["message"] = "EMERGENCY SERVICES NOTIFIED"
        return result
        
    except Exception as e:
        logger.error(f"SOS activation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HACKATHON DEMO ENDPOINTS - Pre-configured test scenarios
# ============================================================================

@app.get("/demo/patients")
async def get_demo_patients_endpoint():
    """Get all demo patients for testing"""
    return {
        "patients": DEMO_PATIENTS,
        "total": len(DEMO_PATIENTS),
        "message": "Demo patients for hackathon testing"
    }


@app.get("/demo/patient/{patient_id}")
async def get_demo_patient_endpoint(patient_id: str):
    """Get a specific demo patient"""
    patient = get_demo_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Demo patient not found")
    return patient


@app.get("/demo/alerts/{patient_id}")
async def get_demo_alerts_endpoint(patient_id: str):
    """Get demo alerts for a patient"""
    alerts = get_demo_alerts(patient_id)
    if not alerts:
        raise HTTPException(status_code=404, detail="No demo alerts found")
    return alerts


@app.get("/demo/scenario/{scenario_name}")
async def get_demo_scenario(scenario_name: str):
    """
    Get a specific demo scenario
    Available scenarios: critical, warning, normal, emergency
    """
    scenarios = {
        "critical": DEMO_PATIENTS[0],
        "warning": DEMO_PATIENTS[1],
        "normal": DEMO_PATIENTS[2],
        "emergency": DEMO_PATIENTS[3]
    }
    
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_name}' not found")
    
    patient = scenarios[scenario_name]
    alerts = get_demo_alerts(patient["patient_id"])
    
    return {
        "patient": patient,
        "alerts": alerts,
        "scenario": scenario_name
    }


@app.post("/demo/trigger-alert/{scenario_name}")
async def trigger_demo_alert(scenario_name: str):
    """
    Trigger an alert for a demo scenario
    Useful for testing the emergency alert system
    """
    scenarios = {
        "critical": DEMO_PATIENTS[0],
        "warning": DEMO_PATIENTS[1],
        "normal": DEMO_PATIENTS[2],
        "emergency": DEMO_PATIENTS[3]
    }
    
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_name}' not found")
    
    patient = scenarios[scenario_name]
    
    # Map scenario to alert level
    alert_levels = {
        "critical": AlertLevel.CRITICAL,
        "warning": AlertLevel.WARNING,
        "normal": AlertLevel.NORMAL,
        "emergency": AlertLevel.CRITICAL
    }
    
    alert = EmergencyAlert(
        patient_id=patient["patient_id"],
        patient_name=patient["name"],
        alert_level=alert_levels[scenario_name],
        message=f"Demo {scenario_name.upper()} alert - {patient['symptoms']}",
        risk_score=patient["risk_score"],
        vitals=VitalSigns(
            heart_rate=patient["heart_rate"],
            blood_pressure=patient["blood_pressure"],
            oxygen_level=patient["oxygen_level"],
            temperature=patient["temperature"],
            respiratory_rate=patient["respiratory_rate"]
        )
    )
    
    result = await create_alert(alert)
    return {
        "status": "demo_alert_triggered",
        "scenario": scenario_name,
        "alert": result
    }


@app.get("/demo/quick-start")
async def demo_quick_start():
    """
    Quick start guide for hackathon demo
    Shows how to access all demo features
    """
    return {
        "title": "MedAssist - Hackathon Demo Quick Start",
        "endpoints": {
            "demo_patients": "/demo/patients",
            "demo_alerts": "/demo/alerts/{patient_id}",
            "demo_scenario": "/demo/scenario/{scenario_name}",
            "trigger_alert": "/demo/trigger-alert/{scenario_name}",
            "emergency_sos": "/emergency-sos"
        },
        "scenarios": ["critical", "warning", "normal", "emergency"],
        "example_demo_patients": {
            "critical": "demo_critical_001",
            "warning": "demo_warning_002",
            "normal": "demo_normal_003",
            "emergency": "demo_crisis_004"
        },
        "getting_started": [
            "1. GET /demo/patients - See all demo patients",
            "2. GET /demo/scenario/critical - Get critical scenario with alerts",
            "3. POST /demo/trigger-alert/emergency - Trigger emergency alert",
            "4. POST /emergency-sos - Activate emergency SOS"
        ],
        "frontend_setup": {
            "import": "import EmergencyDashboard from './components/EmergencyDashboard'",
            "usage": "<EmergencyDashboard patient={demoPatient} />",
            "components": ["EmergencyDashboard", "RiskGauge", "VitalSignsDisplay"]
        }
    }

    
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=True)
    
    