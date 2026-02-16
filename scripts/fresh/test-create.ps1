# Test with new login each time

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

Write-Host "Creating Project 0 test..." -ForegroundColor Yellow

# Fresh login for each request
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Green

$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

# Create project 0
$p0json = Get-Content "$dir\project-0-data.json" -Encoding UTF8 -Raw
$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)

Write-Host "Creating project..." -ForegroundColor Yellow
$p0r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p0b
$projectId = $p0r.data._id
Write-Host "Created: $projectId" -ForegroundColor Green

# Try to get it immediately
Write-Host "Checking immediately after create..." -ForegroundColor Yellow
try {
    $check1 = Invoke-RestMethod -Uri "$url/projects/$projectId" -Headers $h
    Write-Host "Found project: $($check1.data.name)" -ForegroundColor Green
} catch {
    Write-Host "Project not found: $($_.Exception.Message)" -ForegroundColor Red
}

# List all projects
Write-Host "Listing all projects..." -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total: $($all.data.Count)" -ForegroundColor Yellow
if ($all.data.Count -gt 0) {
    $all.data | Select-Object -First 1 | ForEach-Object { Write-Host "First: $($_.name)" -ForegroundColor Green }
}
