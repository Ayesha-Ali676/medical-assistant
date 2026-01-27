# 🏥 MedAssist Clinical Assessment API - Quick Reference

## 📍 Base URL
```
http://localhost:8000
```

## 🔑 Authentication
None required (for local development)

---

## 📊 Primary Endpoints

### 1. **Clinical Assessment** (NEW - Dataset-Free)
```
POST /clinical-assessment
Content-Type: application/json
```

**Purpose**: Real-time clinical risk assessment using deterministic rules

**Request Body**:
```json
{
  "vitals": {
    "bp": "140/90",        // Blood pressure (required)
    "hr": 88,              // Heart rate in bpm (optional)
    "spo2": 97,            // Oxygen saturation % (optional)
    "temp": 36.5           // Temperature in Celsius (optional)
  },
  "symptoms": [
    "headache",
    "fatigue"
  ],
  "age": 45,
  "gender": "M",
  "medical_history": [
    "hypertension",
    "diabetes"
  ],
  "medications": [
    "lisinopril 10mg",
    "metformin 500mg"
  ],
  "allergies": [
    "penicillin"
  ]
}
```

**Response (Success)**:
```json
{
  "success": true,
  "assessment": {
    "score": 48,
    "level": "Moderate Risk (31-60)",
    "findings": {
      "vitals": [
        "🟡 MODERATE: Stage 1 hypertension (BP 140-159/90-99)"
      ],
      "symptoms": [
        "🟡 MODERATE: Headache noted"
      ],
      "demographics": [
        "Chronic condition: Hypertension"
      ]
    },
    "contributing_factors": {
      "vitals_contribution": 8,
      "symptoms_contribution": 0,
      "demographics_contribution": 15
    },
    "recommendation": "Schedule a physician consultation within 24-48 hours. Monitor vitals.",
    "explanation": "Based on current patient state (age 45), the primary risk drivers are blood pressure elevation and chronic conditions. Overall risk profile is moderate. Close monitoring and timely physician evaluation are warranted.",
    "confidence": "High",
    "requires_immediate_attention": false
  },
  "disclaimer": "For physician review only. Not for diagnostic use."
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Missing required field: vitals",
  "disclaimer": "Assessment failed. Please consult physician directly."
}
```

---

### 2. **Comprehensive Patient Analysis**
```
POST /analyze-patient
Content-Type: application/json
```

**Purpose**: Complete analysis combining clinical rules, safety checks, and AI reasoning

**Request Body**: Same as `/clinical-assessment`

**Response**:
```json
{
  "clinical_assessment": {
    "score": 48,
    "level": "Moderate Risk (31-60)",
    // ... (same as clinical-assessment response)
  },
  "safety_alerts": {
    "vitals": [
      {
        "severity": "HIGH",
        "parameter": "Blood Pressure",
        "value": "160/100",
        "message": "Stage 2 hypertension - Evaluate for end-organ damage"
      }
    ],
    "labs": [],
    "medications": []
  },
  "ai_interpretation": {
    "clinical_narrative": "Patient presents with elevated blood pressure in the setting of known hypertension. Current vitals suggest suboptimal BP control.",
    // ... other AI fields
  },
  "workflow": {
    "requires_immediate_attention": false,
    "risk_level": "Moderate Risk (31-60)",
    "next_steps": "Schedule a physician consultation within 24-48 hours. Monitor vitals."
  },
  "disclaimer": "This is a decision support tool. All findings require physician validation. Not for diagnostic use."
}
```

---

### 3. **Get All Patients**
```
GET /patients
```

**Response**:
```json
[
  {
    "patient_id": "P001",
    "name": "John Doe",
    "age": 45,
    "gender": "M",
    // ... patient data
  },
  // ... more patients
]
```

---

### 4. **Create Patient**
```
POST /patients
Content-Type: application/json
```

**Request Body**:
```json
{
  "patient_id": "P006",
  "name": "Jane Smith",
  "age": 38,
  "gender": "F",
  "vitals": {"bp": "120/80", "hr": 72},
  "symptoms": [],
  "medical_history": []
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Patient added successfully",
  "patient_id": "P006"
}
```

---

### 5. **Health Check**
```
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "MedAssist Backend",
  "version": "2.0.0"
}
```

---

### 6. **API Documentation**
```
GET /docs
```
Opens interactive Swagger UI (http://localhost:8000/docs)

---

## 🎨 Risk Level Color Coding

| Level | Score | Color | Recommendation |
|-------|-------|-------|-----------------|
| 🟢 Low | 0-30 | Green | Continue routine monitoring |
| 🟡 Moderate | 31-60 | Yellow | Schedule physician visit within 24-48h |
| 🔴 High | 61-100 | Red | Seek immediate medical evaluation |

---

## 📋 Risk Scoring Breakdown

### Vital Signs Component (0-40 points)
- BP > 180/120: +25 (Hypertensive crisis)
- BP 160-179: +15 (Stage 2 hypertension)
- SpO2 < 90: +20 (Severe hypoxemia)
- HR > 130: +10 (Severe tachycardia)
- Temp > 39.5: +8 (Severe fever)

### Symptoms Component (0-35 points)
- Chest pain + SOB: +18 (Cardiac alert)
- Severe headache + confusion: +15 (Neuro alert)
- Difficulty breathing: +12 (Respiratory distress)
- Severe pain: +10 (Acute episode)

### Demographics Component (0-25 points)
- Age 75+: +8
- Heart disease: +8
- COPD/Asthma: +5-7
- Kidney disease: +7
- Diabetes: +6

---

## 🔍 Clinical Rules Documented

All rules are transparent and based on medical guidelines:

**Example Rules**:
```
IF SpO2 < 90 THEN "CRITICAL: Severe hypoxemia (+20 points)"
IF BP > 180/120 AND HR > 100 THEN "CRITICAL: Hypertensive crisis (+25 points)"
IF "chest pain" AND "shortness of breath" THEN "+18 risk points"
IF age >= 75 AND comorbidities THEN "elevated baseline risk"
```

---

## 💡 Usage Examples

### Example 1: Low-Risk Patient
```bash
curl -X POST http://localhost:8000/clinical-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "vitals": {"bp": "120/80", "hr": 72, "spo2": 98, "temp": 36.5},
    "symptoms": [],
    "age": 35,
    "gender": "F",
    "medical_history": []
  }'
```

**Result**: Score 10 → 🟢 Low Risk

### Example 2: High-Risk Patient
```bash
curl -X POST http://localhost:8000/clinical-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "vitals": {"bp": "190/110", "hr": 115, "spo2": 88, "temp": 38.5},
    "symptoms": ["chest pain", "shortness of breath"],
    "age": 68,
    "gender": "M",
    "medical_history": ["heart disease", "hypertension"]
  }'
```

**Result**: Score 92 → 🔴 High Risk (Requires Immediate Attention)

---

## ⚠️ Important Notes

1. **No Diagnosis**: This system does NOT diagnose diseases
2. **Physician Review Required**: All outputs must be reviewed by a physician
3. **Real-Time Only**: Uses current vitals/symptoms, NOT historical data
4. **Dataset-Free**: No machine learning model training involved
5. **Safe Recommendations**: Only suggests physician consultation levels
6. **Explainable**: All risk factors are transparent and documented

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Ensure backend is running: `.\start.bat` |
| Missing vitals field | BP is required, HR/SpO2/Temp optional |
| API returns 500 | Check logs for "ERROR in analyze_patient" |
| Gemini key error | Set `GEMINI_API_KEY` in `.env` file |

---

## 📚 Related Documentation

- **Full Architecture**: `docs/ARCHITECTURE_DATASET_FREE.md`
- **Backend Setup**: `docs/FINAL_SETUP.md`
- **Clinical Rules**: `backend/clinical_rules_engine.py`
- **Risk Scoring**: `backend/risk_assessment.py`

---

**Last Updated**: January 26, 2026  
**Version**: 2.0.0 - Dataset-Free Real-Time Assessment
