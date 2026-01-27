"""
Clinical Rule Engine - Dataset-Free Medical Decision Support
Real-time patient assessment using clinical guidelines and deterministic rules.
NO model training, NO historical data dependency.
"""

from typing import Dict, List, Tuple
from enum import Enum

class RiskLevel(Enum):
    LOW = "Low Risk (0-30)"
    MODERATE = "Moderate Risk (31-60)"
    HIGH = "High Risk (61-100)"

class ClinicalRulesEngine:
    """
    Deterministic clinical rule engine based on medical guidelines.
    All rules are transparent and explainable.
    """
    
    @staticmethod
    def evaluate_vitals_risk(vitals: Dict) -> Tuple[int, List[str]]:
        """
        Evaluate risk from vital signs using clinical guidelines.
        Returns: (risk_score, list of concerning findings)
        """
        risk_score = 0
        findings = []
        
        # Blood Pressure Assessment
        if "bp" in vitals:
            try:
                systolic, diastolic = map(int, vitals["bp"].split('/'))
                
                if systolic >= 180 or diastolic >= 120:
                    risk_score += 25
                    findings.append("🔴 CRITICAL: Hypertensive crisis (BP > 180/120)")
                elif systolic >= 160 or diastolic >= 100:
                    risk_score += 15
                    findings.append("🟠 HIGH: Stage 2 hypertension (BP 160-179/100-109)")
                elif systolic >= 140 or diastolic >= 90:
                    risk_score += 8
                    findings.append("🟡 MODERATE: Stage 1 hypertension (BP 140-159/90-99)")
                elif systolic < 90 or diastolic < 60:
                    risk_score += 12
                    findings.append("🟡 MODERATE: Hypotension (BP < 90/60)")
            except Exception as e:
                pass
        
        # Oxygen Saturation Assessment (SpO2)
        if "spo2" in vitals:
            try:
                spo2 = int(vitals["spo2"])
                
                if spo2 < 90:
                    risk_score += 20
                    findings.append("🔴 CRITICAL: Severe hypoxemia (SpO2 < 90%)")
                elif spo2 < 94:
                    risk_score += 12
                    findings.append("🟠 HIGH: Hypoxemia (SpO2 < 94%)")
                elif spo2 < 95:
                    risk_score += 5
                    findings.append("🟡 MODERATE: Low oxygen saturation (SpO2 < 95%)")
            except Exception as e:
                pass
        
        # Heart Rate Assessment
        if "hr" in vitals:
            try:
                hr = int(vitals["hr"])
                
                if hr > 130:
                    risk_score += 10
                    findings.append("🟠 HIGH: Severe tachycardia (HR > 130)")
                elif hr > 120:
                    risk_score += 6
                    findings.append("🟡 MODERATE: Tachycardia (HR > 120)")
                elif hr < 50:
                    risk_score += 8
                    findings.append("🟡 MODERATE: Bradycardia (HR < 50)")
            except Exception as e:
                pass
        
        # Temperature Assessment
        if "temp" in vitals:
            try:
                temp = float(vitals["temp"])
                
                if temp > 39.5:
                    risk_score += 8
                    findings.append("🟠 HIGH: Severe fever (Temp > 39.5°C)")
                elif temp > 38.5:
                    risk_score += 5
                    findings.append("🟡 MODERATE: Fever (Temp > 38.5°C)")
                elif temp < 35:
                    risk_score += 8
                    findings.append("🟡 MODERATE: Hypothermia (Temp < 35°C)")
            except Exception as e:
                pass
        
        return min(risk_score, 45), findings  # Cap at 45 from vitals

    @staticmethod
    def evaluate_bmi_risk(bmi_val) -> Tuple[int, List[str]]:
        """Evaluate risk based on BMI"""
        try:
            bmi = float(bmi_val)
            if bmi >= 40:
                return 15, ["🔴 CRITICAL: Class III Obesity (BMI >= 40)"]
            if bmi >= 35:
                return 10, ["🟠 HIGH: Class II Obesity (BMI 35-39.9)"]
            if bmi >= 30:
                return 6, ["🟡 MODERATE: Obesity (BMI 30-34.9)"]
            if bmi < 18.5:
                return 5, ["🟡 MODERATE: Underweight (BMI < 18.5)"]
            return 0, []
        except:
            return 0, []
    
    @staticmethod
    def evaluate_symptoms_risk(symptoms: List[str]) -> Tuple[int, List[str]]:
        """
        Evaluate risk based on symptom combination.
        Critical symptom combinations trigger high-risk flags.
        """
        risk_score = 0
        findings = []
        
        if not symptoms:
            return 0, []
        
        symptoms_lower = [s.lower() for s in symptoms]
        
        # Critical combinations
        if any(s in symptoms_lower for s in ["chest pain", "shortness of breath"]):
            risk_score += 18
            findings.append("🔴 CRITICAL: Potential cardiac event symptoms detected")
        
        if any(s in symptoms_lower for s in ["severe headache", "confusion", "altered mental status"]):
            risk_score += 15
            findings.append("🔴 CRITICAL: Possible neurological emergency")
        
        if any(s in symptoms_lower for s in ["difficulty breathing", "severe cough"]):
            risk_score += 12
            findings.append("🟠 HIGH: Respiratory distress signs")
        
        if any(s in symptoms_lower for s in ["severe pain", "acute pain"]):
            risk_score += 10
            findings.append("🟠 HIGH: Acute pain episode")
        
        if any(s in symptoms_lower for s in ["dizziness", "fainting", "syncope"]):
            risk_score += 10
            findings.append("🟠 HIGH: Hemodynamic instability risk")
        
        if any(s in symptoms_lower for s in ["persistent vomiting", "vomiting blood"]):
            risk_score += 8
            findings.append("🟡 MODERATE: GI distress with dehydration risk")
        
        return min(risk_score, 40), findings  # Cap at 40 from symptoms

    @staticmethod
    def evaluate_lifestyle_risk(lifestyle: Dict) -> Tuple[int, List[str]]:
        """Evaluate risk from lifestyle factors"""
        risk_score = 0
        findings = []
        
        if lifestyle.get("smoking") == "Current":
            risk_score += 10
            findings.append("⚠️ Current Smoker - High cardiovascular/respiratory risk")
        elif lifestyle.get("smoking") == "Former":
            risk_score += 4
            findings.append("Former Smoker")
            
        if lifestyle.get("activity_level") == "Sedentary":
            risk_score += 6
            findings.append("⚠️ Sedentary Lifestyle")
            
        if lifestyle.get("diet_quality") == "Poor":
            risk_score += 5
            findings.append("⚠️ Poor Diet Quality")
            
        try:
            sleep = float(lifestyle.get("sleep_hours", 7))
            if sleep < 6:
                risk_score += 4
                findings.append("⚠️ Sleep Deprivation (<6 hours)")
        except:
            pass
            
        return min(risk_score, 20), findings
    
    @staticmethod
    def evaluate_demographics_risk(age: int, gender: str, comorbidities: List[str]) -> Tuple[int, List[str]]:
        """
        Evaluate risk based on age and chronic conditions.
        """
        risk_score = 0
        findings = []
        
        # Age-based risk
        if age >= 75:
            risk_score += 8
            findings.append("Elderly patient (>75 years) - Higher baseline risk")
        elif age >= 65:
            risk_score += 4
            findings.append("Senior patient (65-74 years)")
        elif age < 18:
            risk_score += 2
            findings.append("Pediatric patient - Requires pediatric assessment")
        
        # Comorbidity assessment
        comorbidities_lower = [c.lower() for c in (comorbidities or [])]
        
        high_risk_conditions = {
            "diabetes": 6,
            "hypertension": 5,
            "heart disease": 8,
            "cardiac": 8,
            "copd": 7,
            "asthma": 5,
            "kidney disease": 7,
            "liver disease": 8,
            "cancer": 6,
            "stroke history": 7,
            "hiv": 8,
            "immunocompromised": 8
        }
        
        for condition, score in high_risk_conditions.items():
            if any(condition in c for c in comorbidities_lower):
                risk_score += score
                findings.append(f"⚠️ Chronic condition: {condition.title()}")
        
        return min(risk_score, 30), findings  # Cap at 30 from demographics

    @staticmethod
    def evaluate_critical_combinations(vitals: Dict, symptoms: List[str]) -> List[str]:
        """Check for specific dangerous clinical combinations"""
        critical_alerts = []
        symptoms_lower = [s.lower() for s in symptoms]
        
        # BP Criticals
        if "bp" in vitals:
            try:
                systolic, diastolic = map(int, vitals["bp"].split('/'))
                if systolic > 180 or diastolic > 120:
                    if "chest pain" in symptoms_lower:
                        critical_alerts.append("🚨 CARDIAC ALERT: Hypertensive crisis with chest pain - IMMEDIATE EVALUATION")
                    else:
                        critical_alerts.append("🚨 EMERGENT: Hypertensive crisis (BP > 180/120)")
            except: pass
            
        # Respiratory Criticals
        if "spo2" in vitals and "temp" in vitals:
            try:
                spo2 = int(vitals["spo2"])
                temp = float(vitals["temp"])
                if spo2 < 90 and (temp > 38.0 or "cough" in symptoms_lower):
                    critical_alerts.append("🚨 INFECTION RISK: Hypoxemia with fever/cough - Possible pneumonia/sepsis")
            except: pass
            
        return critical_alerts
    
    @staticmethod
    def calculate_total_risk_score(vitals_score: int, bmi_score: int, symptoms_score: int, 
                                  demographics_score: int, lifestyle_score: int) -> Tuple[int, RiskLevel, Dict]:
        """
        Calculate total risk score and classify risk level.
        Total range: 0-100
        """
        total_score = vitals_score + bmi_score + symptoms_score + demographics_score + lifestyle_score
        total_score = min(total_score, 100)
        
        # Classification
        if total_score <= 30:
            level = RiskLevel.LOW
        elif total_score <= 60:
            level = RiskLevel.MODERATE
        else:
            level = RiskLevel.HIGH
        
        return total_score, level, {
            "vitals_contribution": vitals_score,
            "bmi_contribution": bmi_score,
            "symptoms_contribution": symptoms_score,
            "demographics_contribution": demographics_score,
            "lifestyle_contribution": lifestyle_score
        }
    
    @staticmethod
    def get_clinical_recommendation(risk_level: RiskLevel, findings: List[str]) -> str:
        """
        Generate safe, non-diagnostic recommendations.
        """
        recommendations = {
            RiskLevel.LOW: "Continue routine monitoring. Schedule regular physician checkup.",
            RiskLevel.MODERATE: "Schedule a physician consultation within 24-48 hours. Monitor vitals.",
            RiskLevel.HIGH: "Seek immediate medical evaluation. Consider emergency assessment if symptoms worsen."
        }
        
        return recommendations.get(risk_level, "Consult with healthcare provider")

