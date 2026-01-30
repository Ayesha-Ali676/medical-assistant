import requests
import json
import sys

def test_soap():
    url = "http://127.0.0.1:8005/generate-soap-note"
    data = {
      "patient_name": "Test User",
      "age": 45,
      "gender": "F",
      "chief_complaint": "Persistent cough",
      "vitals": {
        "hr": 82,
        "bp": "120/80",
        "spo2": 98
      },
      "medical_history": ["Asthma"]
    }
    print(f"Sending request to {url}...")
    try:
        r = requests.post(url, json=data, timeout=30)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_soap()
