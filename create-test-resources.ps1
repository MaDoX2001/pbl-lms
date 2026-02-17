$api = "https://pbl-lms-backend.onrender.com/api"

# Login
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -ContentType "application/json" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"}

Write-Host "Creating test resources..." -ForegroundColor Cyan

# Resource 1
$r1 = '{
  "title": "Arduino Tutorial 1",
  "resourceType": "video",
  "category": "البرمجة",
  "difficulty": "مبتدئ",
  "description": "Learn Arduino basics",
  "fileUrl": "https://www.youtube.com/embed/DINvsFDeMWc",
  "tags": "Arduino,learning"
}'
$r1b = [System.Text.Encoding]::UTF8.GetBytes($r1)
$cr1 = Invoke-RestMethod -Uri "$api/resources/support/upload" -Method Post -Headers $h -ContentType "application/json" -Body $r1b
Write-Host "1. $($cr1.data.title) - Approved: $($cr1.data.isApproved)" -ForegroundColor Green

# Resource 2
$r2 = '{
  "title": "Python Tutorial 2",
  "resourceType": "video",
  "category": "البرمجة",
  "difficulty": "متوسط",
  "description": "Python programming guide",
  "fileUrl": "https://www.youtube.com/embed/LjjQXwQQ5tw",
  "tags": "Python,programming"
}'
$r2b = [System.Text.Encoding]::UTF8.GetBytes($r2)
$cr2 = Invoke-RestMethod -Uri "$api/resources/support/upload" -Method Post -Headers $h -ContentType "application/json" -Body $r2b
Write-Host "2. $($cr2.data.title) - Approved: $($cr2.data.isApproved)" -ForegroundColor Green

# Resource 3  
$r3 = '{
  "title": "Web Development Guide",
  "resourceType": "document",
  "category": "البرمجة",
  "difficulty": "متقدم",
  "description": "Complete web development course",
  "fileUrl": "https://example.com/web-guide.pdf",
  "tags": "web,HTML,CSS,JavaScript"
}'
$r3b = [System.Text.Encoding]::UTF8.GetBytes($r3)
$cr3 = Invoke-RestMethod -Uri "$api/resources/support/upload" -Method Post -Headers $h -ContentType "application/json" -Body $r3b
Write-Host "3. $($cr3.data.title) - Approved: $($cr3.data.isApproved)" -ForegroundColor Green

# Verify list
Write-Host "`nVerifying resources..." -ForegroundColor Cyan
$list = Invoke-RestMethod -Uri "$api/resources/support" -Method Get
Write-Host "Total resources: $($list.count)" -ForegroundColor Green
$list.data | ForEach-Object {
    Write-Host "  - $($_.title)" -ForegroundColor Cyan
}
