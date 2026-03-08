import os
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from typing import List
from models import PatientRecord, AIHistorySummary, LabResult, ScanResult
from ai_service import get_gemini_summary, analyze_medical_report
from safety_engine import check_vital_safety, check_lab_safety, check_drug_interactions
from clinical_rules_engine import ClinicalRulesEngine, RiskLevel
from risk_assessment import ClinicalDecisionSupport, RiskScorer
from emergency_alerts import (
    EmergencyAlert, AlertLevel, create_alert, get_patient_alerts,
    resolve_alert, get_active_alerts, VitalSigns
)
from demo_scenarios import DEMO_PATIENTS, DEMO_ALERTS, get_demo_patient, get_all_demo_patients, get_demo_alerts

# ─── Supabase database layer ───────────────────────────────
from database import (
    get_all_patients, get_patient_by_id,
    create_patient, update_patient, delete_patient,
)

import traceback
import logging
import auth
from auth import UserSignup, UserLogin, create_user, verify_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

app = FastAPI(
    title="MedAssist Clinical Decision Support API",
    description="For physician review only - Not for diagnostic use",
    version="2.0.0"
)

# ─── CORS ──────────────────────────────────────────────────
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,"
    "http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,"
    "http://127.0.0.1:5175,http://127.0.0.1:5176"
)
allowed_origins = [o.strip() for o in allowed_origins_str.split(",")]
print(f"CORS Allowed Origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Root / Health ─────────────────────────────────────────

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


# ─── Auth ──────────────────────────────────────────────────

@app.post("/signup")
async def signup(user: UserSignup):
    if create_user(user):
        return {"status": "success", "message": "User created successfully"}
    raise HTTPException(status_code=400, detail="Username or email already exists")


@app.post("/login")
async def login(credentials: UserLogin):
    user = verify_user(credentials)
    if user:
        return {"status": "success", "user": user}
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ─── Patients (Supabase-backed) ────────────────────────────

@app.get("/patients", response_model=List[dict])
async def get_patients_endpoint():
    """Get all patients from Supabase."""
    try:
        return get_all_patients()
    except Exception as e:
        logger.error(f"get_patients error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/patients", response_model=dict)
async def create_patient_endpoint(patient: dict):
    """Add a new patient to Supabase."""
    try:
        # Ensure required field exists
        if not patient.get("patient_id"):
            raise HTTPException(status_code=422, detail="patient_id is required")
        record = create_patient(patient)
        return {
            "status": "success",
            "message": "Patient added successfully",
            "patient_id": record.get("patient_id"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients/{patient_id}", response_model=dict)
async def get_patient_endpoint(patient_id: str):
    """Get a single patient by patient_id."""
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/patients/{patient_id}", response_model=dict)
async def update_patient_endpoint(patient_id: str, patient: dict):
    """Update an existing patient."""
    try:
        record = update_patient(patient_id, patient)
        return {"status": "success", "patient": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/patients/{patient_id}")
async def delete_patient_endpoint(patient_id: str):
    """Delete a patient from Supabase."""
    try:
        deleted = delete_patient(patient_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        return {"status": "success", "message": f"Patient {patient_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── AI / Clinical endpoints (unchanged) ───────────────────

@app.post("/scan-report", response_model=ScanResult)
async def scan_report(file: UploadFile = File(...)):
    try:
        content = await file.read()
        return analyze_medical_report(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report analysis failed: {str(e)}")


@app.post("/generate-soap-note")
async def generate_soap_note_endpoint(record: dict):
    try:
        from ai_service import generate_soap_note
        soap_note = generate_soap_note(record)
        return {"soap_note": soap_note}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-patient", response_model=dict)
async def analyze_patient(record: dict):
    try:
        risk_assessment = ClinicalDecisionSupport.generate_assessment(record)
        if not risk_assessment.get("success"):
            raise Exception(f"Risk assessment failed: {risk_assessment.get('error')}")

        assessment = risk_assessment["assessment"]
        vital_alerts = check_vital_safety(record.get('vitals', {}))
        lab_results_list = record.get('lab_results', [])
        lab_alerts = check_lab_safety(lab_results_list)
        medications_list = record.get('current_medications', [])
        drug_alerts = check_drug_interactions(medications_list)

        try:
            ai_summary = get_gemini_summary(record)
            summary_dict = ai_summary.dict() if hasattr(ai_summary, 'dict') else ai_summary
        except Exception as e:
            logger.warning(f"AI summary generation failed: {e}")
            summary_dict = {"clinical_narrative": "AI summary unavailable"}

        return {
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
            "disclaimer": "This is a decision support tool. All findings require physician validation."
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/clinical-assessment")
async def clinical_assessment(patient_data: dict):
    try:
        return ClinicalDecisionSupport.generate_assessment(patient_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


# ─── Emergency Alerts ──────────────────────────────────────

@app.post("/emergency-alert")
async def create_emergency_alert(
    patient_id: str, patient_name: str, alert_level: AlertLevel,
    message: str, heart_rate: int = None, blood_pressure: str = None,
    oxygen_level: int = None, temperature: float = None, risk_score: int = None
):
    try:
        vitals = None
        if any([heart_rate, blood_pressure, oxygen_level, temperature]):
            vitals = VitalSigns(
                heart_rate=heart_rate or 80,
                blood_pressure=blood_pressure or "120/80",
                oxygen_level=oxygen_level or 98,
                temperature=temperature or 37.0
            )
        alert = EmergencyAlert(
            patient_id=patient_id, patient_name=patient_name,
            alert_level=alert_level, message=message,
            vitals=vitals, risk_score=risk_score
        )
        return await create_alert(alert)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts/{patient_id}")
async def get_patient_alerts_endpoint(patient_id: str):
    try:
        return get_patient_alerts(patient_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts/active/all")
async def get_all_active_alerts():
    try:
        active = get_active_alerts()
        return {
            "active_alerts": active,
            "total_active": len(active),
            "critical_count": len([a for a in active if a["alert_level"] == "CRITICAL"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert_endpoint(alert_id: str):
    try:
        if not resolve_alert(alert_id):
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "alert_resolved", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emergency-sos")
async def emergency_sos_button(patient_id: str, patient_name: str):
    try:
        alert = EmergencyAlert(
            patient_id=patient_id, patient_name=patient_name,
            alert_level=AlertLevel.CRITICAL,
            message=f"🆘 EMERGENCY SOS ACTIVATED by patient {patient_name}",
            risk_score=100
        )
        result = await create_alert(alert)
        result["message"] = "EMERGENCY SERVICES NOTIFIED"
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Demo endpoints (unchanged) ────────────────────────────

@app.get("/demo/patients")
async def get_demo_patients_endpoint():
    return {"patients": DEMO_PATIENTS, "total": len(DEMO_PATIENTS)}


@app.get("/demo/patient/{patient_id}")
async def get_demo_patient_endpoint(patient_id: str):
    patient = get_demo_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Demo patient not found")
    return patient


@app.get("/demo/alerts/{patient_id}")
async def get_demo_alerts_endpoint(patient_id: str):
    alerts = get_demo_alerts(patient_id)
    if not alerts:
        raise HTTPException(status_code=404, detail="No demo alerts found")
    return alerts


@app.get("/demo/scenario/{scenario_name}")
async def get_demo_scenario(scenario_name: str):
    scenarios = {
        "critical": DEMO_PATIENTS[0], "warning": DEMO_PATIENTS[1],
        "normal": DEMO_PATIENTS[2], "emergency": DEMO_PATIENTS[3]
    }
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_name}' not found")
    patient = scenarios[scenario_name]
    return {"patient": patient, "alerts": get_demo_alerts(patient["patient_id"]), "scenario": scenario_name}


@app.post("/demo/trigger-alert/{scenario_name}")
async def trigger_demo_alert(scenario_name: str):
    scenarios = {
        "critical": DEMO_PATIENTS[0], "warning": DEMO_PATIENTS[1],
        "normal": DEMO_PATIENTS[2], "emergency": DEMO_PATIENTS[3]
    }
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario not found")
    patient = scenarios[scenario_name]
    alert_levels = {
        "critical": AlertLevel.CRITICAL, "warning": AlertLevel.WARNING,
        "normal": AlertLevel.NORMAL, "emergency": AlertLevel.CRITICAL
    }
    alert = EmergencyAlert(
        patient_id=patient["patient_id"], patient_name=patient["name"],
        alert_level=alert_levels[scenario_name],
        message=f"Demo {scenario_name.upper()} alert - {patient['symptoms']}",
        risk_score=patient["risk_score"],
        vitals=VitalSigns(
            heart_rate=patient["heart_rate"], blood_pressure=patient["blood_pressure"],
            oxygen_level=patient["oxygen_level"], temperature=patient["temperature"],
            respiratory_rate=patient["respiratory_rate"]
        )
    )
    result = await create_alert(alert)
    return {"status": "demo_alert_triggered", "scenario": scenario_name, "alert": result}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)