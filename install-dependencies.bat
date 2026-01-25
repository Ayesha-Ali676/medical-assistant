@echo off
echo ========================================
echo  MedAssist - Installing Dependencies
echo ========================================
echo.

echo This will install node_modules for all services.
echo This may take several minutes...
echo.
pause

echo.
echo [1/14] Installing Frontend dependencies...
cd frontend
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
    ) else (
        echo [OK] Frontend dependencies installed
    )
) else (
    echo [SKIP] No package.json found in frontend
)
cd ..
echo.

echo [2/14] Installing Shared utilities...
cd services\shared
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install shared dependencies
    ) else (
        echo [OK] Shared dependencies installed
    )
) else (
    echo [SKIP] No package.json found in shared
)
cd ..\..
echo.

echo [3/14] Installing API Gateway...
cd services\api-gateway
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install api-gateway dependencies
    ) else (
        echo [OK] API Gateway dependencies installed
    )
) else (
    echo [SKIP] No package.json found in api-gateway
)
cd ..\..
echo.

echo [4/14] Installing Triage Engine...
cd services\triage-engine
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install triage-engine dependencies
    ) else (
        echo [OK] Triage Engine dependencies installed
    )
) else (
    echo [SKIP] No package.json found in triage-engine
)
cd ..\..
echo.

echo [5/14] Installing AI Intelligence...
cd services\ai-intelligence
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install ai-intelligence dependencies
    ) else (
        echo [OK] AI Intelligence dependencies installed
    )
) else (
    echo [SKIP] No package.json found in ai-intelligence
)
cd ..\..
echo.

echo [6/14] Installing Safety Engine...
cd services\safety-engine
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install safety-engine dependencies
    ) else (
        echo [OK] Safety Engine dependencies installed
    )
) else (
    echo [SKIP] No package.json found in safety-engine
)
cd ..\..
echo.

echo [7/14] Installing Workflow Engine...
cd services\workflow-engine
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install workflow-engine dependencies
    ) else (
        echo [OK] Workflow Engine dependencies installed
    )
) else (
    echo [SKIP] No package.json found in workflow-engine
)
cd ..\..
echo.

echo [8/14] Installing Alert Service...
cd services\alert-service
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install alert-service dependencies
    ) else (
        echo [OK] Alert Service dependencies installed
    )
) else (
    echo [SKIP] No package.json found in alert-service
)
cd ..\..
echo.

echo [9/14] Installing FHIR Integration...
cd services\fhir-integration
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install fhir-integration dependencies
    ) else (
        echo [OK] FHIR Integration dependencies installed
    )
) else (
    echo [SKIP] No package.json found in fhir-integration
)
cd ..\..
echo.

echo [10/14] Installing EHR Connector...
cd services\ehr-connector
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install ehr-connector dependencies
    ) else (
        echo [OK] EHR Connector dependencies installed
    )
) else (
    echo [SKIP] No package.json found in ehr-connector
)
cd ..\..
echo.

echo [11/14] Installing Device Integration...
cd services\device-integration
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install device-integration dependencies
    ) else (
        echo [OK] Device Integration dependencies installed
    )
) else (
    echo [SKIP] No package.json found in device-integration
)
cd ..\..
echo.

echo [12/14] Installing Compliance Service...
cd services\compliance-service
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install compliance-service dependencies
    ) else (
        echo [OK] Compliance Service dependencies installed
    )
) else (
    echo [SKIP] No package.json found in compliance-service
)
cd ..\..
echo.

echo [13/14] Installing Cache Service...
cd services\cache-service
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install cache-service dependencies
    ) else (
        echo [OK] Cache Service dependencies installed
    )
) else (
    echo [SKIP] No package.json found in cache-service
)
cd ..\..
echo.

echo [14/14] Installing Scaling Service...
cd services\scaling-service
if exist package.json (
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install scaling-service dependencies
    ) else (
        echo [OK] Scaling Service dependencies installed
    )
) else (
    echo [SKIP] No package.json found in scaling-service
)
cd ..\..
echo.

echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo All dependencies have been installed.
echo You can now run: start.bat
echo.
pause
