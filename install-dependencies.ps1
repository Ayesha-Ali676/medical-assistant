# MedAssist - Install Dependencies PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedAssist - Installing Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will install node_modules for all services." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to continue"

$services = @(
    @{Name="Frontend"; Path="frontend"},
    @{Name="Shared Utilities"; Path="services\shared"},
    @{Name="API Gateway"; Path="services\api-gateway"},
    @{Name="Triage Engine"; Path="services\triage-engine"},
    @{Name="AI Intelligence"; Path="services\ai-intelligence"},
    @{Name="Safety Engine"; Path="services\safety-engine"},
    @{Name="Workflow Engine"; Path="services\workflow-engine"},
    @{Name="Alert Service"; Path="services\alert-service"},
    @{Name="FHIR Integration"; Path="services\fhir-integration"},
    @{Name="EHR Connector"; Path="services\ehr-connector"},
    @{Name="Device Integration"; Path="services\device-integration"},
    @{Name="Compliance Service"; Path="services\compliance-service"},
    @{Name="Cache Service"; Path="services\cache-service"},
    @{Name="Scaling Service"; Path="services\scaling-service"}
)

$total = $services.Count
$current = 0

foreach ($service in $services) {
    $current++
    Write-Host ""
    Write-Host "[$current/$total] Installing $($service.Name)..." -ForegroundColor Cyan
    
    if (Test-Path "$($service.Path)\package.json") {
        Push-Location $service.Path
        
        try {
            npm install 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] $($service.Name) dependencies installed" -ForegroundColor Green
            } else {
                Write-Host "[ERROR] Failed to install $($service.Name) dependencies" -ForegroundColor Red
            }
        } catch {
            Write-Host "[ERROR] Failed to install $($service.Name) dependencies" -ForegroundColor Red
        }
        
        Pop-Location
    } else {
        Write-Host "[SKIP] No package.json found in $($service.Name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All dependencies have been installed." -ForegroundColor Green
Write-Host "You can now run: .\start.bat" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
