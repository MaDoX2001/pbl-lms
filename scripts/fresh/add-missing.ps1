# Add the missing projects

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}
Write-Host "Token obtained" -ForegroundColor Green

# Create Project 0
Write-Host "Creating Project 0..." -ForegroundColor Yellow
$p0json = Get-Content "$dir\project-0-data-fixed.json" -Encoding UTF8 -Raw
$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)
$p0r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p0b
Write-Host "Created: $($p0r.data._id) - $($p0r.data.title)" -ForegroundColor Green

Start-Sleep -Seconds 1

# Create Project 6
Write-Host "Creating Project 6..." -ForegroundColor Yellow
$p6json = Get-Content "$dir\project-6-data-fixed.json" -Encoding UTF8 -Raw
$p6b = [System.Text.Encoding]::UTF8.GetBytes($p6json)
$p6r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p6b
Write-Host "Created: $($p6r.data._id) - $($p6r.data.title)" -ForegroundColor Green

Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Verify
Write-Host "Verifying all projects..." -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total: $($all.data.Count)" -ForegroundColor Yellow
$all.data | Sort-Object -Property projectOrder -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "[$($_.projectOrder)] $($_.title)" -ForegroundColor Green
}
