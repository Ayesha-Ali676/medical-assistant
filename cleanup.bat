
@echo off
echo ========================================
echo  MedAssist Project Cleanup
echo ========================================
echo.
echo This will remove unnecessary files and folders.
echo.
set /p confirm="Are you sure you want to continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Cleanup cancelled.
    pause
    exit /b 0
)
echo.

echo [1/5] Removing legacy Python backend...
if exist backend (
    rmdir /s /q backend
    echo [OK] Removed backend/
) else (
    echo [SKIP] backend/ not found
)
echo.

echo [2/5] Removing unnecessary documentation...
if exist DASHBOARD_IMPROVEMENTS.md (
    del /q DASHBOARD_IMPROVEMENTS.md
    echo [OK] Removed DASHBOARD_IMPROVEMENTS.md
) else (
    echo [SKIP] DASHBOARD_IMPROVEMENTS.md not found
)
echo.

echo [3/5] Cleaning Python cache files...
for /d /r . %%d in (__pycache__) do @if exist "%%d" (
    rmdir /s /q "%%d"
    echo [OK] Removed %%d
)
echo.

echo [4/5] Removing sample data (optional)...
set /p remove_data="Remove data/ folder? (Y/N): "
if /i "%remove_data%"=="Y" (
    if exist data (
        rmdir /s /q data
        echo [OK] Removed data/
    )
) else (
    echo [SKIP] Keeping data/
)
echo.

echo [5/5] Cleaning node_modules (optional)...
set /p clean_node="Remove all node_modules folders? (Y/N): "
if /i "%clean_node%"=="Y" (
    echo Removing node_modules...
    for /d /r . %%d in (node_modules) do @if exist "%%d" (
        echo Removing %%d...
        rmdir /s /q "%%d"
    )
    echo [OK] All node_modules removed
    echo [INFO] Run 'npm install' in each service to reinstall
) else (
    echo [SKIP] Keeping node_modules
)
echo.

echo ========================================
echo  Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review PROJECT_SETUP.md for setup instructions
echo 2. Copy .env.example to .env and configure
echo 3. Run 'npm install' in services if you removed node_modules
echo 4. Run 'start.bat' to start the project
echo.
pause
