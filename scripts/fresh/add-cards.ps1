# Add Evaluation Cards to All Projects

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
$allProj = Invoke-RestMethod -Uri "$backendUrl/projects" -Headers $hdr
$projects = $allProj.data

$freshDir = "c:\pbl-lms\scripts\fresh"

foreach ($proj in $projects) {
    $projId = $proj._id
    $projNum = if ($proj.name -like "*Onboarding*") { 0 } `
               elseif ($proj.name -like "*Smart LED*") { 1 } `
               elseif ($proj.name -like "*Traffic*") { 2 } `
               elseif ($proj.name -like "*LDR*") { 3 } `
               elseif ($proj.name -like "*Alarm*") { 4 } `
               elseif ($proj.name -like "*Temperature*") { 5 } `
               elseif ($proj.name -like "*Environmental*") { 6 } `
               else { -1 }
    
    if ($projNum -eq -1) { continue }
    
    Write-Host "Adding cards for Project $projNum..." -ForegroundColor Yellow
    
    # Add group card if not project 0
    if ($projNum -ne 0) {
        $groupFile = "$freshDir\project-$projNum-group-card.json"
        $groupJson = Get-Content -Path $groupFile -Encoding UTF8 -Raw
        
        # Parse and modify the JSON string directly
        $groupModified = $groupJson -replace '"projectId":"[^"]*"', "`"projectId`":`"$projId`""
        if ($groupModified -notmatch '"projectId"') {
            $groupModified = $groupModified -replace '({)', "`$1`"projectId`":`"$projId`","
        }
        
        $groupBytes = [System.Text.Encoding]::UTF8.GetBytes($groupModified)
        
        $groupResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $groupBytes
        Write-Host "  Group card: OK" -ForegroundColor Green
    }
    
    # Add individual card
    $indFile = "$freshDir\project-$projNum-individual-card.json"
    $indJson = Get-Content -Path $indFile -Encoding UTF8 -Raw
    
    # Parse and modify the JSON string directly
    $indModified = $indJson -replace '"projectId":"[^"]*"', "`"projectId`":`"$projId`""
    if ($indModified -notmatch '"projectId"') {
        $indModified = $indModified -replace '({)', "`$1`"projectId`":`"$projId`","
    }
    
    $indBytes = [System.Text.Encoding]::UTF8.GetBytes($indModified)
    
    $indResp = Invoke-RestMethod -Uri "$backendUrl/assessment/observation-card" -Method Post -Headers $hdr -Body $indBytes
    Write-Host "  Individual card: OK" -ForegroundColor Green
}

Write-Host "`nAll cards added successfully!" -ForegroundColor Cyan
