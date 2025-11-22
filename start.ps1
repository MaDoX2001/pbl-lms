# تشغيل Backend و Frontend معاً
Write-Host "🚀 بدء تشغيل منصة التعلم بالمشروعات..." -ForegroundColor Green

# التحقق من MongoDB
Write-Host "`n📊 التحقق من MongoDB..." -ForegroundColor Yellow
$mongoRunning = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $mongoRunning) {
    Write-Host "⚠️  MongoDB غير مشغل. يرجى تشغيل MongoDB أولاً." -ForegroundColor Red
    Write-Host "يمكنك تشغيله باستخدام: mongod --dbpath C:\data\db" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ MongoDB يعمل بنجاح" -ForegroundColor Green

# تشغيل Backend
Write-Host "`n🔧 تشغيل Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🔥 Backend Server' -ForegroundColor Cyan; npm run dev"

# انتظار 3 ثوان
Start-Sleep -Seconds 3

# تشغيل Frontend
Write-Host "🎨 تشغيل Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '⚛️  React Frontend' -ForegroundColor Magenta; npm run dev"

Write-Host "`n✨ تم تشغيل المنصة بنجاح!" -ForegroundColor Green
Write-Host "`n📍 الروابط:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "`nاضغط Ctrl+C لإيقاف السكريبت (ستحتاج لإغلاق نوافذ Backend و Frontend يدوياً)" -ForegroundColor Yellow
