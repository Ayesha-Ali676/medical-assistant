# 🔄 System Workflows

This document outlines the core user journeys within the MedAssist application.

## 1. Authentication Flow
1. **Landing**: User arrives at the Login screen.
2. **Action**: User enters **Username** or **Email** and Password.
3. **Validation**: 
   - Backend hashes password and verifies credentials in `users.json`.
   - If invalid, error message shown.
4. **Success**: User is redirected to `DoctorDashboard`. Session token stored (state).
5. **Logout**: User clicks "Logout" in header -> Session cleared -> Redirect to Login.

## 2. Patient Intake & Dashboard
1. **Dashboard View**: Doctor sees a list of *their* assigned patients (filtered by ID).
2. **Priority Triage**:
   - **CRITICAL (Red)**: Abnormal vitals or panic-value labs.
   - **HIGH (Yellow)**: Elevated risk scores.
   - **NORMAL (Green)**: Stable.
3. **Selection**: Clicking a patient card opens the detailed **Clinical Workstation**.

## 3. The Clinical Workstation

### A. AI Analysis
- **Trigger**: Automatic upon patient selection.
- **Process**: Backend sends patient JSON to Gemini 1.5 Flash.
- **Output**: A Clinical Narrative (3-4 sentences), Urgency Score, and Key Findings.

### B. Medical Imaging (Scanner)
- **Action**: User upload an image (PNG/JPG) of a lab report or X-ray.
- **Process**: `ReportScanner` sends file to `/scan-report`.
- **AI**: Gemini Vision analyzes the pixel data.
- **Output**: Structured summary of findings, abnormalities, and confidence score.

### C. Voice Commands
- **Activation**: Click Microphone icon.
- **Commands**:
  - *"Discharge patient"* -> Opens discharge modal.
  - *"Order X-ray"* -> Adds order to queue.
- **Feedback**: Visual pulse and text logging.

## 4. Emergency & Risk
- **Real-time Monitoring**: Vitals are checked against safe ranges.
- **Alerts**: If HR > 120 or BP > 180/110, a visual alert appears.
- **SOS**: One-click Emergency SOS triggers high-priority notification.

## 5. Quick Actions (One-Click)
- **Discharge**: Pre-fills a hospital discharge course based on admission notes.
- **Refill**: Renews current active medications.
- **Refer**: Generates a referral letter template.
