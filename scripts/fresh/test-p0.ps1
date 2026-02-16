# Test Project 0 with debugging

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

Write-Host "Testing Project 0 creation with detailed error..." -ForegroundColor Yellow
$p0json = Get-Content "$dir\project-0-data-fixed.json" -Encoding UTF8 -Raw
Write-Host "JSON length: $($p0json.Length) characters" -ForegroundColor Cyan
$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)

try {
    $p0r = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p0b -Verbose
    Write-Host "Success!" -ForegroundColor Green
} catch {
    Write-Host "Error status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    
    # Try with minimal data for Project 0
    Write-Host "`nTrying with minimal Project 0 data..." -ForegroundColor Yellow
    $minimal = @{
        title = "مشروع التمهيد - LED"
        description = "اختبار"
        difficulty = "beginner"
        projectLevel = "beginner"
        points = 0
        projectOrder = 0
        isPublished = $true
        isTeamProject = $false
        estimatedDuration = 4
    } | ConvertTo-Json
    
    $mb = [System.Text.Encoding]::UTF8.GetBytes($minimal)
    $mr = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $mb -Verbose
    if ($mr.success) {
        Write-Host "Minimal worked! ID: $($mr.data._id)" -ForegroundColor Green
    }
}
