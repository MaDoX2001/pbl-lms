# Update Project 1 evaluation cards

$backendUrl = "https://pbl-lms-backend.onrender.com/api"
$adminEmail = "admin@pbl-lms.com"
$adminPassword = "Admin@123456"
$projectId = "698e61d1d287e2bd028d959d"

Write-Host "Updating Project 1 Evaluation Cards..." -ForegroundColor Yellow

# Login
$loginJson = '{"email":"' + $adminEmail + '","password":"' + $adminPassword + '"}'
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginJson)
$loginResp = Invoke-RestMethod -Uri "$backendUrl/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes
$token = $loginResp.data.token

Write-Host "Logged in" -ForegroundColor Green

# Headers
$headerAuth = "Bearer " + $token
$hdr = @{}
$hdr["Authorization"] = $headerAuth
$hdr["Content-Type"] = "application/json; charset=utf-8"

# Load and create group card
$groupfile = "c:\pbl-lms\scripts\project-1-group-card-updated.json"
$groupJson = Get-Content -Path $groupfile -Encoding UTF8 -Raw
$groupData = ConvertFrom-Json $groupJson
$groupData.projectId = $projectId
$groupBody = ConvertTo-Json -InputObject $groupData -Depth 10
$groupBytes = [System.Text.Encoding]::UTF8.GetBytes($groupBody)
$groupResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $groupBytes

Write-Host "Group card created: $($groupResp.data._id)" -ForegroundColor Green

# Load and create individual card
$indfile = "c:\pbl-lms\scripts\project-1-individual-card-updated.json"
$indJson = Get-Content -Path $indfile -Encoding UTF8 -Raw
$indData = ConvertFrom-Json $indJson
$indData.projectId = $projectId
$indBody = ConvertTo-Json -InputObject $indData -Depth 10
$indBytes = [System.Text.Encoding]::UTF8.GetBytes($indBody)
$indResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $indBytes

Write-Host "Individual card created: $($indResp.data._id)" -ForegroundColor Green

Write-Host "Complete!" -ForegroundColor Green
