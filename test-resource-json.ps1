$api = "https://pbl-lms-backend.onrender.com/api"

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Cyan
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($login)
$loginResp = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBytes
$token = $loginResp.data.token
Write-Host "OK: Logged in" -ForegroundColor Green

# Step 2: Upload resource with external URL
Write-Host "Step 2: Creating resource..." -ForegroundColor Cyan
$headers = @{"Authorization"="Bearer $token"}

$resource = '{
    "title": "Arduino Tutorial for Beginners",
    "description": "Complete Arduino programming guide with examples",
    "resourceType": "video",
    "category": "البرمجة",
    "difficulty": "مبتدئ",
    "tags": "Arduino,microcontroller,electronics",
    "externalUrl": "https://www.youtube.com/watch?v=DINvsFDeMWc",
    "fileUrl": "https://www.youtube.com/embed/DINvsFDeMWc"
}'

$body = [System.Text.Encoding]::UTF8.GetBytes($resource)

try {
    $response = Invoke-RestMethod -Uri "$api/resources/support/upload" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json; charset=utf-8" `
        -Body $body
    
    Write-Host "OK: Resource created!" -ForegroundColor Green
    Write-Host "ID: $($response.data._id)" 
    Write-Host "Title: $($response.data.title)"
    Write-Host "Approved: $($response.data.isApproved)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Verify
Write-Host "`nStep 3: Fetching resources..." -ForegroundColor Cyan
$list = Invoke-RestMethod -Uri "$api/resources/support" -Method Get
Write-Host "Total: $($list.count)" -ForegroundColor Green
if ($list.data) {
    $list.data | ForEach-Object { Write-Host "  - $($_.title)" -ForegroundColor Cyan }
}
