# 🛠️ MedAssist Setup Guide

This guide covers the complete installation and configuration process for the MedAssist Clinical Decision Support System.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
   - Verify with `python --version`
2. **Node.js 18+**: [Download Node.js](https://nodejs.org/)
   - Verify with `node --version`
3. **Git**: [Download Git](https://git-scm.com/)

---

## 🔧 Backend Setup (FastAPI)

The backend handles AI processing, database management, and authentication.

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a Virtual Environment (Recommended)**
   ```bash
   python -m venv venv
   
   # Windows
   ..\venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**
   Create a file named `.env` in the `backend` folder with the following content:
   ```env
   # Get your key from: https://makersuite.google.com/app/apikey
   GEMINI_API_KEY=your_actual_api_key_here
   
   # Server Configuration
   PORT=8000
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```

5. **Start the Backend Server**
   ```bash
   python main.py
   # OR
   uvicorn main:app --reload
   ```
   *The server should now be running at `http://127.0.0.1:8000`*

---

## 🎨 Frontend Setup (React)

The frontend provides the clinical interface.

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node Packages**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   *Access the app at `http://localhost:5173`*

---

## 🚀 Quick Start Script

For convenience, you can start both services with a single command from the root directory:

**Windows:**
```bash
start.bat
```

---

## 🆘 Troubleshooting

### Common Backend Issues

**Error: `Module not found`**
- Ensure you activated your virtual environment.
- Re-run `pip install -r requirements.txt`.

**Error: `Model not found` (404)**
- Updates to the Google GenAI SDK can sometimes cause version mismatches.
- Ensure your `.env` has a valid `GEMINI_API_KEY`.
- The system is configured to auto-fallback to available models (Gemini 2.0 -> Flash).

**Error: Port 8000 in use**
- Kill the process using port 8000:
  ```bash
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  ```

### Common Frontend Issues

**Error: `Vite not found`**
- Run `npm install` again to ensure dev dependencies are installed.

**Blank Screen**
- Check the console (F12) for errors.
- Ensure the backend is running and reachable.
