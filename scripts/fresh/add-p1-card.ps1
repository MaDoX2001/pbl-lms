# Add evaluation cards for Project 1 (Group phase)

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

# Get Project 1 ID
$projects = Invoke-RestMethod -Uri "$url/projects" -Headers $h
$p1id = ($projects.data | Where-Object { $_.projectOrder -eq 2 })[0]._id
Write-Host "Project 1 ID: $p1id" -ForegroundColor Yellow

# Create group card for Project 1
$cardJson = Get-Content "$dir\p1-group-card-final.json" -Encoding UTF8 -Raw
$cardObj = $cardJson | ConvertFrom-Json
$cardObj | Add-Member -NotePropertyName "projectId" -NotePropertyValue $p1id -Force
$cardBody = ($cardObj | ConvertTo-Json -Depth 10)
$cardBytes = [System.Text.Encoding]::UTF8.GetBytes($cardBody)

Write-Host "Creating evaluation card..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$url/assessment/observation-card" -Method Post -Headers $h -Body $cardBytes
    Write-Host "Card created: $($result.data._id)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
