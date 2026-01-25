@echo off
echo ========================================
echo  MedAssist Clinical Decision Support
echo  Simplified Version - No Database
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo Please copy .env.example to .env and add your Gemini API key.
    pause
    exit /b 1
)

echo [1/2] Starting Backend API (FastAPI)...
start "MedAssist Backend" cmd /k "cd backend && py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
echo [OK] Backend starting on http://localhost:8000
echo.

echo [2/2] Starting Frontend Dashboard (React)...
start "MedAssist Frontend" cmd /k "cd frontend && npm run dev"
echo [OK] Frontend starting on http://localhost:5173
echo.

echo ========================================
echo  Services Started Successfully!
echo ========================================
echo.
echo  Frontend:     http://localhost:5173
echo  Backend API:  http://localhost:8000
echo  API Docs:     http://localhost:8000/docs
echo.
echo  Press Ctrl+C in service windows to stop
echo ========================================
echo.

pause
