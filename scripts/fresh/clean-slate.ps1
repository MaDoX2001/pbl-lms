# Delete ALL projects and start fresh

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

# Delete all projects
Write-Host "Deleting all projects..." -ForegroundColor Red
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
foreach ($p in $all.data) {
    try {
        Invoke-RestMethod -Uri "$url/projects/$($p._id)" -Method Delete -Headers $h | Out-Null
        Write-Host "Deleted: $($p._id)" -ForegroundColor Cyan
    } catch {
        Write-Host "Could not delete $($p._id)" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Verify all deleted
Write-Host "Verifying deletion..." -ForegroundColor Yellow
$check = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Remaining projects: $($check.data.Count)" -ForegroundColor Cyan

if ($check.data.Count -eq 0) {
    Write-Host "Success! Database is clean." -ForegroundColor Green
} else {
    Write-Host "WARNING: Some projects still exist!" -ForegroundColor Red
    $check.data | ForEach-Object { Write-Host "- $($_._id)" -ForegroundColor Yellow }
}
