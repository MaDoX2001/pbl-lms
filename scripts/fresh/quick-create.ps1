# Quick Rebuild - Create All Projects

$url = "https://pbl-lms-backend.onrender.com/api"
$login = @{ email = "admin@pbl-lms.com"; password = "Admin@123456" } | ConvertTo-Json
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

$dir = "c:\pbl-lms\scripts\fresh"

Write-Host "Creating projects..." -ForegroundColor Yellow

# Project 0
$p0 = Get-Content "$dir\project-0-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb0 = [System.Text.Encoding]::UTF8.GetBytes(($p0 | ConvertTo-Json -Depth 10))
$r0 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb0
$id0 = $r0.data._id
Write-Host "Project 0: $id0" -ForegroundColor Green

# Project 1
$p1 = Get-Content "$dir\project-1-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb1 = [System.Text.Encoding]::UTF8.GetBytes(($p1 | ConvertTo-Json -Depth 10))
$r1 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb1
$id1 = $r1.data._id
Write-Host "Project 1: $id1" -ForegroundColor Green

# Project 2
$p2 = Get-Content "$dir\project-2-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb2 = [System.Text.Encoding]::UTF8.GetBytes(($p2 | ConvertTo-Json -Depth 10))
$r2 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb2
$id2 = $r2.data._id
Write-Host "Project 2: $id2" -ForegroundColor Green

# Project 3
$p3 = Get-Content "$dir\project-3-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb3 = [System.Text.Encoding]::UTF8.GetBytes(($p3 | ConvertTo-Json -Depth 10))
$r3 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb3
$id3 = $r3.data._id
Write-Host "Project 3: $id3" -ForegroundColor Green

# Project 4
$p4 = Get-Content "$dir\project-4-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb4 = [System.Text.Encoding]::UTF8.GetBytes(($p4 | ConvertTo-Json -Depth 10))
$r4 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb4
$id4 = $r4.data._id
Write-Host "Project 4: $id4" -ForegroundColor Green

# Project 5
$p5 = Get-Content "$dir\project-5-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb5 = [System.Text.Encoding]::UTF8.GetBytes(($p5 | ConvertTo-Json -Depth 10))
$r5 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb5
$id5 = $r5.data._id
Write-Host "Project 5: $id5" -ForegroundColor Green

# Project 6
$p6 = Get-Content "$dir\project-6-data.json" -Encoding UTF8 -Raw | ConvertFrom-Json
$pb6 = [System.Text.Encoding]::UTF8.GetBytes(($p6 | ConvertTo-Json -Depth 10))
$r6 = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $pb6
$id6 = $r6.data._id
Write-Host "Project 6: $id6" -ForegroundColor Green

# Now add the cards
Write-Host "`nAdding evaluation cards..." -ForegroundColor Yellow

# Project 0 Individual Card
$ic0 = Get-Content "$dir\project-0-individual-card.json" -Encoding UTF8 -Raw
$ic0 = $ic0 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id0`""
if ($ic0 -notmatch '"projectId"') {
    $ic0 = $ic0 -replace '({)', "`$1`"projectId`":`"$id0`","
}
$icb0 = [System.Text.Encoding]::UTF8.GetBytes($ic0)
$icr0 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb0
Write-Host "Project 0 card: OK" -ForegroundColor Green

# Project 1 Group Card
$gc1 = Get-Content "$dir\project-1-group-card.json" -Encoding UTF8 -Raw
$gc1 = $gc1 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id1`""
if ($gc1 -notmatch '"projectId"') {
    $gc1 = $gc1 -replace '({)', "`$1`"projectId`":`"$id1`","
}
$gcb1 = [System.Text.Encoding]::UTF8.GetBytes($gc1)
$gcr1 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb1
Write-Host "Project 1 group card: OK" -ForegroundColor Green

# Project 1 Individual Card
$ic1 = Get-Content "$dir\project-1-individual-card.json" -Encoding UTF8 -Raw
$ic1 = $ic1 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id1`""
if ($ic1 -notmatch '"projectId"') {
    $ic1 = $ic1 -replace '({)', "`$1`"projectId`":`"$id1`","
}
$icb1 = [System.Text.Encoding]::UTF8.GetBytes($ic1)
$icr1 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb1
Write-Host "Project 1 individual card: OK" -ForegroundColor Green

# Project 2 Group Card
$gc2 = Get-Content "$dir\project-2-group-card.json" -Encoding UTF8 -Raw
$gc2 = $gc2 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id2`""
if ($gc2 -notmatch '"projectId"') {
    $gc2 = $gc2 -replace '({)', "`$1`"projectId`":`"$id2`","
}
$gcb2 = [System.Text.Encoding]::UTF8.GetBytes($gc2)
$gcr2 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb2
Write-Host "Project 2 group card: OK" -ForegroundColor Green

# Project 2 Individual Card
$ic2 = Get-Content "$dir\project-2-individual-card.json" -Encoding UTF8 -Raw
$ic2 = $ic2 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id2`""
if ($ic2 -notmatch '"projectId"') {
    $ic2 = $ic2 -replace '({)', "`$1`"projectId`":`"$id2`","
}
$icb2 = [System.Text.Encoding]::UTF8.GetBytes($ic2)
$icr2 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb2
Write-Host "Project 2 individual card: OK" -ForegroundColor Green

# Project 3 Group Card
$gc3 = Get-Content "$dir\project-3-group-card.json" -Encoding UTF8 -Raw
$gc3 = $gc3 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id3`""
if ($gc3 -notmatch '"projectId"') {
    $gc3 = $gc3 -replace '({)', "`$1`"projectId`":`"$id3`","
}
$gcb3 = [System.Text.Encoding]::UTF8.GetBytes($gc3)
$gcr3 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb3
Write-Host "Project 3 group card: OK" -ForegroundColor Green

# Project 3 Individual Card
$ic3 = Get-Content "$dir\project-3-individual-card.json" -Encoding UTF8 -Raw
$ic3 = $ic3 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id3`""
if ($ic3 -notmatch '"projectId"') {
    $ic3 = $ic3 -replace '({)', "`$1`"projectId`":`"$id3`","
}
$icb3 = [System.Text.Encoding]::UTF8.GetBytes($ic3)
$icr3 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb3
Write-Host "Project 3 individual card: OK" -ForegroundColor Green

# Project 4 Group Card
$gc4 = Get-Content "$dir\project-4-group-card.json" -Encoding UTF8 -Raw
$gc4 = $gc4 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id4`""
if ($gc4 -notmatch '"projectId"') {
    $gc4 = $gc4 -replace '({)', "`$1`"projectId`":`"$id4`","
}
$gcb4 = [System.Text.Encoding]::UTF8.GetBytes($gc4)
$gcr4 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb4
Write-Host "Project 4 group card: OK" -ForegroundColor Green

# Project 4 Individual Card
$ic4 = Get-Content "$dir\project-4-individual-card.json" -Encoding UTF8 -Raw
$ic4 = $ic4 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id4`""
if ($ic4 -notmatch '"projectId"') {
    $ic4 = $ic4 -replace '({)', "`$1`"projectId`":`"$id4`","
}
$icb4 = [System.Text.Encoding]::UTF8.GetBytes($ic4)
$icr4 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb4
Write-Host "Project 4 individual card: OK" -ForegroundColor Green

# Project 5 Group Card
$gc5 = Get-Content "$dir\project-5-group-card.json" -Encoding UTF8 -Raw
$gc5 = $gc5 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id5`""
if ($gc5 -notmatch '"projectId"') {
    $gc5 = $gc5 -replace '({)', "`$1`"projectId`":`"$id5`","
}
$gcb5 = [System.Text.Encoding]::UTF8.GetBytes($gc5)
$gcr5 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb5
Write-Host "Project 5 group card: OK" -ForegroundColor Green

# Project 5 Individual Card
$ic5 = Get-Content "$dir\project-5-individual-card.json" -Encoding UTF8 -Raw
$ic5 = $ic5 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id5`""
if ($ic5 -notmatch '"projectId"') {
    $ic5 = $ic5 -replace '({)', "`$1`"projectId`":`"$id5`","
}
$icb5 = [System.Text.Encoding]::UTF8.GetBytes($ic5)
$icr5 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb5
Write-Host "Project 5 individual card: OK" -ForegroundColor Green

# Project 6 Group Card
$gc6 = Get-Content "$dir\project-6-group-card.json" -Encoding UTF8 -Raw
$gc6 = $gc6 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id6`""
if ($gc6 -notmatch '"projectId"') {
    $gc6 = $gc6 -replace '({)', "`$1`"projectId`":`"$id6`","
}
$gcb6 = [System.Text.Encoding]::UTF8.GetBytes($gc6)
$gcr6 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $gcb6
Write-Host "Project 6 group card: OK" -ForegroundColor Green

# Project 6 Individual Card
$ic6 = Get-Content "$dir\project-6-individual-card.json" -Encoding UTF8 -Raw
$ic6 = $ic6 -replace '"projectId"\s*:\s*"[^"]*"', "`"projectId`":`"$id6`""
if ($ic6 -notmatch '"projectId"') {
    $ic6 = $ic6 -replace '({)', "`$1`"projectId`":`"$id6`","
}
$icb6 = [System.Text.Encoding]::UTF8.GetBytes($ic6)
$icr6 = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $icb6
Write-Host "Project 6 individual card: OK" -ForegroundColor Green

Write-Host "`nDone! All projects and cards created." -ForegroundColor Cyan
