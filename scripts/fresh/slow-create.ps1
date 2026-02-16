# Slow Creation with Verification

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

Write-Host "Creating projects one by one..." -ForegroundColor Yellow
Write-Host ""

# P0
Write-Host "Project 0 - Onboarding..." -ForegroundColor Cyan
$p0json = Get-Content "$dir\project-0-data.json" -Encoding UTF8 -Raw
Write-Host "POST /projects with:" -ForegroundColor Gray
$p0obj = $p0json | ConvertFrom-Json
Write-Host "  Name: $($p0obj.name)" -ForegroundColor Gray
Write-Host "  Points: $($p0obj.points)" -ForegroundColor Gray
$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)
$p0r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p0b -Verbose 4>&1
Write-Host "Response success: $($p0r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p0r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P1
Write-Host "Project 1 - Smart LED..." -ForegroundColor Cyan
$p1json = Get-Content "$dir\project-1-data.json" -Encoding UTF8 -Raw
$p1obj = $p1json | ConvertFrom-Json
Write-Host "  Name: $($p1obj.name)" -ForegroundColor Gray
$p1b = [System.Text.Encoding]::UTF8.GetBytes($p1json)
$p1r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p1b
Write-Host "Response success: $($p1r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p1r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P2
Write-Host "Project 2 - Traffic Light..." -ForegroundColor Cyan
$p2json = Get-Content "$dir\project-2-data.json" -Encoding UTF8 -Raw
$p2b = [System.Text.Encoding]::UTF8.GetBytes($p2json)
$p2r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p2b
Write-Host "Response success: $($p2r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p2r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P3
Write-Host "Project 3 - Smart Light LDR..." -ForegroundColor Cyan
$p3json = Get-Content "$dir\project-3-data.json" -Encoding UTF8 -Raw
$p3b = [System.Text.Encoding]::UTF8.GetBytes($p3json)
$p3r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p3b
Write-Host "Response success: $($p3r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p3r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P4
Write-Host "Project 4 - Smart Alarm..." -ForegroundColor Cyan
$p4json = Get-Content "$dir\project-4-data.json" -Encoding UTF8 -Raw
$p4b = [System.Text.Encoding]::UTF8.GetBytes($p4json)
$p4r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p4b
Write-Host "Response success: $($p4r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p4r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P5
Write-Host "Project 5 - Temperature..." -ForegroundColor Cyan
$p5json = Get-Content "$dir\project-5-data.json" -Encoding UTF8 -Raw
$p5b = [System.Text.Encoding]::UTF8.GetBytes($p5json)
$p5r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p5b
Write-Host "Response success: $($p5r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p5r.data._id)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# P6
Write-Host "Project 6 - Environmental..." -ForegroundColor Cyan
$p6json = Get-Content "$dir\project-6-data.json" -Encoding UTF8 -Raw
$p6b = [System.Text.Encoding]::UTF8.GetBytes($p6json)
$p6r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p6b
Write-Host "Response success: $($p6r.success)" -ForegroundColor Green
Write-Host "Project ID: $($p6r.data._id)" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "Waiting 3 seconds before verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`nVerifying..." -ForegroundColor Yellow
$verify = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total projects now: $($verify.data.Count)" -ForegroundColor Cyan
