# Direct Card Addition with Known Project IDs

$backendUrl = "https://pbl-lms-backend.onrender.com/api"
$adminEmail = "admin@pbl-lms.com"
$adminPassword = "Admin@123456"

Write-Host "Adding evaluation cards to all projects..." -ForegroundColor Cyan

# Login
$loginJson = ConvertTo-Json @{ email = $adminEmail; password = $adminPassword }
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginJson)
$loginResp = Invoke-RestMethod -Uri "$backendUrl/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes
$token = $loginResp.data.token

$hdr = @{
    "Authorization" = "Bearer " + $token
    "Content-Type" = "application/json; charset=utf-8"
}

$freshDir = "c:\pbl-lms\scripts\fresh"

# Get project IDs from system
$allProj = Invoke-RestMethod -Uri "$backendUrl/projects" -Headers $hdr
$projects = @{}

foreach ($proj in $allProj.data) {
    $name = $proj.name
    if ($name -like "*Onboarding*") { $projects["0"] = $proj._id }
    elseif ($name -like "*Smart LED*") { $projects["1"] = $proj._id }
    elseif ($name -like "*Traffic*") { $projects["2"] = $proj._id }
    elseif ($name -like "*LDR*") { $projects["3"] = $proj._id }
    elseif ($name -like "*Alarm*") { $projects["4"] = $proj._id }
    elseif ($name -like "*Temperature*") { $projects["5"] = $proj._id }
    elseif ($name -like "*Environmental*") { $projects["6"] = $proj._id }
}

Write-Host "Found projects:" -ForegroundColor Green
$projects.Keys | Sort-Object | ForEach-Object { Write-Host ("  Project {0}: {1}" -f $_, $projects[$_]) }

# Add cards for each project
for ($i = 0; $i -le 6; $i++) {
    if (-not $projects.ContainsKey([string]$i)) { continue }
    
    $projId = $projects[[string]$i]
    Write-Host "`nProject $i ($projId):" -ForegroundColor Yellow
    
    # Add group card (skip for project 0)
    if ($i -ne 0) {
        $groupFile = "$freshDir\project-$i-group-card.json"
        $groupJson = Get-Content -Path $groupFile -Encoding UTF8 -Raw
        
        # Add projectId directly in the JSON
        $groupJson = $groupJson -replace '("projectId"\s*:\s*)"[^"]*"', "`$1`"$projId`""
        if ($groupJson -notmatch '"projectId"') {
            $groupJson = $groupJson -replace '(\{)(\s*")', "`$1`"projectId`":`"$projId`",`$2"
        }
        
        $groupBytes = [System.Text.Encoding]::UTF8.GetBytes($groupJson)
        $groupResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $groupBytes
        Write-Host "  Group card: $($groupResp.data._id)" -ForegroundColor Green
    }
    
    # Add individual card
    $indFile = "$freshDir\project-$i-individual-card.json"
    $indJson = Get-Content -Path $indFile -Encoding UTF8 -Raw
    
    # Add projectId directly in the JSON
    $indJson = $indJson -replace '("projectId"\s*:\s*)"[^"]*"', "`$1`"$projId`""
    if ($indJson -notmatch '"projectId"') {
        $indJson = $indJson -replace '(\{)(\s*")', "`$1`"projectId`":`"$projId`",`$2"
    }
    
    $indBytes = [System.Text.Encoding]::UTF8.GetBytes($indJson)
    $indResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $indBytes
    Write-Host "  Individual card: $($indResp.data._id)" -ForegroundColor Green
}

Write-Host "All cards added successfully!" -ForegroundColor Cyan
