"""
Risk Assessment Module - Real-time Clinical Risk Scoring
Deterministic scoring based on clinical guidelines.
NO machine learning, NO data training required.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from clinical_rules_engine import ClinicalRulesEngine, RiskLevel

@dataclass
class RiskAssessment:
    """Complete risk assessment result"""
    total_score: int
    risk_level: RiskLevel
    vitals_findings: List[str]
    bmi_findings: List[str]
    symptom_findings: List[str]
    demographic_findings: List[str]
    lifestyle_findings: List[str]
    contributing_factors: Dict[str, int]
    clinical_recommendation: str
    explanation: str
    confidence: str = "High"
    requires_immediate_attention: bool = False
    
    def to_dict(self):
        return {
            "score": self.total_score,
            "level": self.risk_level.value,
            "findings": {
                "vitals": self.vitals_findings,
                "bmi": self.bmi_findings,
                "symptoms": self.symptom_findings,
                "demographics": self.demographic_findings,
                "lifestyle": self.lifestyle_findings
            },
            "contributing_factors": self.contributing_factors,
            "recommendation": self.clinical_recommendation,
            "explanation": self.explanation,
            "confidence": self.confidence,
            "requires_immediate_attention": self.requires_immediate_attention
        }

class RiskScorer:
    """
    Real-time risk assessment system.
    Converts patient data into a risk score and clinical explanation.
    """
    
    @staticmethod
    def assess_patient(
        vitals: Dict,
        symptoms: List[str],
        age: int,
        gender: str,
        comorbidities: List[str],
        lifestyle: Dict = {}
    ) -> RiskAssessment:
        """
        Assess patient risk based on current state.
        Returns detailed risk assessment with explanations.
        """
        
        # Step 1: Evaluate each domain
        vitals_score, vitals_findings = ClinicalRulesEngine.evaluate_vitals_risk(vitals)
        bmi_score, bmi_findings = ClinicalRulesEngine.evaluate_bmi_risk(vitals.get("bmi", 0))
        symptoms_score, symptom_findings = ClinicalRulesEngine.evaluate_symptoms_risk(symptoms)
        demo_score, demographic_findings = ClinicalRulesEngine.evaluate_demographics_risk(
            age, gender, comorbidities
        )
        lifestyle_score, lifestyle_findings = ClinicalRulesEngine.evaluate_lifestyle_risk(lifestyle)
        
        # Step 1.5: Critical Combinations
        critical_alerts = ClinicalRulesEngine.evaluate_critical_combinations(vitals, symptoms)
        vitals_findings = critical_alerts + vitals_findings

        # Step 2: Calculate total score
        total_score, risk_level, factors = ClinicalRulesEngine.calculate_total_risk_score(
            vitals_score, bmi_score, symptoms_score, demo_score, lifestyle_score
        )
        
        # Step 3: Generate recommendation
        recommendation = ClinicalRulesEngine.get_clinical_recommendation(risk_level, vitals_findings + symptom_findings)
        
        # Step 4: Create explanation
        explanation = RiskScorer._create_explanation(
            total_score, risk_level, vitals_findings, symptom_findings, demographic_findings, age
        )
        
        # Step 5: Check if immediate attention needed
        requires_immediate = any(
            "CRITICAL" in finding or "🔴" in finding 
            for finding in vitals_findings + symptom_findings
        )
        
        return RiskAssessment(
            total_score=total_score,
            risk_level=risk_level,
            vitals_findings=vitals_findings,
            bmi_findings=bmi_findings,
            symptom_findings=symptom_findings,
            demographic_findings=demographic_findings,
            lifestyle_findings=lifestyle_findings,
            contributing_factors=factors,
            clinical_recommendation=recommendation,
            explanation=explanation,
            confidence="High",
            requires_immediate_attention=requires_immediate
        )
    
    @staticmethod
    def _create_explanation(
        score: int,
        level: RiskLevel,
        vitals_findings: List[str],
        symptom_findings: List[str],
        demographic_findings: List[str],
        age: int
    ) -> str:
        """
        Create a human-readable clinical explanation.
        """
        explanation_parts = [
            f"Based on current patient state (age {age}),"
        ]
        
        # Primary drivers
        primary_drivers = []
        if vitals_findings:
            primary_drivers.extend(vitals_findings[:2])
        if symptom_findings:
            primary_drivers.extend(symptom_findings[:1])
        
        if primary_drivers:
            explanation_parts.append(
                f"the primary risk drivers are: {', '.join(primary_drivers)}."
            )
        else:
            explanation_parts.append(f"vital signs and symptoms are within acceptable ranges.")
        
        # Risk classification
        risk_descriptions = {
            RiskLevel.LOW: "Overall risk profile is low. Routine monitoring is recommended.",
            RiskLevel.MODERATE: "Overall risk profile is moderate. Close monitoring and timely physician evaluation are warranted.",
            RiskLevel.HIGH: "Overall risk profile is elevated. Prompt clinical assessment is strongly recommended."
        }
        
        explanation_parts.append(risk_descriptions[level])
        
        return " ".join(explanation_parts)

class ClinicalDecisionSupport:
    """
    Main entry point for clinical decision support.
    Provides safe, ethical recommendations without diagnosis.
    """
    
    @staticmethod
    def generate_assessment(patient_data: Dict) -> Dict:
        """
        Generate a complete clinical assessment for a patient.
        
        Input structure:
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
            # Extract data
            vitals = patient_data.get("vitals", {})
            symptoms = patient_data.get("symptoms", [])
            age = patient_data.get("age", 50)
            gender = patient_data.get("gender", "Unknown")
            comorbidities = patient_data.get("medical_history", [])
            lifestyle = patient_data.get("lifestyle", {})
            
            # Assess risk
            assessment = RiskScorer.assess_patient(
                vitals=vitals,
                symptoms=symptoms,
                age=age,
                gender=gender,
                comorbidities=comorbidities,
                lifestyle=lifestyle
            )
            
            return {
                "success": True,
                "assessment": assessment.to_dict(),
                "disclaimer": "For physician review only. Not for diagnostic use."
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "disclaimer": "Assessment failed. Please consult physician directly."
            }

