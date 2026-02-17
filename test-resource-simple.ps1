#!/usr/bin/env pwsh
[System.Text.Encoding]::UTF8 | Out-Null

# Test: Create a resource via API

$url = "https://pbl-lms-backend.onrender.com/api"

# Step 1: Login
Write-Host "Step 1: Logging in..."
$json = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
try {
    $login = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
    $token = $login.data.token
    Write-Host "OK: Logged in" -ForegroundColor Green
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Upload resource
Write-Host "Step 2: Creating resource..." 
$resourceJson = '{"title":"Arduino Tutorial","description":"Learn Arduino basics","resourceType":"video","category":"البرمجة","difficulty":"مبتدئ","tags":"Arduino","fileUrl":"https://www.youtube.com/embed/123"}'
$resourceBytes = [System.Text.Encoding]::UTF8.GetBytes($resourceJson)
$header = @{"Authorization"="Bearer $token"}

try {
    $upload = Invoke-RestMethod -Uri "$url/resources/support/upload" -Method Post -Headers $header -Body $resourceBytes -ContentType "application/json; charset=utf-8"
    Write-Host "OK: Resource created" -ForegroundColor Green
    Write-Host "ID: $($upload.data._id)"
    Write-Host "Approved: $($upload.data.isApproved)"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Verify it appears in the list
Write-Host "Step 3: Fetching all resources..."
try {
    $list = Invoke-RestMethod -Uri "$url/resources/support" -Method Get -Headers $header
    Write-Host "OK: Found $($list.count) resources" -ForegroundColor Green
} catch {
    Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
