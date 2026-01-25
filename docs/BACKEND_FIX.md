# 🔧 Backend Fix Guide

## ✅ Problem Fixed

The backend folder was accidentally deleted. I've recreated it with all necessary files.

---

## 📁 Backend Files Created

```
backend/
├── main.py              # FastAPI application
├── models.py            # Data models
├── ai_service.py        # Gemini AI integration
├── safety_engine.py     # Safety checks
├── ml_service.py        # Risk scoring
├── requirements.txt     # Python dependencies
├── .env                 # Configuration
└── setup.bat            # Setup script
```

---

## 🚀 Quick Fix (3 Steps)

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Step 2: Verify Gemini API Key

Check `backend/.env` has your API key:
```env
GEMINI_API_KEY=your_actual_key_here
```

### Step 3: Start the Backend

```bash
start.bat
```

---

## 📦 Python Dependencies

The backend needs these packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `python-dotenv` - Environment variables
- `pydantic` - Data validation
- `google-generativeai` - Gemini AI

Install with:
```bash
cd backend
pip install -r requirements.txt
```

---

## 🔍 Verify Installation

### 1. Check Python

```bash
python --version
# Should be 3.9 or higher
```

### 2. Check pip

```bash
pip --version
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Test Backend

```bash
cd backend
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open browser: http://localhost:8000/docs

---

## 🎯 Complete Setup Process

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# 2. Install frontend dependencies
cd frontend
npm install
cd ..

# 3. Start everything
start.bat
```

---

## 📊 What Each File Does

### main.py
- FastAPI application
- API endpoints
- CORS configuration
- Patient analysis logic

### models.py
- Pydantic data models
- Request/response schemas
- Data validation

### ai_service.py
- Gemini AI integration
- Clinical summary generation
- Prompt engineering

### safety_engine.py
- Vital signs safety checks
- Lab result analysis
- Drug interaction detection

### ml_service.py
- Simple risk scoring
- Priority calculation
- Rule-based ML

### requirements.txt
- Python package dependencies
- Version specifications

---

## 🐛 Troubleshooting

### Issue: "pip is not recognized"

**Solution**: Install Python with pip

1. Download Python from: https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"
3. Restart terminal
4. Verify: `pip --version`

### Issue: "Module not found: google.generativeai"

**Solution**: Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Issue: "GEMINI_API_KEY not found"

**Solution**: Add API key to backend/.env

```env
GEMINI_API_KEY=your_actual_key_here
```

### Issue: "Port 8000 already in use"

**Solution**: Kill the process

```bash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

### Issue: "Could not import module 'main'"

**Solution**: Make sure you're in the backend directory

```bash
cd backend
py -m uvicorn main:app --reload
```

---

## ✅ Verification Checklist

- [ ] Python 3.9+ installed
- [ ] pip installed
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Gemini API key in `backend/.env`
- [ ] Backend starts without errors
- [ ] Can access http://localhost:8000/docs
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:5173

---

## 🎉 Success!

Once all steps are complete:

1. Backend runs on: http://localhost:8000
2. Frontend runs on: http://localhost:5173
3. API docs at: http://localhost:8000/docs

---

## 📞 Need Help?

### Check Backend Status
```bash
curl http://localhost:8000/health
```

### Check API Documentation
Open: http://localhost:8000/docs

### View Backend Logs
Check the terminal where backend is running

---

**Version**: 2.0  
**Last Updated**: January 25, 2026  
**Status**: ✅ Backend Recreated
