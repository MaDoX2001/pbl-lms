# Deploy all 7 projects fresh

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

Write-Host "Creating all 7 projects..." -ForegroundColor Yellow

# Create projects 1-5 from existing files (already fixed)
for ($i = 1; $i -le 5; $i++) {
    $json = Get-Content "$dir\project-$i-data.json" -Encoding UTF8 -Raw
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    $result = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $body
    Write-Host "[$i] $($result.data.title)" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

# Create projects 0 and 6 from fixed files
$json0 = Get-Content "$dir\project-0-data-fixed.json" -Encoding UTF8 -Raw
$body0 = [System.Text.Encoding]::UTF8.GetBytes($json0)
$result0 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $body0
Write-Host "[0] $($result0.data.title)" -ForegroundColor Green
Start-Sleep -Milliseconds 500

$json6 = Get-Content "$dir\project-6-data-fixed.json" -Encoding UTF8 -Raw
$body6 = [System.Text.Encoding]::UTF8.GetBytes($json6)
$result6 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $body6
Write-Host "[6] $($result6.data.title)" -ForegroundColor Green

Write-Host "`nWaiting 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Verify
Write-Host "`nFinal verification:" -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total projects: $($all.data.Count)" -ForegroundColor Cyan
$all.data | Sort-Object -Property projectOrder -ErrorAction SilentlyContinue | Select-Object -First 7 | ForEach-Object {
    Write-Host "  - $($_.title)" -ForegroundColor Green
}
