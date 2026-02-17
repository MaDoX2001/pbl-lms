$api = "https://pbl-lms-backend.onrender.com/api"

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Cyan
$json = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$login = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
$token = $login.data.token
Write-Host "OK: Token received" -ForegroundColor Green

# Step 2: Create a temporary text file to upload
Write-Host "Step 2: Creating test file..." -ForegroundColor Cyan
$testFile = "C:\temp\test-resource.txt"
if (-not (Test-Path "C:\temp")) { New-Item -Path "C:\temp" -ItemType Directory -Force | Out-Null }
"Arduino Tutorial - Basic Introduction" | Out-File $testFile -Encoding UTF8
Write-Host "OK: File created at $testFile" -ForegroundColor Green

# Step 3: Upload as multipart/form-data
Write-Host "Step 3: Uploading resource..." -ForegroundColor Cyan
$headers = @{"Authorization"="Bearer $token"}
$form = @{
    title = "Arduino Basics"
    description = "Learn Arduino programming"
    category = "برمجة"
    difficulty = "مبتدئ"
    resourceType = "document"
    tags = "Arduino,education"
}

try {
    # Create multipart form data body manually
    $boundary = [System.Guid]::NewGuid().ToString()
    $body = @()
    
    # Add form fields
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="title"'
    $body += ""
    $body += "Arduino Basics"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="description"'
    $body += ""
    $body += "Learn Arduino programming"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="category"'
    $body += ""
    $body += "برمجة"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="difficulty"'
    $body += ""
    $body += "مبتدئ"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="resourceType"'
    $body += ""
    $body += "document"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="tags"'
    $body += ""
    $body += "Arduino,education"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="file"; filename="test-resource.txt"'
    $body += "Content-Type: text/plain"
    $body += ""
    $body += (Get-Content $testFile -Raw)
    $body += "--$boundary--"
    
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($body -join "`r`n"))
    
    $response = Invoke-RestMethod -Uri "$api/resources/support/upload" `
        -Method Post `
        -Headers $headers `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyBytes
    
    Write-Host "OK: Resource created!" -ForegroundColor Green
    Write-Host "Resource ID: $($response.data._id)"
    Write-Host "Title: $($response.data.title)"
    Write-Host "Approved: $($response.data.isApproved)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Verify resources list
Write-Host "`nStep 4: Fetching all resources..." -ForegroundColor Cyan
$list = Invoke-RestMethod -Uri "$api/resources/support" -Method Get
Write-Host "Total resources: $($list.count)" -ForegroundColor Green
$list.data | ForEach-Object {
    Write-Host "  - $($_.title) (ID: $($PSItem._id))" -ForegroundColor Cyan
}
