# 📊 System Workflow - MedAssist

Complete guide to understanding how MedAssist works and the user workflows.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│                    (React Frontend - Port 5173)              │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP/REST API
             │
┌────────────▼────────────────────────────────────────────────┐
│                      BACKEND API                             │
│                  (FastAPI - Port 8000)                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Patient    │  │   Emergency  │  │    Doctor    │     │
│  │  Management  │  │   Dashboard  │  │    Tools     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────┬────────────────────────────────────────────────┘
             │
             │ API Calls
             │
┌────────────▼────────────────────────────────────────────────┐
│                    GEMINI AI SERVICE                         │
│                  (Google Generative AI)                      │
│                                                              │
│  • Clinical Summaries                                        │
│  • Risk Assessment                                           │
│  • Medical Insights                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Workflows

### 1. Patient Management Workflow

**User Journey: Adding a New Patient**

```
START
  │
  ├─→ Click "➕ Add Patient" button
  │
  ├─→ Fill patient form:
  │   • Basic Info (Name, Age, Gender, MRN)
  │   • Chief Complaint
  │   • Vitals (BP, HR, SpO2, Temp)
  │   • Medical History
  │   • Current Medications
  │   • Allergies
  │
  ├─→ Click "Add Patient"
  │
  ├─→ Backend validates data
  │
  ├─→ Patient saved to database
  │
  ├─→ AI generates clinical summary
  │
  └─→ Patient appears in dashboard
END
```

**Data Flow:**
1. Frontend collects patient data
2. POST request to `/patients` endpoint
3. Backend validates and stores data
4. Gemini AI generates clinical summary
5. Response sent back to frontend
6. UI updates with new patient

---

### 2. Emergency Dashboard Workflow

**User Journey: Monitoring High-Risk Patient**

```
START
  │
  ├─→ Click "🚨 Emergency Alert" tab
  │
  ├─→ View patient overview:
  │   • Patient demographics
  │   • Chief complaint
  │   • Current vitals
  │
  ├─→ Monitor real-time vitals:
  │   • Heart Rate (with trend)
  │   • Blood Pressure
  │   • Oxygen Saturation
  │   • Temperature
  │
  ├─→ View Risk Vector Radar:
  │   • Cardiac risk
  │   • Respiratory risk
  │   • Medical history impact
  │   • AI-calculated risk
  │
  ├─→ Use Time Machine slider:
  │   • View historical vitals
  │   • Track trends over time
  │
  ├─→ Configure emergency contacts:
  │   • Doctor name & phone
  │   • Hospital name & phone
  │
  └─→ Take action based on risk level
END
```

**Features:**
- Real-time vital monitoring
- Risk visualization (radar chart)
- Historical data viewing
- Emergency contact management

---

### 3. Doctor Efficiency Tools Workflow

**User Journey: Using Quick Actions**

```
START
  │
  ├─→ Click "👨‍⚕️ Doctor Tools" tab
  │
  ├─→ Choose Quick Action:
  │   │
  │   ├─→ ⚡ Discharge Ready
  │   │   • View discharge summary
  │   │   • Print or copy
  │   │
  │   ├─→ 📋 Order Common Labs
  │   │   • View lab panel
  │   │   • Print or copy
  │   │
  │   ├─→ 💊 Refill All Meds
  │   │   • View medication list
  │   │   • Click "Edit" to modify
  │   │   • Change dosage, frequency, quantity
  │   │   • Add/remove medications
  │   │   • Save changes
  │   │   • Print or copy
  │   │
  │   ├─→ 📞 Call Specialist
  │   │   • View specialist directory
  │   │   • Get contact information
  │   │
  │   └─→ 🖨️ Print Summary
  │       • Print current patient summary
  │
  └─→ Action completed
END
```

---

### 4. Voice Command Workflow

**User Journey: Hands-Free Documentation**

```
START
  │
  ├─→ Click "Start Voice Commands"
  │
  ├─→ Microphone activates (browser permission)
  │
  ├─→ Speak command:
  │   • "Order chest x-ray"
  │   • "Discharge patient"
  │   • "Refill medications"
  │   • Natural language notes
  │
  ├─→ Web Speech API transcribes
  │
  ├─→ Command processed and logged
  │
  ├─→ View in voice log:
  │   • Timestamp
  │   • Action taken
  │   • Delete option
  │
  ├─→ Click "Stop Listening" when done
  │
  └─→ Commands saved in log
END
```

**Technology:**
- Web Speech API (browser-based)
- No external API required
- Works offline
- Real-time transcription

---

## Feature Interactions

### Patient Data → AI Summary

```
Patient Input
    ↓
Vitals + History + Medications
    ↓
Sent to Gemini AI
    ↓
Clinical Summary Generated
    ↓
Displayed in Dashboard
```

### Emergency Alert → Risk Assessment

```
Patient Selected
    ↓
Vitals Analyzed
    ↓
Risk Factors Calculated:
  • BP thresholds
  • SpO2 levels
  • Heart rate
  • Medical history
    ↓
Risk Score (0-100)
    ↓
Risk Vector Radar Updated
```

### Medication Refill → Edit → Print

```
Click "Refill All Meds"
    ↓
Static Summary Displayed
    ↓
Click "Edit Medications"
    ↓
Editable Form Shown:
  • Medication name
  • Dosage
  • Frequency
  • Quantity
  • Refills
    ↓
Make Changes
    ↓
Click "Save Changes"
    ↓
Updated Summary Displayed
    ↓
Print or Copy
```

---

## State Management

### Frontend State

```javascript
// Patient Management
- patients: Array of all patients
- selectedPatient: Currently viewed patient
- activeTab: Current view (dashboard/emergency/doctor tools)

// Emergency Dashboard
- vitals: Real-time vital signs
- riskScore: Calculated risk (0-100)
- timeSlider: Historical data position
- emergencyContacts: Configured contacts

// Doctor Tools
- voiceNotes: Array of voice commands
- isListening: Voice recording state
- editableMeds: Medications being edited
- isEditingMeds: Edit mode toggle
- activeModal: Current modal (discharge/labs/meds/specialist)
```

### Backend State

```python
# In-Memory Storage
- patients_db: List of patient records
- patient_counter: Auto-incrementing ID

# AI Service
- gemini_model: Initialized Gemini client
- safety_settings: Clinical safety configuration
```

---

## API Endpoints

### Patient Management

```
GET    /patients              # List all patients
POST   /patients              # Add new patient
GET    /patients/{id}         # Get specific patient
PUT    /patients/{id}         # Update patient
DELETE /patients/{id}         # Delete patient
```

### Health & Status

```
GET    /health                # Backend health check
GET    /                      # API welcome message
```

---

## Error Handling

### Frontend Error Handling

```
Network Error
    ↓
Display error message
    ↓
Provide troubleshooting steps:
  • Check backend is running
  • Verify port 8000
  • Check CORS settings
```

### Backend Error Handling

```
Invalid Request
    ↓
Validate input data
    ↓
Return 400 Bad Request
    ↓
Frontend displays error
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Components load on demand
   - Reduces initial bundle size

2. **Memoization**
   - React.memo for expensive components
   - useMemo for calculations

3. **Debouncing**
   - Voice command processing
   - Search inputs

4. **Caching**
   - Patient data cached in state
   - Reduces API calls

---

## Security Workflow

### Data Protection

```
User Input
    ↓
Frontend Validation
    ↓
HTTPS (in production)
    ↓
Backend Validation
    ↓
CORS Check
    ↓
Process Request
    ↓
Return Response
```

### API Key Security

```
.env file (not committed)
    ↓
Environment variables
    ↓
Backend only
    ↓
Never exposed to frontend
```

---

## Deployment Workflow

### Development

```
1. Start backend: uvicorn main:app --reload
2. Start frontend: npm run dev
3. Access: http://localhost:5173
```

### Production

```
1. Build frontend: npm run build
2. Serve static files
3. Run backend with gunicorn/uvicorn
4. Configure reverse proxy (nginx)
5. Enable HTTPS
```

---

## Monitoring & Logging

### Backend Logging

```python
# Logs include:
- API request/response
- AI service calls
- Error tracking
- Performance metrics
```

### Frontend Logging

```javascript
// Console logs for:
- API calls
- State changes
- Error messages
- Voice command processing
```

---

This workflow documentation provides a complete understanding of how MedAssist operates and how users interact with the system.
