# 🏥 MedAssist Clinical Decision Support System

A professional, hospital-grade clinical decision support system with **Gemini AI integration** and a doctor-friendly interface designed for real-world clinical workflows.

**🎉 VERSION 2.0 - DATASET-FREE REAL-TIME ASSESSMENT**  
Real-time clinical risk evaluation using deterministic rules + AI reasoning (NO ML training required)

## 🚨 Important Clinical Disclaimer

**This system is for physician review only. It does not diagnose diseases, prescribe treatments, or replace clinical judgment. All outputs are assistive and require physician validation.**

---

## ✨ What's New - Version 2.0: Dataset-Free Clinical Assessment

Your MedAssist has been upgraded to a **real-time, dataset-free clinical decision support system**:

✅ **Clinical Rule Engine** - Deterministic rules (no ML models)  
✅ **Real-Time Risk Scoring** - 0-100 scale with transparent factors  
✅ **Deterministic Rules** - Fully explainable medical guidelines  
✅ **AI Interpretation** - Gemini for clinical explanation  
✅ **Safe Recommendations** - Non-diagnostic decision support  
✅ **No Historical Datasets** - Uses only current patient input  

**See**: [ARCHITECTURE_DATASET_FREE.md](docs/ARCHITECTURE_DATASET_FREE.md) for complete details

---

## 🚀 Quick Start (3 Steps)

### 1. Add Your Gemini API Key
Edit `.env` file and add:
```env
GEMINI_API_KEY=your-key-here
```
Get free API key: https://makersuite.google.com/app/apikey

### 2. Start the Application
```bash
start.bat
```

### 3. Open Your Browser
```
http://localhost:5173
```

**That's it!** Your clinical workstation is ready.

---

## 🏗️ How It Works (New Architecture)

## 🏗️ How It Works (New Architecture)

### 5-Layer Clinical Decision Support

```
┌─────────────────────────────────────────┐
│ 1. DATA INPUT (Real-Time Patient Data)  │
│    - Vitals, symptoms, demographics     │
│    - NO historical datasets             │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ 2. CLINICAL RULES (Deterministic)       │
│    - BP, SpO2, HR, symptoms, age        │
│    - Transparent medical guidelines     │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ 3. RISK SCORING (Logic-Based)           │
│    - 0-100 scale with weights           │
│    - Contribution breakdown             │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ 4. AI REASONING (Gemini)                │
│    - Explain risk factors               │
│    - Generate clinical narrative        │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ 5. OUTPUT (Safe & Ethical)              │
│    - Risk level (0-100)                 │
│    - Recommendation level               │
│    - Physician review required          │
└─────────────────────────────────────────┘
```

### Risk Levels

- 🟢 **Low Risk (0-30)**: Continue routine monitoring
- 🟡 **Moderate Risk (31-60)**: Schedule physician visit in 24-48h
- 🔴 **High Risk (61-100)**: Seek immediate medical evaluation

---

## 📊 Example Assessment

**Input**:
```json
{
  "vitals": {"bp": "160/100", "hr": 95, "spo2": 95, "temp": 37.5},
  "symptoms": ["headache", "fatigue"],
  "age": 55,
  "gender": "M",
  "medical_history": ["hypertension"]
}
```

**Output**:
```json
{
  "score": 48,
  "level": "🟡 Moderate Risk (31-60)",
  "recommendation": "Schedule physician consultation within 24-48 hours",
  "explanation": "Primary risk drivers: elevated BP and chronic conditions. Overall risk profile is moderate."
}
```

---

## 🎨 Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: MedAssist Clinical Decision Support                │
└─────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────┬───────────────┐
│ PRIORITY │     PATIENT DETAIL VIEW         │  LAB ALERTS   │
│ PATIENTS │                                 │               │
│          │  • Patient Header               │  • Abnormal   │
│  🔴 P001 │  • Chief Complaint              │    Labs Only  │
│  🟠 P002 │  • AI Summary (Blue Box)        │               │
│  🟢 P003 │  • Vitals Grid                  │  🔴 Critical  │
│  🟢 P004 │  • Medical History              │  🟠 High      │
│  🟢 P005 │  • Medications                  │               │
│          │  • Allergies                    │  Suggestions  │
└──────────┴─────────────────────────────────┴───────────────┘
```

**See**: [VISUAL_PREVIEW.md](VISUAL_PREVIEW.md) for detailed mockups

---

## 📖 Documentation

### Essential Guides

- **[NEW_UI_GUIDE.md](NEW_UI_GUIDE.md)** ⭐ - New professional UI overview
- **[READY_FOR_DEMO.md](READY_FOR_DEMO.md)** ⭐ - Hackathon demo guide
- **[UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md)** - Complete design specifications
- **[VISUAL_PREVIEW.md](VISUAL_PREVIEW.md)** - Interface mockups
- **[FINAL_SETUP.md](FINAL_SETUP.md)** - Backend setup & testing
- **[SIMPLE_SETUP.md](SIMPLE_SETUP.md)** - Simplified setup guide

---

## 🏗️ Simplified Architecture

### Current Stack (Simplified)
```
Frontend (React) → Backend (FastAPI) → Gemini AI
```

### Core Components
- **Frontend**: Professional clinical workstation UI (React)
- **Backend**: FastAPI with Gemini AI integration
- **Data**: JSON-based patient records
- **AI**: Google Gemini for clinical summaries

### What Was Simplified
- ❌ Removed: PostgreSQL, MongoDB, Redis, InfluxDB
- ❌ Removed: JWT authentication
- ❌ Removed: OpenAI API
- ❌ Removed: Microservices architecture
- ✅ Kept: Gemini AI, React frontend, FastAPI backend

---

## 🎯 Key Features

### Professional UI Design
✅ **Color-Coded Priority System**
- 🔴 Critical - Immediate attention
- 🟠 High - Review soon
- 🟢 Normal - Routine

✅ **AI Clinical Summaries**
- Gemini-powered narratives
- Confidence indicators
- Urgency scores (1-10)
- Clear disclaimers

✅ **Lab Alerts Panel**
- Only shows abnormal values
- Trend indicators (↑ ↓)
- Color-coded by severity
- Reference ranges

✅ **Doctor-Friendly Design**
- Reduces cognitive load
- Rapid information scanning
- Clean, professional appearance
- No distracting animations

### Clinical Safety
✅ "For physician review only" disclaimers  
✅ Confidence indicators on AI content  
✅ Manual override capability  
✅ Clear alert system  

### AI Integration
✅ Gemini AI clinical summaries  
✅ Safety checks (vitals, labs, medications)  
✅ ML-based risk scoring  
✅ Drug interaction detection  

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |

---

## 🛠️ Common Commands

```bash
# Start application
start.bat

# Access frontend
http://localhost:5173

# Access backend API docs
http://localhost:8000/docs

# Test patients endpoint
http://localhost:8000/patients
```

---

## 📁 Simplified Project Structure

```
medassist/
├── frontend/              # React Clinical Workstation
│   ├── src/
│   │   ├── App.jsx       # Main application
│   │   ├── App.css       # Component styles
│   │   └── index.css     # Design system
│   └── package.json
│
├── backend/               # FastAPI Backend
│   ├── main.py           # API endpoints
│   ├── ai_service.py     # Gemini AI integration
│   ├── safety_engine.py  # Safety checks
│   ├── ml_service.py     # Risk scoring
│   └── models.py         # Data models
│
├── data/                  # Patient Data
│   └── patients.json     # 5 sample patients
│
├── .env                   # Configuration
├── start.bat              # Quick start script
│
└── Documentation/
    ├── NEW_UI_GUIDE.md           # UI overview
    ├── READY_FOR_DEMO.md         # Demo guide
    ├── UI_DESIGN_SYSTEM.md       # Design specs
    ├── VISUAL_PREVIEW.md         # Mockups
    └── FINAL_SETUP.md            # Setup guide
```

---

## 🎨 Design System

### Color Palette

**Medical Blue** (Trust & Professionalism)
```
Primary: #1E3A5F
Accent:  #4B7BA7
```

**Status Colors** (Muted & Clinical)
```
Critical: #B91C1C (muted red)
Warning:  #D97706 (amber)
Normal:   #059669 (soft green)
```

**Typography**
```
Font: Inter (professional, readable)
H1: 24px / Bold - Patient names
H2: 18px / Bold - Section headers
Body: 14px / Regular - Content
```

**See**: [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) for complete specifications

---

## 🧪 Sample Patients

Your system includes **5 sample patients**:

1. **P001 - John Smith** (65M) - 🔴 CRITICAL
   - Chest pain, elevated glucose, hypertension

2. **P002 - Sarah Johnson** (52F) - 🟠 HIGH
   - Persistent cough, fever, elevated WBC

3. **P003 - Michael Chen** (78M) - 🔴 CRITICAL
   - Dizziness, low hemoglobin, high potassium

4. **P004 - Emily Rodriguez** (45F) - 🟠 HIGH
   - Severe headache, hypertensive crisis

5. **P005 - Robert Williams** (58M) - 🔴 CRITICAL
   - Abdominal pain, critical lipase

---

## 🎯 Hackathon Demo Tips

### What to Highlight

1. **Professional Design**
   - "Hospital-grade interface, not a consumer app"

2. **Priority System**
   - "Color-coded triage for immediate awareness"

3. **AI Integration**
   - "Gemini AI generates clinical summaries"

4. **Clinical Safety**
   - "Clear disclaimers on all AI content"

5. **Lab Alerts**
   - "Only shows abnormal values - no information overload"

### Demo Flow (2 minutes)

```
1. Show priority patient list (15s)
2. Click P001 - high priority (20s)
3. Highlight AI summary (20s)
4. Show lab alerts panel (20s)
5. Point out professional design (20s)
6. Mention clinical safety (15s)
7. Q&A (30s)
```

**See**: [READY_FOR_DEMO.md](READY_FOR_DEMO.md) for complete demo guide

---

## 🆘 Troubleshooting

### UI Issues

**Issue**: UI looks broken  
**Solution**: Clear browser cache (Ctrl + Shift + R)

**Issue**: No patients showing  
**Solution**: Check backend at http://localhost:8000/patients

**Issue**: AI summary not loading  
**Solution**: Check Gemini API key in `backend/.env`

### Backend Issues

**Issue**: Import errors  
**Solution**: `pip install fastapi uvicorn python-dotenv google-generativeai`

**Issue**: Port 8000 in use  
**Solution**: 
```bash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

**See**: [FINAL_SETUP.md](FINAL_SETUP.md) for more troubleshooting

---

## 📞 Support & Documentation

- **UI Guide**: [NEW_UI_GUIDE.md](NEW_UI_GUIDE.md)
- **Demo Guide**: [READY_FOR_DEMO.md](READY_FOR_DEMO.md)
- **Design System**: [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md)
- **Setup Guide**: [FINAL_SETUP.md](FINAL_SETUP.md)
- **API Docs**: http://localhost:8000/docs

---

## 🎉 What Makes MedAssist Great

### For Physicians
✅ **Rapid Scanning** - Color-coded priorities  
✅ **Reduced Cognitive Load** - Clean, minimal interface  
✅ **Critical Info Stands Out** - Red abnormal values  
✅ **Professional** - Hospital-grade appearance  

### For Hackathon Judges
✅ **Realistic** - Looks like real hospital software  
✅ **Attention to Detail** - Thoughtful design decisions  
✅ **Clinical Safety** - Disclaimers, confidence indicators  
✅ **Impressive** - Enterprise-grade quality  

---

## 🚀 Ready for Demo

Your MedAssist Clinical Workstation is:

✅ **Professional** - Hospital-grade design  
✅ **Functional** - All features working  
✅ **Safe** - Clinical disclaimers included  
✅ **Impressive** - Attention to detail  
✅ **Ready** - Demo-ready interface  

**Start now**: `start.bat` → http://localhost:5173

---

## 📝 License

Proprietary - MedAssist Clinical Decision Support System  
**For physician review only - Not for diagnostic use**

---

**Clinical Disclaimer**: This system assists licensed physicians in clinical decision-making but does not replace professional medical judgment. All recommendations require physician review and validation.

---

**Version**: 2.0 - Professional Clinical Workstation  
**Status**: ✅ Ready for Demo  
**Date**: January 25, 2026