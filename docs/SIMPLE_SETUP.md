# 🚀 MedAssist - Simplified Setup Guide

## ✨ What Changed

Your project is now **simplified**:
- ❌ **Removed**: PostgreSQL, MongoDB, Redis, InfluxDB databases
- ❌ **Removed**: JWT authentication
- ❌ **Removed**: OpenAI API
- ✅ **Kept**: Gemini AI API only
- ✅ **Kept**: Frontend (React) + Backend (FastAPI)
- ✅ **Kept**: Patient data in JSON files

---

## 🎯 Quick Start (3 Steps)

### 1. Configure Gemini API Key

```bash
# Copy environment template
copy .env.example .env

# Edit .env and add your Gemini API key
notepad .env
```

Your `.env` file should look like:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=8000
FRONTEND_PORT=5173
```

### 2. Install Dependencies (Frontend Only)

```bash
cd frontend
npm install
cd ..
```

### 3. Start the Application

```bash
start.bat
```

**That's it!** Access: http://localhost:5173

---

## 📁 Simplified Project Structure

```
medassist/
├── backend/                 # FastAPI Backend
│   ├── main.py             # Main API
│   ├── ai_service.py       # Gemini AI integration
│   ├── safety_engine.py    # Safety checks
│   └── models.py           # Data models
│
├── frontend/               # React Dashboard
│   ├── src/
│   ├── public/
│   └── package.json
│
├── data/                   # Patient data (JSON)
│   └── patients.json
│
├── .env                    # Configuration (Gemini API key)
├── start.bat               # Start script
└── docker-compose.yml      # Docker config (optional)
```

---

## 🔑 Get Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Paste it in `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSy...your_key_here
   ```

---

## 🚀 Running the Application

### Option 1: Quick Start (Recommended)

```bash
start.bat
```

This will:
1. Start Backend on http://localhost:8000
2. Start Frontend on http://localhost:5173

### Option 2: Manual Start

```bash
# Terminal 1: Start Backend
cd backend
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |

---

## 🔍 Verify Installation

### 1. Check Backend

```bash
# Open browser
http://localhost:8000/docs
```

You should see FastAPI documentation.

### 2. Check Frontend

```bash
# Open browser
http://localhost:5173
```

You should see the MedAssist dashboard.

### 3. Test API

```bash
# Get patients list
curl http://localhost:8000/patients
```

---

## 📝 Configuration File (.env)

```env
# MedAssist Simplified Configuration

# Application
NODE_ENV=development
PORT=8000
FRONTEND_PORT=5173

# AI Service - Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000

# Monitoring
LOG_LEVEL=info

# Clinical Safety
REQUIRE_PHYSICIAN_CONFIRMATION=true
ENABLE_SAFETY_CHECKS=true
```

---

## 🛠️ Development Workflow

### 1. Start Development

```bash
start.bat
```

### 2. Make Changes

- **Backend**: Edit files in `backend/`
- **Frontend**: Edit files in `frontend/src/`
- Changes auto-reload!

### 3. Stop Services

Press `Ctrl+C` in each terminal window.

---

## 🐛 Troubleshooting

### Issue: "Gemini API key not found"

**Solution**: Add your API key to `.env`

```env
GEMINI_API_KEY=AIzaSy...your_actual_key
```

### Issue: "Port 8000 already in use"

**Solution**: Kill the process

```bash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

### Issue: "Module not found" (Frontend)

**Solution**: Install dependencies

```bash
cd frontend
npm install
```

### Issue: "Python module not found" (Backend)

**Solution**: Install Python dependencies

```bash
cd backend
pip install fastapi uvicorn python-dotenv google-generativeai
```

---

## 📦 Required Software

- ✅ **Python** 3.9+ (for backend)
- ✅ **Node.js** 18+ (for frontend)
- ✅ **Gemini API Key** (free from Google)

---

## 🎯 What Was Removed

### Databases (No longer needed)
- ❌ PostgreSQL
- ❌ MongoDB
- ❌ Redis
- ❌ InfluxDB

### Authentication (Simplified)
- ❌ JWT tokens
- ❌ User authentication
- ❌ Session management

### AI Services (Simplified)
- ❌ OpenAI API
- ✅ Gemini AI only

### Microservices (Simplified)
- ❌ API Gateway
- ❌ Triage Engine service
- ❌ AI Intelligence service
- ❌ Safety Engine service
- ❌ Multiple microservices
- ✅ Single FastAPI backend

---

## 📚 API Endpoints

### Get Patients
```bash
GET http://localhost:8000/patients
```

### Analyze Patient
```bash
POST http://localhost:8000/analyze-patient
Content-Type: application/json

{
  "patient_id": "P001",
  "age": 65,
  "vitals": {...},
  "lab_results": [...],
  "current_medications": [...]
}
```

### API Documentation
```bash
GET http://localhost:8000/docs
```

---

## ✅ Setup Checklist

- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] Gemini API key obtained
- [ ] `.env` file created with API key
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend started successfully
- [ ] Frontend started successfully
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:8000/docs

---

## 🎉 You're Ready!

Your simplified MedAssist system is now running with:
- ✅ Gemini AI for clinical analysis
- ✅ React dashboard for visualization
- ✅ FastAPI backend for processing
- ✅ No database complexity
- ✅ No authentication overhead

**Just run `start.bat` and you're good to go!**

---

**Version**: 2.0 - Simplified  
**Last Updated**: January 25, 2026  
**Status**: ✅ Ready to Use
