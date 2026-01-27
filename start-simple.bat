@echo off
REM MedAssist - Simplified Startup Script
echo ========================================
echo  MedAssist Clinical Decision Support
echo  Version 2.0 - Dataset-Free System
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo Please add your Gemini API key to the .env file
    echo.
    echo GEMINI_API_KEY=your-api-key-here
    echo.
    pause
    exit /b 1
)

echo [INFO] Dependencies check...
echo.

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo [1/4] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
)

REM Install backend dependencies if needed
echo [2/4] Checking backend dependencies...
python -m pip install fastapi uvicorn python-dotenv pydantic google-generativeai python-multipart 1>nul 2>&1
echo [OK] Backend dependencies ready
echo.

echo [3/4] Starting Backend API (FastAPI on port 8000)...
start "MedAssist Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
echo.

echo [4/4] Starting Frontend Dashboard (React on port 5173)...
start "MedAssist Frontend" cmd /k "cd frontend && npm run dev"
echo.

echo ========================================
echo  Services Starting...
echo ========================================
echo.
echo  Frontend:     http://localhost:5173
echo  Backend API:  http://localhost:8000
echo  API Docs:     http://localhost:8000/docs
echo.
echo  Press Ctrl+C in each window to stop
echo ========================================
echo.

timeout /t 3 /nobreak
