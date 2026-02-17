# Upload a test resource as admin

$url = "https://pbl-lms-backend.onrender.com/api"

# Login as admin
Write-Host "Logging in as admin..." -ForegroundColor Yellow
$loginObj = @{
    email = "admin@pbl-lms.com"
    password = "Admin@123456"
}
$login = $loginObj | ConvertTo-Json

$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"}
Write-Host "✓ Logged in as admin" -ForegroundColor Green

# Create test resource JSON
$testResourceObj = @{
    title = "شرح لوحة Arduino للمبتدئين"
    description = "شرح شامل وسهل لاستخدام لوحة Arduino مع أمثلة عملية"
    resourceType = "video"
    category = "البرمجة"
    difficulty = "مبتدئ"
    tags = "Arduino, البرمجة, للمبتدئين"
    fileUrl = "https://www.youtube.com/embed/DINvsFDeMWc"
    externalUrl = "https://www.youtube.com/watch?v=DINvsFDeMWc"
}
$testResourceJson = $testResourceObj | ConvertTo-Json

$body = [System.Text.Encoding]::UTF8.GetBytes($testResourceJson)

Write-Host "Uploading test resource..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$url/resources/support/upload" -Method Post -Headers $h -Body $body -ContentType "application/json; charset=utf-8"
    
    if ($response.success) {
        Write-Host "SUCCESS: Resource uploaded!" -ForegroundColor Green
        Write-Host "ID: $($response.data._id)" -ForegroundColor Cyan
        Write-Host "Title: $($response.data.title)" -ForegroundColor Cyan
        Write-Host "Approved: $($response.data.isApproved)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ERROR uploading resource:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Get all resources
Write-Host "`nFetching all resources..." -ForegroundColor Yellow
try {
    $allResources = Invoke-RestMethod -Uri "$url/resources/support" -Method Get -Headers $h
    Write-Host "Total resources: $($allResources.count)" -ForegroundColor Cyan
    
    if ($allResources.data.Count -gt 0) {
        $allResources.data | ForEach-Object {
            Write-Host "  - $($_.title)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Error fetching: $($_.Exception.Message)" -ForegroundColor Red
}
