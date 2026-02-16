# PowerShell script to create the Onboarding Project
# Automatically logs in and creates the project

$backendUrl = "https://pbl-lms-backend.onrender.com/api"
$adminEmail = "admin@pbl-lms.com"
$adminPassword = "Admin@123456"

Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Creating Onboarding Project" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in as admin..." -ForegroundColor Yellow

$loginBody = ConvertTo-Json @{
    email = $adminEmail
    password = $adminPassword
}

$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginBody)

$loginResp = Invoke-RestMethod -Uri "$backendUrl/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes

$token = $loginResp.data.token
Write-Host "✓ Logged in successfully" -ForegroundColor Green

# Step 2: Load project data
Write-Host "Step 2: Loading project data..." -ForegroundColor Yellow

$projectDataFile = "$PSScriptRoot\onboarding-project-data.json"
$projectDataJson = Get-Content -Path $projectDataFile -Encoding UTF8 -Raw

$projectData = $projectDataJson | ConvertFrom-Json

Write-Host "✓ Project data loaded: $($projectData.name)" -ForegroundColor Green

# Step 3: Create project
Write-Host "Step 3: Creating project..." -ForegroundColor Yellow

$createBody = ConvertTo-Json -InputObject $projectData -Depth 10

$createBytes = [System.Text.Encoding]::UTF8.GetBytes($createBody)

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json; charset=utf-8"
}

$createResp = Invoke-RestMethod -Uri "$backendUrl/projects" -Method Post -Headers $headers -Body $createBytes

$projectId = $createResp.data._id

Write-Host "✓ Project created successfully" -ForegroundColor Green
Write-Host "Project ID: $projectId" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✓ CREATION COMPLETE" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "Project: $($projectData.name)"
Write-Host "ID: $projectId"
Write-Host "Difficulty: $($projectData.difficulty)"
Write-Host "Duration: $($projectData.estimatedHours) hours"
Write-Host "Points: $($projectData.points)"
Write-Host "Status: $($projectData.status)"
Write-Host "Deadline: $($projectData.deadline)"
Write-Host ""
Write-Host "Note: Low-Stakes Onboarding Project"
Write-Host "Assessment Cards: Not Required"
Write-Host "======================================" -ForegroundColor Green
