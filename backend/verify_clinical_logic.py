import requests
import json

def test_risk_logic():
    url = "http://127.0.0.1:8000/analyze-patient"
    data = {
        "age": 65,
        "gender": "Male",
        "chief_complaint": "Persistent cough and severe chest pain",
        "vitals": {
            "bp": "190/130",   # Critical BP
            "hr": "100",
            "temp": "38.5",    # Fever
            "spo2": "88",      # Critical SpO2
            "bmi": "42"        # Critical BMI
        },
        "symptoms": ["chest pain", "cough", "shortness of breath"],
        "medical_history": ["hypertension", "diabetes"],
        "lifestyle": {
            "smoking": "Current",
            "activity_level": "Sedentary",
            "diet_quality": "Poor",
            "sleep_hours": "5"
        }
    }
    
    try:
        response = requests.post(url, json=data, timeout=20)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        
        assessment = result.get("clinical_assessment", {})
        print("\n--- Clinical Assessment ---")
        print(f"Score: {assessment.get('score')}")
        print(f"Level: {assessment.get('level')}")
        
        print("\n--- Findings ---")
        findings = assessment.get("findings", {})
        for category, list_of_findings in findings.items():
            print(f"{category.upper()}:")
            for f in list_of_findings:
                print(f"  - {f}")
        
        print(f"\nImmediate Attention Needed: {assessment.get('requires_immediate_attention')}")
        
        workflow = result.get("workflow", {})
        print(f"Workflow Risk Level: {workflow.get('risk_level')}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_risk_logic()
