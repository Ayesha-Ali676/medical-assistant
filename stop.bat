@echo off
echo ========================================
echo  MedAssist - Stopping Services
echo ========================================
echo.

echo [1/2] Stopping Docker containers...
docker-compose down
if errorlevel 1 (
    echo [WARNING] Failed to stop some containers
) else (
    echo [OK] All containers stopped
)
echo.

echo [2/2] Stopping Node processes...
echo [INFO] Please close the API Gateway and Frontend windows manually
echo        or use Task Manager to end Node.js processes
echo.

echo ========================================
echo  Services Stopped
echo ========================================
echo.
pause
