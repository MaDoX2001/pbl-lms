# Create simple Project 0 without problematic fields

$url = "https://pbl-lms-backend.onrender.com/api"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

Write-Host "Creating Project 0 with minimal fields..." -ForegroundColor Yellow

# Use a simple, minimal JSON from file to avoid PowerShell encoding issues
$p0JsonPath = "c:\pbl-lms\scripts\fresh\project-0-data-fixed.json"
$p0json = Get-Content $p0JsonPath -Encoding UTF8 -Raw

$p0b = [System.Text.Encoding]::UTF8.GetBytes($p0json)
Write-Host "Payload size: $($p0b.Length) bytes" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$url/projects" -Method Post -Headers $h -Body $p0b -ContentType "application/json; charset=utf-8" -UseBasicParsing -ErrorAction Stop
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Success: $($data.success)" -ForegroundColor Green
    Write-Host "Project ID: $($data.data._id)" -ForegroundColor Green
    Write-Host "Project Title: $($data.data.title)" -ForegroundColor Green
} catch {
    Write-Host "Failed with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $responseBody = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($responseBody)
    $errorContent = $reader.ReadToEnd()
    Write-Host "Response body: $errorContent" -ForegroundColor Red
}
