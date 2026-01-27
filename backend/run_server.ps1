# PowerShell script to run the backend server
cd f:\snowfest\medical-assistant\backend
Write-Host "Starting Medical Assistant Backend Server..."
Write-Host "Port: 8000"
Write-Host "Press Ctrl+C to stop"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
