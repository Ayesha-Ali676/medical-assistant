# 🚀 Setup Guide - MedAssist

Complete installation guide for setting up MedAssist after cloning the repository.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10 or higher** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/)

---

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd medical-assistant
```

---

## Step 2: Backend Setup

### 2.1 Create Virtual Environment

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Required packages:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `google-genai` - Gemini AI integration
- `python-dotenv` - Environment variables
- `requests` - HTTP library

### 2.3 Configure Environment Variables

Create a `.env` file in the `backend` folder:

```bash
cd backend
# Create .env file
```

Add the following content to `.env`:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Clinical Safety Features
ENABLE_CLINICAL_SAFETY=true
```

**Get your Gemini API key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into the `.env` file

---

## Step 3: Frontend Setup

### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

### 3.2 Install Node Dependencies

```bash
npm install
```

This will install:
- React
- Vite
- Axios
- Lucide React (icons)
- Other development dependencies

---

## Step 4: Running the Application

### Option 1: Using the Start Script (Recommended)

**Windows:**
```bash
cd ..
start.bat
```

This will:
1. Start the backend server on `http://localhost:8000`
2. Start the frontend dev server on `http://localhost:5173`
3. Open your default browser automatically

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Step 5: Verify Installation

### 5.1 Check Backend

Open your browser and navigate to:
- **Health Check:** http://localhost:8000/health
- **API Documentation:** http://localhost:8000/docs
- **Patients Endpoint:** http://localhost:8000/patients

You should see JSON responses for each endpoint.

### 5.2 Check Frontend

Navigate to:
- **Application:** http://localhost:5173

You should see the MedAssist dashboard with patient data.

---

## Troubleshooting

### Backend Issues

**Issue: `ModuleNotFoundError`**
```bash
# Solution: Ensure virtual environment is activated and dependencies are installed
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

**Issue: Port 8000 already in use**
```bash
# Windows - Find and kill process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Issue: Gemini API errors**
- Verify your API key is correct in `backend/.env`
- Check your API quota at [Google AI Studio](https://makersuite.google.com/)
- Ensure `GEMINI_API_KEY` has no extra spaces or quotes

### Frontend Issues

**Issue: `npm install` fails**
```bash
# Solution: Clear npm cache and retry
npm cache clean --force
npm install
```

**Issue: Blank page or errors in console**
```bash
# Solution: Clear browser cache and restart dev server
# Press Ctrl + Shift + R in browser
# Stop frontend (Ctrl + C) and restart: npm run dev
```

**Issue: Cannot connect to backend**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify `ALLOWED_ORIGINS` in `backend/.env` includes `http://localhost:5173`

---

## Development Commands

### Backend

```bash
# Start backend with auto-reload
cd backend
venv\Scripts\activate
uvicorn main:app --reload

# Run tests (if available)
pytest

# Check Python version
python --version
```

### Frontend

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for linting issues
npm run lint
```

---

## Project Structure After Setup

```
medical-assistant/
├── backend/
│   ├── venv/                 # Virtual environment (created)
│   ├── .env                  # Environment variables (created)
│   ├── main.py              # FastAPI application
│   ├── ai_service.py        # Gemini AI integration
│   ├── requirements.txt     # Python dependencies
│   └── ...
│
├── frontend/
│   ├── node_modules/        # Node dependencies (created)
│   ├── src/
│   │   ├── App.jsx         # Main application
│   │   ├── components/     # React components
│   │   └── ...
│   ├── package.json        # Node dependencies
│   └── ...
│
├── data/
│   └── patients.json       # Sample patient data
│
├── start.bat               # Quick start script
└── README.md              # Project overview
```

---

## Next Steps

1. ✅ **Explore the Application**
   - Navigate to http://localhost:5173
   - Click on different patients
   - Try the Emergency Dashboard
   - Test the Doctor Tools

2. ✅ **Read the Documentation**
   - [README.md](README.md) - Project overview
   - [WORKFLOW.md](WORKFLOW.md) - System workflows
   - [PROBLEM_AND_SOLUTION.md](PROBLEM_AND_SOLUTION.md) - Project context

3. ✅ **Customize**
   - Add your own patient data in `data/patients.json`
   - Modify UI components in `frontend/src/components/`
   - Extend backend endpoints in `backend/main.py`

---

## Support

If you encounter any issues not covered in this guide:

1. Check the [README.md](README.md) for additional information
2. Review the API documentation at http://localhost:8000/docs
3. Ensure all prerequisites are correctly installed
4. Verify environment variables are properly configured

---

**Setup Complete! 🎉**

Your MedAssist Clinical Decision Support System is now ready to use.
