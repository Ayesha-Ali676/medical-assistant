from pydantic import BaseModel
from typing import List, Optional

class LabResult(BaseModel):
    test_name: str
    value: float
    unit: str
    reference_range: str
    status: str

class Medication(BaseModel):
    name: str
    dose: str
    frequency: str
    route: Optional[str] = "oral"

class PatientRecord(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    chief_complaint: str
    vitals: dict
    lab_results: List[LabResult]
    current_medications: List[Medication]
    allergies: List[str]
    medical_history: List[str]

class AIHistorySummary(BaseModel):
    clinical_narrative: str
    key_findings: List[str]
    risk_assessment: dict
    urgency_score: int
    priority_level: str
    recommendations: List[str]
    disclaimer: str = "For physician review only"

class ScanResult(BaseModel):
    summary: str
    key_observations: List[str]
    detected_conditions: List[str]
    confidence_score: float
    is_valid_medical_report: bool