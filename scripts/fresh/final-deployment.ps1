# Clean all projects and deploy fresh with correct data

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
Write-Host "Deleting old projects..." -ForegroundColor Red
try {
    $all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
    foreach ($p in $all.data) {
        Invoke-RestMethod -Uri "$url/projects/$($p._id)" -Method Delete -Headers $h -ErrorAction SilentlyContinue | Out-Null
        Start-Sleep -Milliseconds 200
    }
}catch { }

Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Create all 7 projects with FIXED files
Write-Host "Creating 7 projects..." -ForegroundColor Yellow

$projectFiles = @(
    "project-0-data-fixed.json",
    "project-1-data-fixed.json",
    "project-2-data-fixed.json",
    "project-3-data-fixed.json",
    "project-4-data-fixed.json",
    "project-5-data-fixed.json",
    "project-6-data-fixed.json"
)

foreach ($file in $projectFiles) {
    $json = Get-Content "$dir\$file" -Encoding UTF8 -Raw
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    
    try {
        $result = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $body
        Write-Host "[OK] $($result.data.title)" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Error with $file" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`nWaiting 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Final verification
Write-Host "`nFinal Status:" -ForegroundColor Yellow
$final = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Total: $($final.data.Count) projects" -ForegroundColor Cyan
$final.data | Sort-Object -Property projectOrder -ErrorAction SilentlyContinue | ForEach-Object {
    $order = if ($_.projectOrder) { $_.projectOrder } else { "?" }
    $title = $_.title.Substring(0, [Math]::Min(50, $_.title.Length))
    Write-Host "  [$order] $title" -ForegroundColor Green
}
