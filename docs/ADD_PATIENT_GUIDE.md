# How to Add a Patient to the Dashboard

## Overview

The **MedAssist Clinical Decision Support System** allows physicians to add patient records in real-time using the web interface. When you add a patient, the system immediately:

1. **Stores the patient data** in the database
2. **Performs clinical risk assessment** using deterministic rules
3. **Calculates risk scores** (0-100)
4. **Generates AI-powered clinical summary** using Google Gemini
5. **Displays alerts** for abnormal vitals and lab results

---

## Step-by-Step: Adding a Patient

### 1. **Navigate to the Dashboard**
- Open http://localhost:5173 in your browser
- You should see the clinical workstation with an existing patient list

### 2. **Click "Add Patient" Button**
- In the top navigation bar, click the **"Add Patient"** button
- The form will expand showing a comprehensive patient data entry form

### 3. **Fill in Patient Demographics**

| Field | Example | Required |
|-------|---------|----------|
| **Full Name** | Jane Doe | ✅ Yes |
| **Age** | 52 | ✅ Yes |
| **Gender** | Female | ✅ Yes |
| **Chief Complaint** | Elevated blood pressure and fatigue | ✅ Yes |

### 4. **Enter Vital Signs**

Record the patient's current vital signs:

| Field | Example | Unit |
|-------|---------|------|
| **Blood Pressure** | 145/92 | mmHg |
| **Heart Rate** | 88 | bpm |
| **Temperature** | 37.5 | °C |
| **SpO₂ (Oxygen)** | 96 | % |
| **Respiratory Rate** | 16 | /min |

> **Tip:** The system analyzes these vitals against clinical thresholds. Abnormal values trigger alerts.

### 5. **Add Lab Results** (Optional)

Click "**+ Add Lab Result**" to add lab test values:

| Field | Example | Purpose |
|-------|---------|---------|
| **Test Name** | Glucose | Type of test |
| **Value** | 156 | Numeric result |
| **Unit** | mg/dL | Measurement unit |
| **Reference Range** | 70-100 | Normal range |
| **Status** | High | Normal / High / Low / Critical |

**Common Lab Tests:**
- Glucose (mg/dL) — Normal: 70-100
- HbA1c (%) — Normal: <5.7
- Creatinine (mg/dL) — Normal: 0.7-1.3
- Potassium (mEq/L) — Normal: 3.5-5.0
- Sodium (mEq/L) — Normal: 136-145
- HDL Cholesterol (mg/dL) — Normal: >40
- LDL Cholesterol (mg/dL) — Normal: <100
- Triglycerides (mg/dL) — Normal: <150

**Remove a lab result:** Click the trash icon next to any result

### 6. **Add Current Medications** (Optional)

Click "**+ Add Medication**" to record active medications:

| Field | Example |
|-------|---------|
| **Medication Name** | Metformin |
| **Dose** | 500mg |
| **Frequency** | Twice daily |

**Common Medications by Condition:**
- **Hypertension:** Lisinopril, Amlodipine, Metoprolol
- **Diabetes:** Metformin, Glipizide, Insulin
- **Heart Disease:** Aspirin, Atorvastatin, Nitroglycerin
- **Respiratory:** Albuterol, Fluticasone, Montelukast

**Remove a medication:** Click the trash icon next to any medication

### 7. **Add Medical History & Allergies** (Comma-Separated)

| Field | Example | Format |
|-------|---------|--------|
| **Medical History** | Diabetes, Hypertension, Asthma | Comma-separated |
| **Allergies** | Penicillin, Latex, Shellfish | Comma-separated |

### 8. **Fill in Lifestyle Information**

| Field | Options |
|-------|---------|
| **Smoking Status** | Non-smoker / Current smoker / Former smoker |
| **Activity Level** | Sedentary / Light / Moderate / Vigorous |
| **Sleep Hours/Night** | 0-24 (numeric) |
| **Diet Quality** | Poor / Fair / Good / Excellent |

### 9. **Save the Patient**

- Click the **"Save Patient Record"** button (bottom right)
- The system will:
  - ✅ Validate the form data
  - ✅ Send patient data to backend
  - ✅ Perform clinical risk assessment
  - ✅ Generate AI summary
  - ✅ Return to dashboard with the new patient selected

---

## What Happens After Saving

### 1. **Patient Added to List**
- Your new patient appears in the **left sidebar** patient list
- Sorted by priority (CRITICAL → HIGH → NORMAL)

### 2. **Clinical Risk Assessment Triggered**
The system analyzes:
- **Vital Signs Risk:** BP >160/100? SpO₂ <90? → High risk
- **Symptom Risk:** Critical combinations detected? → Alert
- **Demographics Risk:** Age + comorbidities? → Weighted score
- **Lab Risk:** Abnormal values? → Contributing factor

**Risk Scale:**
- **0-30:** Low Risk (GREEN)
- **31-60:** Moderate Risk (YELLOW)
- **61-100:** High Risk (RED)

### 3. **AI Clinical Summary Generated**
The system queries Google Gemini to:
- ✅ Explain why risk is elevated/moderate/low
- ✅ Identify contributing factors
- ✅ Suggest clinical considerations
- ✅ Generate non-diagnostic recommendations

**Example AI Summary:**
> "Patient presents with elevated blood pressure (145/92) and high glucose (156 mg/dL) consistent with uncontrolled hypertension and diabetes. Recommend urgent physician review for medication adjustment. Monitor for cardiovascular complications."

### 4. **Dashboard Updates**
- **Center Panel:** Shows complete patient profile with vitals, labs, medications, allergies, medical history
- **AI Summary Box:** Displays clinical narrative, key findings, urgency score
- **Lab Alerts Panel:** Highlights abnormal lab results (red for Critical, orange for High)
- **Clinical Considerations:** Provides actionable next steps

---

## Example Patient Scenarios

### Scenario 1: Diabetic with Hypertension

```
Name: John Smith | Age: 65 | Gender: Male
Chief Complaint: Routine checkup, elevated BP readings

Vitals:
  BP: 145/92 (HIGH)
  HR: 88
  Temp: 37.2
  SpO₂: 96
  RR: 18

Labs:
  Glucose: 156 mg/dL (HIGH)
  HbA1c: 7.8% (HIGH)
  Creatinine: 1.3 mg/dL (NORMAL)
  Potassium: 4.2 mEq/L (NORMAL)

Medical History: Diabetes Type 2, Hypertension
Medications: Metformin 500mg twice daily, Lisinopril 10mg daily
Allergies: None
Smoking: Former smoker
Activity: Light
Sleep: 6 hours/night
Diet: Fair

→ System Risk Score: 65/100 (HIGH)
→ Priority: HIGH
→ Recommendation: Schedule cardiology consult, optimize diabetes management
```

### Scenario 2: Acute Respiratory Infection

```
Name: Sarah Johnson | Age: 38 | Gender: Female
Chief Complaint: Cough, fever, shortness of breath

Vitals:
  BP: 130/80
  HR: 102 (HIGH)
  Temp: 39.2 (HIGH - fever)
  SpO₂: 91 (LOW)
  RR: 22 (HIGH)

Labs:
  WBC: 12,000 (HIGH)
  CRP: 8.5 (HIGH)
  Chest X-ray: Infiltrates present

Medical History: Asthma
Medications: Albuterol inhaler
Allergies: Sulfa drugs
Smoking: Non-smoker
Activity: Moderate
Sleep: 7 hours
Diet: Good

→ System Risk Score: 78/100 (CRITICAL)
→ Priority: CRITICAL
→ Recommendation: Urgent physician evaluation, consider hospitalization, respiratory support evaluation
```

### Scenario 3: Stable Patient

```
Name: Michael Chen | Age: 45 | Gender: Male
Chief Complaint: Annual physical

Vitals:
  BP: 120/78
  HR: 72
  Temp: 37.0
  SpO₂: 98
  RR: 16

Labs:
  Glucose: 95 mg/dL (NORMAL)
  HbA1c: 5.2% (NORMAL)
  Cholesterol: 180 (NORMAL)

Medical History: None
Medications: None
Allergies: None
Smoking: Non-smoker
Activity: Vigorous
Sleep: 8 hours
Diet: Excellent

→ System Risk Score: 12/100 (LOW)
→ Priority: NORMAL
→ Recommendation: Continue current lifestyle, routine follow-up in 12 months
```

---

## Data Structure (What Gets Saved)

When you save a patient, the system stores this JSON structure:

```json
{
  "patient_id": "P123",
  "name": "Jane Doe",
  "age": 52,
  "gender": "Female",
  "chief_complaint": "Elevated blood pressure",
  "vitals": {
    "bp": "145/92",
    "hr": "88",
    "temp": "37.5",
    "spo2": "96",
    "rr": "16"
  },
  "lab_results": [
    {
      "test_name": "Glucose",
      "value": 156,
      "unit": "mg/dL",
      "reference_range": "70-100",
      "status": "High"
    }
  ],
  "current_medications": [
    {
      "name": "Metformin",
      "dose": "500mg",
      "frequency": "twice daily"
    }
  ],
  "allergies": ["Penicillin"],
  "medical_history": ["Diabetes Type 2", "Hypertension"],
  "lifestyle": {
    "smoking": "No",
    "activity_level": "Moderate",
    "sleep_hours": "7",
    "diet_quality": "Good"
  }
}
```

---

## Troubleshooting

### Issue: "Failed to save patient record"
- ✅ Ensure backend is running: `python -m uvicorn main:app --reload`
- ✅ Check .env file has GEMINI_API_KEY set
- ✅ Verify browser console for error messages (F12)

### Issue: Patient doesn't appear in list
- ✅ Click "Add Patient" button again to refresh the list
- ✅ Check if patient ID conflicts with existing patient
- ✅ Look in browser console for API errors

### Issue: AI Summary shows "Pending"
- ✅ Gemini API key may be invalid
- ✅ Internet connection required for AI analysis
- ✅ Check backend logs for API errors

### Issue: Risk score seems wrong
- ✅ Clinical rules are deterministic (not ML)
- ✅ Check vital signs are entered correctly
- ✅ Review which rules triggered the score

---

## Clinical Risk Rules

The system uses these transparent, deterministic rules:

### Critical Vitals Thresholds
- **BP >180/120** → Hypertensive crisis (HIGH RISK)
- **BP >160/100** → Elevated (MODERATE RISK)
- **HR >120 or <50** → Arrhythmia risk
- **SpO₂ <90** → Respiratory risk
- **Temp >39°C** → Fever risk
- **RR >25** → Respiratory distress

### Lab Thresholds
- **Critical Status** → 35 points
- **High Status** → 20 points
- **Abnormal trend** → 10 points

### Age & Comorbidities
- **Age >60 + comorbidities** → +15 points
- **Age >70** → +10 points
- **Diabetes + Hypertension** → +10 points

---

## Safety Notes

⚠️ **This system is for physician review only:**
- NOT a replacement for medical diagnosis
- NOT for emergency situations (call 911)
- Requires physician interpretation
- Clinical assessment tool, not diagnostic tool

✅ **Best Practices:**
- Always verify patient information
- Cross-check AI recommendations with clinical judgment
- Monitor patient over time (same patient, different visits)
- Update vitals regularly for accurate trending

---

## Next Steps

After adding a patient:
1. **Review the AI Summary** in the center panel
2. **Check Lab Alerts** on the right panel for abnormal values
3. **Monitor Clinical Considerations** for recommended actions
4. **Add another patient** to compare risk profiles
5. **Track changes** by adding the same patient at different times

---

For more information, see:
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) — Complete system overview
- [QUICK_REFERENCE_CARD.md](QUICK_REFERENCE_CARD.md) — Vital thresholds & rules
- [TESTING_GUIDE.md](TESTING_GUIDE.md) — How to test the system

