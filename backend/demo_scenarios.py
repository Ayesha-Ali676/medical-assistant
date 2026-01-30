"""
Demo Scenarios for Hackathon
Pre-configured patient scenarios showing different risk levels
"""

from datetime import datetime

DEMO_PATIENTS = [
    {
        "patient_id": "demo_critical_001",
        "name": "John Doe - CRITICAL",
        "patient_name": "John Doe - CRITICAL",
        "age": 58,
        "gender": "Male",
        "heart_rate": 128,  # High - abnormal
        "blood_pressure": "180/110",  # High - critical
        "oxygen_level": 88,  # Low - abnormal
        "temperature": 38.5,  # High - fever
        "respiratory_rate": 24,  # High - abnormal
        "risk_score": 92,  # CRITICAL
        "symptoms": "Chest pain, shortness of breath, dizziness",
        "medical_history": "Hypertension, Diabetes Type 2",
        "current_medications": ["Lisinopril", "Metformin"],
        "last_assessment": "2026-01-30T08:15:00Z",
        "status": "CRITICAL"
    },
    {
        "patient_id": "demo_warning_002",
        "name": "Sarah Smith - WARNING",
        "patient_name": "Sarah Smith - WARNING",
        "age": 65,
        "gender": "Female",
        "heart_rate": 115,  # Slightly elevated
        "blood_pressure": "155/95",  # Elevated
        "oxygen_level": 94,  # Lower acceptable range
        "temperature": 37.8,  # Slight fever
        "respiratory_rate": 20,  # Upper normal range
        "risk_score": 54,  # WARNING
        "symptoms": "Fatigue, mild shortness of breath",
        "medical_history": "CHF, Atrial Fibrillation",
        "current_medications": ["Warfarin", "Furosemide", "Digoxin"],
        "last_assessment": "2026-01-30T09:45:00Z",
        "status": "WARNING"
    },
    {
        "patient_id": "demo_normal_003",
        "name": "Michael Johnson - NORMAL",
        "patient_name": "Michael Johnson - NORMAL",
        "age": 45,
        "gender": "Male",
        "heart_rate": 72,  # Normal
        "blood_pressure": "120/78",  # Normal
        "oxygen_level": 98,  # Normal
        "temperature": 37.0,  # Normal
        "respiratory_rate": 16,  # Normal
        "risk_score": 18,  # NORMAL
        "symptoms": "None",
        "medical_history": "Seasonal allergies",
        "current_medications": ["Cetirizine"],
        "last_assessment": "2026-01-30T10:30:00Z",
        "status": "NORMAL"
    },
    {
        "patient_id": "demo_crisis_004",
        "name": "Robert Williams - EMERGENCY",
        "patient_name": "Robert Williams - EMERGENCY",
        "age": 72,
        "gender": "Male",
        "heart_rate": 145,  # Critical
        "blood_pressure": "210/125",  # Critical
        "oxygen_level": 82,  # Critical
        "temperature": 39.2,  # High fever
        "respiratory_rate": 32,  # Critical
        "risk_score": 98,  # MAXIMUM CRITICAL
        "symptoms": "Severe chest pain, difficulty breathing, confusion",
        "medical_history": "Cardiac history, Previous MI, Hypertension",
        "current_medications": ["Aspirin", "Atorvastatin", "Metoprolol"],
        "last_assessment": "2026-01-30T08:00:00Z",
        "status": "EMERGENCY"
    }
]

DEMO_ALERTS = {
    "demo_critical_001": {
        "critical_alerts": [
            {
                "alert_id": "alert_001_1",
                "message": "⚠️ CRITICAL: Blood Pressure 180/110 - Stage 2 Hypertensive Crisis",
                "timestamp": "2026-01-30T10:15:00Z",
                "alert_level": "CRITICAL"
            },
            {
                "alert_id": "alert_001_2",
                "message": "⚠️ CRITICAL: Oxygen Level 88% - Below Safe Threshold",
                "timestamp": "2026-01-30T10:16:00Z",
                "alert_level": "CRITICAL"
            }
        ],
        "warning_alerts": [
            {
                "alert_id": "alert_001_3",
                "message": "⚠️ WARNING: Heart Rate 128 bpm - Tachycardia Detected",
                "timestamp": "2026-01-30T10:17:00Z",
                "alert_level": "WARNING"
            }
        ],
        "info_alerts": [],
        "total_alerts": 3,
        "active_critical": 2
    },
    "demo_warning_002": {
        "critical_alerts": [],
        "warning_alerts": [
            {
                "alert_id": "alert_002_1",
                "message": "⚠️ WARNING: Blood Pressure 155/95 - Stage 1 Hypertension",
                "timestamp": "2026-01-30T09:50:00Z",
                "alert_level": "WARNING"
            },
            {
                "alert_id": "alert_002_2",
                "message": "⚠️ WARNING: Heart Rate 115 bpm - Elevated",
                "timestamp": "2026-01-30T09:51:00Z",
                "alert_level": "WARNING"
            }
        ],
        "info_alerts": [
            {
                "alert_id": "alert_002_3",
                "message": "ℹ️ INFO: Monitor for signs of heart failure exacerbation",
                "timestamp": "2026-01-30T09:45:00Z",
                "alert_level": "INFO"
            }
        ],
        "total_alerts": 3,
        "active_critical": 0
    },
    "demo_normal_003": {
        "critical_alerts": [],
        "warning_alerts": [],
        "info_alerts": [
            {
                "alert_id": "alert_003_1",
                "message": "ℹ️ INFO: All vitals normal - Continue routine monitoring",
                "timestamp": "2026-01-30T10:30:00Z",
                "alert_level": "INFO"
            }
        ],
        "total_alerts": 1,
        "active_critical": 0
    },
    "demo_crisis_004": {
        "critical_alerts": [
            {
                "alert_id": "alert_004_1",
                "message": "🚨 CRITICAL: Heart Rate 145 bpm - Severe Tachycardia",
                "timestamp": "2026-01-30T08:02:00Z",
                "alert_level": "CRITICAL"
            },
            {
                "alert_id": "alert_004_2",
                "message": "🚨 CRITICAL: Oxygen Level 82% - SEVERE Hypoxemia",
                "timestamp": "2026-01-30T08:03:00Z",
                "alert_level": "CRITICAL"
            },
            {
                "alert_id": "alert_004_3",
                "message": "🚨 CRITICAL: Blood Pressure 210/125 - Hypertensive Emergency",
                "timestamp": "2026-01-30T08:04:00Z",
                "alert_level": "CRITICAL"
            }
        ],
        "warning_alerts": [],
        "info_alerts": [],
        "total_alerts": 3,
        "active_critical": 3
    }
}


def get_demo_patient(patient_id: str = None):
    """Get a demo patient by ID, or return critical patient if none specified"""
    if not patient_id:
        return DEMO_PATIENTS[0]  # Default: Critical patient
    
    for patient in DEMO_PATIENTS:
        if patient["patient_id"] == patient_id:
            return patient
    return None


def get_all_demo_patients():
    """Get all demo patients"""
    return DEMO_PATIENTS


def get_demo_alerts(patient_id: str):
    """Get demo alerts for a patient"""
    return DEMO_ALERTS.get(patient_id, {
        "critical_alerts": [],
        "warning_alerts": [],
        "info_alerts": [],
        "total_alerts": 0,
        "active_critical": 0
    })


def create_sos_alert(patient_id: str, patient_name: str):
    """Create an emergency SOS alert"""
    return {
        "alert_id": f"{patient_id}_sos_{int(datetime.now().timestamp())}",
        "patient_id": patient_id,
        "patient_name": patient_name,
        "alert_level": "CRITICAL",
        "message": f"🆘 EMERGENCY SOS ACTIVATED by patient {patient_name}",
        "urgency": "🚨 CRITICAL - Immediate Medical Evaluation Required",
        "severity_color": "#ef4444",
        "timestamp": datetime.now().isoformat(),
        "status": "alert_created"
    }


# Demo narrative for medical report
DEMO_CLINICAL_NARRATIVE = {
    "demo_critical_001": {
        "summary": "58-year-old male presenting with acute hypertensive crisis with respiratory compromise.",
        "key_findings": [
            "Systolic BP 180 mmHg indicating Stage 2 Hypertensive Crisis",
            "Oxygen saturation 88% - concerning for acute hypoxemia",
            "Heart rate 128 - compensatory tachycardia",
            "Fever 38.5°C suggests possible infection",
            "Clinical presentation concerning for acute coronary syndrome or acute decompensated heart failure"
        ],
        "recommendations": "URGENT: Immediate physician evaluation required. Consider emergency department evaluation for possible acute coronary syndrome, hypertensive emergency, or acute respiratory distress.",
        "risk_level": "CRITICAL",
        "priority": "IMMEDIATE"
    }
}
