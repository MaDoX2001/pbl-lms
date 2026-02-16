# Create Project 0 using Invoke-RestMethod (simpler)

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

Write-Host "Creating Project 0..." -ForegroundColor Yellow
$p0json = Get-Content "$dir\project-0-data-fixed.json" -Encoding UTF8 -Raw
$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)

try {
    $result = Invoke-RestMethod -Uri "$url/projects" -Method Post -Headers $h -Body $p0b
    Write-Host "Project created successfully!" -ForegroundColor Green
    Write-Host "ID: $($result.data._id)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# List all projects
Write-Host "All projects:" -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$url/projects" -Headers $h
$all.data | Sort-Object -Property {[int]$_.projectOrder} -ErrorAction SilentlyContinue | ForEach-Object {
  $order = if ($_.projectOrder) { "[$($_.projectOrder)]" } else { "[?]" }
  Write-Host "$order $($_.title)" -ForegroundColor Green
}
Write-Host "Total: $($all.data.Count)" -ForegroundColor Cyan
