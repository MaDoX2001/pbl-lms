# إعداد المشروع من الصفر
Write-Host "🎯 إعداد منصة التعلم بالمشروعات..." -ForegroundColor Green

# إنشاء ملفات .env من الأمثلة
Write-Host "`n📄 إنشاء ملفات البيئة..." -ForegroundColor Yellow

# Backend .env
if (Test-Path "backend\.env") {
    Write-Host "⚠️  backend\.env موجود بالفعل، سيتم تخطيه" -ForegroundColor Yellow
} else {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ تم إنشاء backend\.env" -ForegroundColor Green
}

# Frontend .env
if (Test-Path "frontend\.env") {
    Write-Host "⚠️  frontend\.env موجود بالفعل، سيتم تخطيه" -ForegroundColor Yellow
} else {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "✅ تم إنشاء frontend\.env" -ForegroundColor Green
}

Write-Host "`n📦 تثبيت الحزم..." -ForegroundColor Yellow
& .\install.ps1

Write-Host "`n✨ تم إعداد المشروع بنجاح!" -ForegroundColor Green
Write-Host "`n📝 ملاحظات مهمة:" -ForegroundColor Cyan
Write-Host "   1. تأكد من تشغيل MongoDB على localhost:27017" -ForegroundColor White
Write-Host "   2. راجع ملف backend\.env وقم بتعديل الإعدادات حسب الحاجة" -ForegroundColor White
Write-Host "   3. يمكنك الآن تشغيل المشروع باستخدام: .\start.ps1" -ForegroundColor White
Write-Host "`n🚀 للبدء الآن، شغل: .\start.ps1" -ForegroundColor Green
