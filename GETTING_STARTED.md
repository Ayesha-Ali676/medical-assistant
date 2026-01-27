# 🚀 Getting Started - MedAssist v2.0

**Read this first!** Quick setup guide for the dataset-free clinical assessment system.

---

## ⏱️ 5-Minute Setup

### Step 1️⃣: Add Gemini API Key
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key
4. Open `.env` file in project root
5. Replace `your-gemini-api-key-here` with your key
6. Save file

**That's it!** System is configured.

### Step 2️⃣: Start Services
```bash
.\start.bat
```

Wait for output:
```
[1/2] Starting Backend API (FastAPI)...
[2/2] Starting Frontend Dashboard (React)...
========================================
  Frontend:     http://localhost:5173
  Backend API:  http://localhost:8000
  API Docs:     http://localhost:8000/docs
========================================
```

### Step 3️⃣: Open System
Click or visit: http://localhost:5173

---

## 📋 What You Get

### Backend API (http://localhost:8000)

**New Endpoints**:
- `POST /clinical-assessment` - Real-time risk assessment
- `POST /analyze-patient` - Comprehensive analysis
- `GET /health` - System status
- `GET /docs` - Interactive API documentation

### Frontend Dashboard (http://localhost:5173)

**Features**:
- Real-time patient data entry
- Risk level display (color-coded)
- Clinical explanations
- Multi-patient management
- Professional medical UI

---

## 🧪 Quick Test

### Test 1: Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "MedAssist Backend",
  "version": "2.0.0"
}
```

### Test 2: Clinical Assessment
```bash
curl -X POST http://localhost:8000/clinical-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "vitals": {"bp": "140/90", "hr": 88, "spo2": 97, "temp": 36.5},
    "symptoms": [],
    "age": 45,
    "gender": "M",
    "medical_history": []
  }'
```

Expected response:
```json
{
  "success": true,
  "assessment": {
    "score": 8,
    "level": "Low Risk (0-30)",
    "recommendation": "Continue routine monitoring..."
  }
}
```

---

## 🎯 Next Steps

### 1. Explore the API
Visit: http://localhost:8000/docs
- Try each endpoint
- See example responses
- Test with your data

### 2. Understand the System
Read: `docs/ARCHITECTURE_DATASET_FREE.md`
- How rules work
- How scoring works
- How AI reasoning works

### 3. Try Different Scenarios
Test with different patient profiles:
- ✅ Low-risk patient (normal vitals, no symptoms)
- ✅ Moderate-risk patient (slightly elevated BP, minor symptoms)
- ✅ High-risk patient (critical findings, urgent symptoms)

### 4. Build Your Demo
- Create 3-4 compelling patient scenarios
- Show how risk scores reflect clinical reality
- Demonstrate clinical explanations

---

## 📊 Understanding Risk Scores

### Risk Levels

| Score | Level | Color | What It Means |
|-------|-------|-------|---------------|
| 0-30 | Low | 🟢 | Continue routine monitoring |
| 31-60 | Moderate | 🟡 | Schedule physician visit in 24-48h |
| 61-100 | High | 🔴 | Seek immediate medical evaluation |

### What Affects Score

**Vitals** (0-40 points max)
- BP, HR, SpO2, Temperature

**Symptoms** (0-35 points max)
- Acute symptoms
- Critical combinations

**Demographics** (0-25 points max)
- Age (75+ = higher)
- Chronic diseases
- Medical history

---

## 🔍 Key Features

✅ **Real-Time**: Uses current vitals only (NO historical data)
✅ **Deterministic**: All rules visible and explainable
✅ **Transparent**: See exactly why score is X
✅ **AI-Enhanced**: Gemini explains findings
✅ **Safe**: Only recommends "call doctor" levels
✅ **Professional**: Hospital-grade interface

---

## ⚠️ Important Notes

1. **NOT a Diagnostic Tool**: Cannot diagnose diseases
2. **Physician Review Only**: All findings need doctor validation
3. **Decision Support**: Helps physicians decide, doesn't replace them
4. **Real-Time Only**: Uses current data, not predictions
5. **No ML Training**: No historical datasets used
6. **For Development**: Current version for testing/demo

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `start.bat` fails | Check `.env` file exists and has GEMINI_API_KEY |
| Port already in use | Change port in `start.bat` or stop other services |
| API returns 500 error | Check backend logs, ensure Gemini key is valid |
| Frontend blank | Wait 10s for React to compile, refresh browser |
| `Connection refused` | Ensure services started with `start.bat` |

---

## 📚 Documentation Map

**Start Here**:
- `README.md` - Project overview
- `GETTING_STARTED.md` - This file

**Understand Architecture**:
- `docs/ARCHITECTURE_DATASET_FREE.md` - Complete system design
- `docs/ASSESSMENT_WORKFLOW.md` - How assessment works

**Use the API**:
- `docs/API_REFERENCE.md` - All endpoints
- `http://localhost:8000/docs` - Interactive docs

**See Examples**:
- `docs/COMPLETION_SUMMARY.md` - What was implemented

---

## 💡 Example Workflows

### Workflow 1: Quick Assessment
```
1. Enter patient vitals (1 minute)
2. System calculates risk (instant)
3. Physician reviews results (<1 minute)
4. Doctor makes decision (variable)
```

### Workflow 2: Multi-Patient Triage
```
1. Multiple patients in queue
2. Each gets instant risk score
3. Physician prioritizes by risk level
4. Critical patients flagged for immediate attention
```

### Workflow 3: Monitoring Over Time
```
1. Same patient, different times
2. Compare risk trends
3. Track vital sign improvements/deterioration
4. Alert if sudden change
```

---

## 🏆 Demo Talking Points

If presenting this system:

**"What makes this different?"**
- No datasets required (clean room approach)
- Real-time assessment (no ML inference)
- Completely transparent (all rules visible)
- AI for explanation (not prediction)
- Physician-focused (not diagnostic)

**"Why is this valuable?"**
- Safe: can't recommend treatment
- Ethical: no privacy concerns
- Fast: instant assessment
- Scalable: no ML model retraining
- Auditable: all decisions explainable

**"What's it good for?"**
- Clinical triage
- Decision support
- Risk identification
- Patient monitoring
- Emergency alerting

**"What's it NOT?"**
- Not a diagnosis system
- Not a treatment recommender
- Not a replacement for doctors
- Not a clinical EHR
- Not predictive analytics

---

## 🎓 Learning Resources

**Understanding Clinical Rules**:
→ Open `backend/clinical_rules_engine.py` (fully commented)

**Understanding Risk Scoring**:
→ Open `backend/risk_assessment.py` (fully commented)

**Understanding the Flow**:
→ Read `docs/ASSESSMENT_WORKFLOW.md`

**Understanding the API**:
→ Visit `http://localhost:8000/docs`

---

## 🚀 Ready?

1. ✅ Setup complete?
2. ✅ Gemini API key added?
3. ✅ Services running?
4. ✅ Can access http://localhost:5173?

**Then you're ready!** Start exploring the system.

---

## 📞 Support

**Issue with startup?**
- Check `.env` file exists
- Verify GEMINI_API_KEY is set
- Check ports 8000 and 5173 are free

**Issue with assessment?**
- Try example in API docs
- Check vitals format (e.g., "140/90" for BP)
- Check Gemini API key is valid

**Want to understand the system better?**
- Read the docs in `/docs` folder
- Check code comments in `/backend`
- Try different patient scenarios

---

## 📋 Checklist

Before you start:
- [ ] `.env` file exists in project root
- [ ] `GEMINI_API_KEY` is set in `.env`
- [ ] Python installed (3.8+)
- [ ] Node.js installed (optional, for frontend)
- [ ] Ports 8000 and 5173 are free

Ready to go?
- [ ] `start.bat` executed
- [ ] Services started successfully
- [ ] Frontend loads at http://localhost:5173
- [ ] API docs load at http://localhost:8000/docs

---

**You're all set! 🎉**

Start with the API at http://localhost:8000/docs or the frontend at http://localhost:5173

Happy testing!
