# Fresh Start - Delete All Projects and Recreate 0-6

$backendUrl = "https://pbl-lms-backend.onrender.com/api"
$adminEmail = "admin@pbl-lms.com"
$adminPassword = "Admin@123456"

Write-Host "Logging in..." -ForegroundColor Yellow

$loginJson = ConvertTo-Json @{ email = $adminEmail; password = $adminPassword }
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginJson)
$loginResp = Invoke-RestMethod -Uri "$backendUrl/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes

$token = $loginResp.data.token
Write-Host "Logged in" -ForegroundColor Green

$hdr = @{
    "Authorization" = "Bearer " + $token
    "Content-Type" = "application/json; charset=utf-8"
}

Write-Host "Getting all projects..." -ForegroundColor Yellow
$getAllResp = Invoke-RestMethod -Uri "$backendUrl/projects" -Headers $hdr
$allProjects = $getAllResp.data

Write-Host "Deleting $($allProjects.Count) projects..." -ForegroundColor Yellow

foreach ($project in $allProjects) {
    $projectId = $project._id
    Invoke-RestMethod -Uri "$backendUrl/projects/$projectId" -Method Delete -Headers $hdr | Out-Null
    Write-Host "Deleted: $($project.name)" -ForegroundColor Green
}

Write-Host "All projects deleted" -ForegroundColor Green

Write-Host "Creating new projects..." -ForegroundColor Yellow

$freshDir = "c:\pbl-lms\scripts\fresh"

# Project 0
$dataFile = "$freshDir\project-0-data.json"
$projectJson = Get-Content -Path $dataFile -Encoding UTF8 -Raw
$projectData = ConvertFrom-Json $projectJson
$projectBody = ConvertTo-Json -InputObject $projectData -Depth 10
$projectBytes = [System.Text.Encoding]::UTF8.GetBytes($projectBody)
$proj0Resp = Invoke-RestMethod -Uri "$backendUrl/projects" -Method Post -Headers $hdr -Body $projectBytes
$proj0Id = $proj0Resp.data._id
Write-Host "Project 0 created: $proj0Id" -ForegroundColor Green

$indFile = "$freshDir\project-0-individual-card.json"
$indJson = Get-Content -Path $indFile -Encoding UTF8 -Raw
$indData = ConvertFrom-Json $indJson
$indData.projectId = $proj0Id
$indBody = ConvertTo-Json -InputObject $indData -Depth 10
$indBytes = [System.Text.Encoding]::UTF8.GetBytes($indBody)
$indResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $indBytes
Write-Host "Project 0 card created" -ForegroundColor Green

# Projects 1-6
for ($i = 1; $i -le 6; $i++) {
    Write-Host "Creating project $i..." -ForegroundColor Yellow
    
    $dataFile = "$freshDir\project-$i-data.json"
    $projectJson = Get-Content -Path $dataFile -Encoding UTF8 -Raw
    $projectData = ConvertFrom-Json $projectJson
    $projectBody = ConvertTo-Json -InputObject $projectData -Depth 10
    $projectBytes = [System.Text.Encoding]::UTF8.GetBytes($projectBody)
    
    $projResp = Invoke-RestMethod -Uri "$backendUrl/projects" -Method Post -Headers $hdr -Body $projectBytes
    $projId = $projResp.data._id
    Write-Host "Project $i created: $projId" -ForegroundColor Green
    
    # Group Card
    $groupFile = "$freshDir\project-$i-group-card.json"
    $groupJson = Get-Content -Path $groupFile -Encoding UTF8 -Raw
    $groupData = ConvertFrom-Json $groupJson
    $groupData.projectId = $projId
    $groupBody = ConvertTo-Json -InputObject $groupData -Depth 10
    $groupBytes = [System.Text.Encoding]::UTF8.GetBytes($groupBody)
    
    $groupResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $groupBytes
    Write-Host "Group card created" -ForegroundColor Green
    
    # Individual Card
    $indFile = "$freshDir\project-$i-individual-card.json"
    $indJson = Get-Content -Path $indFile -Encoding UTF8 -Raw
    $indData = ConvertFrom-Json $indJson
    $indData.projectId = $projId
    $indBody = ConvertTo-Json -InputObject $indData -Depth 10
    $indBytes = [System.Text.Encoding]::UTF8.GetBytes($indBody)
    
    $indResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $indBytes
    Write-Host "Individual card created" -ForegroundColor Green
}

Write-Host "Complete!" -ForegroundColor Cyan
