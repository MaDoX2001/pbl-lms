# Create all projects with fixed isPublished field

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login once
Write-Host "Logging in..." -ForegroundColor Yellow
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}
Write-Host "Token obtained" -ForegroundColor Green

# Delete all existing projects first
Write-Host "Deleting existing projects..." -ForegroundColor Yellow
try {
    $allProjects = Invoke-RestMethod -Uri "$url/projects/all" -Headers $h -ErrorAction SilentlyContinue
    if ($allProjects.data.Count -gt 0) {
        foreach ($p in $allProjects.data) {
            Invoke-RestMethod -Uri "$url/projects/$($p._id)" -Method Delete -Headers $h | Out-Null
            Write-Host "Deleted: $($p.name)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "No projects to delete or error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "Creating projects..." -ForegroundColor Yellow
$ids = @{}

for ($i = 0; $i -le 6; $i++) {
    $dataFile = "$dir\project-$i-data.json"
    $json = Get-Content $dataFile -Encoding UTF8 -Raw
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    
    $resp = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $body
    $id = $resp.data._id
    $ids[$i] = $id
    Write-Host "Project $i created: $id" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify all projects exist
Write-Host "Verifying projects..." -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total projects found: $($all.data.Count)" -ForegroundColor Yellow
$all.data | ForEach-Object { Write-Host "- $($_.name) (ID: $($_._id))" -ForegroundColor Green }
