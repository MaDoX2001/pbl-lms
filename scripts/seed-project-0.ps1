# Script to create observation card for Project 0: Arduino LED Intro
# Run with: .\scripts\seed-project-0.ps1

$token = Read-Host "Enter admin token"
$projectId = "698e4343d287e2bd028d9465"

Write-Host "Creating observation card for Project 0..." -ForegroundColor Cyan

$individualCard = @{
  projectId = $projectId
  phase = "individual_oral"
  sections = @(
    @{
      name = "التعامل مع المنصة الرقمية"
      weight = 40
      criteria = @(
        @{
          name = "إنشاء الحساب وتسجيل الدخول"
          description = "نجاح الطالب في إنشاء حساب والدخول للمنصة"
          maxScore = 20
        },
        @{
          name = "التنقل داخل المنصة"
          description = "قدرة الطالب على التنقل بين أقسام المنصة وفتح المحاكاة"
          maxScore = 20
        }
      )
    },
    @{
      name = "التنفيذ البرمجي"
      weight = 60
      criteria = @(
        @{
          name = "اختيار لوحة Arduino"
          description = "اختيار اللوحة الصحيحة داخل المحاكاة"
          maxScore = 20
        },
        @{
          name = "التحكم في LED الداخلي"
          description = "كتابة برنامج صحيح لتشغيل وإيقاف LED الداخلي"
          maxScore = 40
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

$bytes = [System.Text.Encoding]::UTF8.GetBytes($individualCard)

try {
  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "https://pbl-lms-backend.onrender.com/api/assessment/observation-card" `
    -Headers @{ 
      Authorization = "Bearer $token"
      "Content-Type" = "application/json; charset=utf-8"
    } `
    -Body $bytes

  Write-Host "✅ Observation card created successfully!" -ForegroundColor Green
  Write-Host "Card ID: $($response.data._id)" -ForegroundColor Yellow
} catch {
  Write-Host "❌ Error creating observation card:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
}
