@echo off
echo ========================================
echo  Installing Backend Dependencies
echo ========================================
echo.

echo Installing Python packages...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo.
    echo Make sure Python and pip are installed:
    echo   python --version
    echo   pip --version
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Backend is ready to run.
echo.
echo To start the backend:
echo   cd backend
echo   py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
echo.
echo Or use the start.bat script from the root directory.
echo.
pause
