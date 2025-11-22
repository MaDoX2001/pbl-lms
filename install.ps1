# تثبيت جميع الحزم المطلوبة
Write-Host "📦 تثبيت الحزم للمشروع..." -ForegroundColor Green

# Backend
Write-Host "`n🔧 تثبيت حزم Backend..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل تثبيت حزم Backend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تم تثبيت حزم Backend بنجاح" -ForegroundColor Green

# العودة للمجلد الرئيسي
Set-Location ..

# Frontend
Write-Host "`n🎨 تثبيت حزم Frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل تثبيت حزم Frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تم تثبيت حزم Frontend بنجاح" -ForegroundColor Green

# العودة للمجلد الرئيسي
Set-Location ..

Write-Host "`n✨ تم تثبيت جميع الحزم بنجاح!" -ForegroundColor Green
Write-Host "`n📝 الخطوات التالية:" -ForegroundColor Cyan
Write-Host "   1. تأكد من تشغيل MongoDB" -ForegroundColor White
Write-Host "   2. انسخ ملفات .env.example إلى .env في backend و frontend" -ForegroundColor White
Write-Host "   3. قم بتعديل إعدادات قاعدة البيانات في backend/.env" -ForegroundColor White
Write-Host "   4. شغل المشروع باستخدام: .\start.ps1" -ForegroundColor White
