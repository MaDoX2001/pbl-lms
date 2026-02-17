$url = "https://pbl-lms-backend.onrender.com/api"

# Login
$body = @{
    email = "admin@pbl-lms.com"
    password = "Admin@123456"
}
$json = ConvertTo-Json -InputObject $body
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$resp = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
$token = $resp.data.token

Write-Host "Logged in successfully" -ForegroundColor Green

# Create resource
$resourceBody = @{
    title = "شرح لوحة Arduino للمبتدئين"
    description = "مصدر تعليمي شامل"
    resourceType = "video"
    category = "البرمجة"
    difficulty = "مبتدئ"
    tags = "Arduino, البرمجة"
    fileUrl = "https://www.youtube.com/embed/DINvsFDeMWc"
}
$resourceJson = ConvertTo-Json -InputObject $resourceBody
$resourceBytes = [System.Text.Encoding]::UTF8.GetBytes($resourceJson)
$header = @{"Authorization"="Bearer $token"}

$uploadResp = Invoke-RestMethod -Uri "$url/resources/support/upload" -Method Post -Headers $header -Body $resourceBytes -ContentType "application/json; charset=utf-8"
Write-Host "Resource created!" -ForegroundColor Green
Write-Host "ID: $($uploadResp.data._id)" -ForegroundColor Cyan
Write-Host "Title: $($uploadResp.data.title)" -ForegroundColor Cyan
Write-Host "Approved: $($uploadResp.data.isApproved)" -ForegroundColor Cyan
