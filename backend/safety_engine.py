"""
Safety Engine - Clinical Safety Checks
For physician review only
"""

def check_vital_safety(vitals: dict) -> list:
    """Check vital signs for safety concerns"""
    alerts = []
    
    # Blood Pressure
    if "bp" in vitals:
        bp = vitals["bp"]
        try:
            systolic, diastolic = map(int, bp.split('/'))
            if systolic > 180 or diastolic > 120:
                alerts.append({
                    "severity": "CRITICAL",
                    "parameter": "Blood Pressure",
                    "value": bp,
                    "message": "Hypertensive crisis - Immediate physician review required"
                })
            elif systolic < 90 or diastolic < 60:
                alerts.append({
                    "severity": "HIGH",
                    "parameter": "Blood Pressure",
                    "value": bp,
                    "message": "Hypotension detected - Monitor closely"
                })
        except:
            pass
    
    # Heart Rate
    if "hr" in vitals:
        hr = int(vitals["hr"])
        if hr > 120:
            alerts.append({
                "severity": "HIGH",
                "parameter": "Heart Rate",
                "value": hr,
                "message": "Tachycardia - Evaluate for underlying cause"
            })
        elif hr < 50:
            alerts.append({
                "severity": "HIGH",
                "parameter": "Heart Rate",
                "value": hr,
                "message": "Bradycardia - Assess patient status"
            })
    
    # Oxygen Saturation
    if "spo2" in vitals:
        spo2 = int(vitals["spo2"])
        if spo2 < 90:
            alerts.append({
                "severity": "CRITICAL",
                "parameter": "SpO2",
                "value": spo2,
                "message": "Severe hypoxemia - Immediate intervention required"
            })
        elif spo2 < 94:
            alerts.append({
                "severity": "HIGH",
                "parameter": "SpO2",
                "value": spo2,
                "message": "Hypoxemia - Supplemental oxygen may be needed"
            })
    
    # Temperature
    if "temp" in vitals:
        temp = float(vitals["temp"])
        if temp > 38.5:
            alerts.append({
                "severity": "MEDIUM",
                "parameter": "Temperature",
                "value": temp,
                "message": "Fever detected - Evaluate for infection"
            })
        elif temp < 36.0:
            alerts.append({
                "severity": "MEDIUM",
                "parameter": "Temperature",
                "value": temp,
                "message": "Hypothermia - Assess patient condition"
            })
    
    return alerts

def check_lab_safety(lab_results: list) -> list:
    """Check lab results for safety concerns"""
    alerts = []
    
    for lab in lab_results:
        test_name = lab.get("test_name", "").lower()
        value = lab.get("value", 0)
        status = lab.get("status", "").upper()
        
        # Critical lab values
        if status in ["CRITICAL", "PANIC"]:
            alerts.append({
                "severity": "CRITICAL",
                "test": lab.get("test_name"),
                "value": f"{value} {lab.get('unit')}",
                "message": f"Critical lab value - Immediate physician review required"
            })
        
        # Specific lab checks
        if "glucose" in test_name:
            if value > 400:
                alerts.append({
                    "severity": "CRITICAL",
                    "test": "Glucose",
                    "value": value,
                    "message": "Severe hyperglycemia - Risk of DKA"
                })
            elif value < 70:
                alerts.append({
                    "severity": "HIGH",
                    "test": "Glucose",
                    "value": value,
                    "message": "Hypoglycemia - Immediate treatment needed"
                })
        
        if "potassium" in test_name or "k" == test_name:
            if value > 6.0:
                alerts.append({
                    "severity": "CRITICAL",
                    "test": "Potassium",
                    "value": value,
                    "message": "Severe hyperkalemia - Cardiac risk"
                })
            elif value < 3.0:
                alerts.append({
                    "severity": "HIGH",
                    "test": "Potassium",
                    "value": value,
                    "message": "Severe hypokalemia - Arrhythmia risk"
                })
        
        if "creatinine" in test_name:
            if value > 3.0:
                alerts.append({
                    "severity": "HIGH",
                    "test": "Creatinine",
                    "value": value,
                    "message": "Severe renal impairment - Adjust medications"
                })
    
    return alerts

def check_drug_interactions(medications: list) -> list:
    """Check for drug interactions"""
    alerts = []
    
    # Simple drug interaction database
    interactions = {
        ("warfarin", "aspirin"): {
            "severity": "HIGH",
            "message": "Increased bleeding risk - Monitor INR closely"
        },
        ("warfarin", "ibuprofen"): {
            "severity": "HIGH",
            "message": "Increased bleeding risk - Consider alternative pain management"
        },
        ("lisinopril", "spironolactone"): {
            "severity": "HIGH",
            "message": "Risk of hyperkalemia - Monitor potassium levels"
        },
        ("metformin", "contrast"): {
            "severity": "HIGH",
            "message": "Risk of lactic acidosis - Hold metformin before contrast"
        },
        ("simvastatin", "clarithromycin"): {
            "severity": "CRITICAL",
            "message": "Risk of rhabdomyolysis - Contraindicated combination"
        }
    }
    
    # Extract drug names
    drug_names = [med.get("name", "").lower() for med in medications]
    
    # Check for interactions
    for i, drug1 in enumerate(drug_names):
        for drug2 in drug_names[i+1:]:
            # Check both directions
            interaction = interactions.get((drug1, drug2)) or interactions.get((drug2, drug1))
            
            if interaction:
                alerts.append({
                    "severity": interaction["severity"],
                    "drugs": f"{drug1.title()} + {drug2.title()}",
                    "message": interaction["message"]
                })
    
    return alerts
