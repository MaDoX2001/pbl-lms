# Diagnostic - Check Project Status

Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "PROJECT DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Logging in..." -ForegroundColor Yellow

$loginData = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginData)

try {
    $loginResp = Invoke-RestMethod -Uri "https://pbl-lms-backend.onrender.com/api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes -ErrorAction Stop
    $token = $loginResp.data.token
    Write-Host "Login successful" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Get projects
Write-Host "`n2. Fetching projects..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json; charset=utf-8"
}

try {
    $projResp = Invoke-RestMethod -Uri "https://pbl-lms-backend.onrender.com/api/projects" -Method Get -Headers $headers -ErrorAction Stop
    
    $count = ($projResp.data | Measure-Object).Count
    Write-Host "Total projects: $count" -ForegroundColor Green
    
    if ($count -eq 0) {
        Write-Host "ERROR: No projects found!" -ForegroundColor Red
    } else {
        Write-Host "`nProject list:" -ForegroundColor Yellow
        $projResp.data | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.name | Select-Object -Last 5))" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Failed to fetch projects: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
