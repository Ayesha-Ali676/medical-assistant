# 🚀 QUICK START - Add Patient Feature

## ⚡ 60-Second Setup

### Terminal 1: Start Backend
```powershell
cd f:\snowfest\medical-assistant\backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Start Frontend
```powershell
cd f:\snowfest\medical-assistant\frontend
npm run dev
```

### Terminal 3: Open Browser
```
http://localhost:5173
```

---

## 📝 Add First Patient (30 seconds)

1. **Click** "Add Patient" button (top right)
2. **Fill Required Fields:**
   - Name: `Jane Doe`
   - Age: `52`
   - Gender: `Female`
   - Chief Complaint: `High blood pressure`
3. **Vitals** (optional - defaults provided):
   - BP: `145/92`
   - HR: `88`
   - Others: Accept defaults
4. **Click** "Save Patient Record"
5. **Done!** ✅ Patient appears in dashboard with AI analysis

---

## 🎯 What Happens Next

### Automatically:
```
✅ Patient data saved to database
✅ Clinical risk score calculated (0-100)
✅ AI generates clinical summary
✅ Lab alerts identified
✅ Patient appears in list with priority badge
```

### You See:
- **Left panel:** Patient in list with priority
- **Center panel:** Full patient details + AI summary
- **Right panel:** Lab alerts + clinical recommendations

---

## 🧪 Test Cases (Try These!)

### Test 1: Healthy Patient (30 seconds)
```
Name: John Healthy | Age: 40 | Gender: Male
Chief Complaint: Routine physical
All vitals normal → GREEN (LOW RISK)
```

### Test 2: Elevated Risk (1 minute)
```
Name: Sarah Risk | Age: 55 | Gender: Female
Chief Complaint: High blood pressure
BP: 160/100, HR: 95, Glucose: 180 (add lab)
→ YELLOW (MODERATE RISK)
```

### Test 3: Critical (1 minute)
```
Name: Michael Critical | Age: 72 | Gender: Male
Chief Complaint: Chest pain, shortness of breath
BP: 180/110, HR: 110, SpO₂: 87, Temp: 39
→ RED (CRITICAL RISK)
```

---

## 📊 Form Sections

| Section | Fields | Required? |
|---------|--------|-----------|
| **Demographics** | Name, Age, Gender | ✅ YES |
| **Complaint** | Chief Complaint | ✅ YES |
| **Vitals** | BP, HR, Temp, SpO₂, RR | ⚠️ Optional (defaults) |
| **Labs** | Add multiple (+ button) | ❌ NO |
| **Medications** | Add multiple (+ button) | ❌ NO |
| **History** | Conditions, Allergies | ❌ NO |
| **Lifestyle** | Smoking, Activity, Sleep, Diet | ❌ NO |

---

## ✨ Features

✅ Add unlimited labs with add/remove  
✅ Add unlimited medications with add/remove  
✅ Real-time clinical risk scoring  
✅ AI-powered summaries (Gemini)  
✅ Abnormal lab alerts (color-coded)  
✅ Patient list with priorities  
✅ Error boundary for crash recovery  
✅ Data persists on refresh  

---

## 🐛 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| Form won't open | Click "Add Patient" button in header |
| Save fails | Fill Name, Age, Gender, Chief Complaint |
| Backend error | Run `python -m uvicorn main:app --reload` |
| Patient doesn't appear | Refresh page (Ctrl+F5) |
| AI summary pending | Check internet, Gemini API key in .env |
| Blank screen | Open F12 console, check for errors |

---

## 📚 Documentation

- **ADD_PATIENT_GUIDE.md** — Full detailed guide
- **COMPLETE_WORKFLOW.md** — System architecture
- **IMPLEMENTATION_SUMMARY.md** — What was added
- **TESTING_GUIDE.md** — Test procedures

---

## 🎉 You're Ready!

Your clinical decision support system is **FULLY OPERATIONAL** ✅

Start adding patients and exploring the system!

---

**Questions?** See the docs folder for comprehensive guides.

