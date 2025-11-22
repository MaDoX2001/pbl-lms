# نموذج بيانات تجريبية للمشروع
Write-Host "🌱 إضافة بيانات تجريبية..." -ForegroundColor Green

$backendUrl = "http://localhost:5000/api"

# التحقق من تشغيل الخادم
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ الخادم يعمل بنجاح" -ForegroundColor Green
} catch {
    Write-Host "❌ الخادم غير متاح. يرجى تشغيل Backend أولاً باستخدام: cd backend; npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "`n📝 إنشاء حسابات تجريبية..." -ForegroundColor Yellow

# إنشاء حساب طالب
$studentData = @{
    name = "أحمد محمد"
    email = "student@example.com"
    password = "password123"
    role = "student"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/auth/register" -Method POST -Body $studentData -ContentType "application/json"
    Write-Host "✅ تم إنشاء حساب الطالب: student@example.com" -ForegroundColor Green
} catch {
    Write-Host "⚠️  حساب الطالب موجود بالفعل أو حدث خطأ" -ForegroundColor Yellow
}

# إنشاء حساب معلم
$teacherData = @{
    name = "فاطمة أحمد"
    email = "teacher@example.com"
    password = "password123"
    role = "teacher"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/auth/register" -Method POST -Body $teacherData -ContentType "application/json"
    Write-Host "✅ تم إنشاء حساب المعلم: teacher@example.com" -ForegroundColor Green
    
    # حفظ token المعلم لإنشاء المشاريع
    $teacherToken = ($response.Content | ConvertFrom-Json).data.token
    
    Write-Host "`n📚 إنشاء مشروع تجريبي..." -ForegroundColor Yellow
    
    # إنشاء مشروع تجريبي
    $projectData = @{
        title = "تطوير موقع ويب تفاعلي"
        description = "في هذا المشروع، ستتعلم كيفية بناء موقع ويب تفاعلي باستخدام HTML، CSS، وJavaScript. ستقوم بإنشاء صفحات متعددة مع تصميم متجاوب يعمل على جميع الأجهزة."
        shortDescription = "تعلم بناء موقع ويب تفاعلي من الصفر"
        difficulty = "beginner"
        category = "web"
        technologies = @("HTML", "CSS", "JavaScript")
        objectives = @(
            "فهم أساسيات HTML وبناء هيكل الصفحة"
            "تطبيق تنسيقات CSS لتصميم جذاب"
            "إضافة تفاعلية باستخدام JavaScript"
            "إنشاء تصميم متجاوب"
        )
        milestones = @(
            @{
                title = "بناء هيكل HTML الأساسي"
                description = "إنشاء الصفحات الأساسية بـ HTML"
                order = 1
                points = 25
            },
            @{
                title = "تطبيق التنسيقات بـ CSS"
                description = "تصميم الموقع وجعله جذاباً"
                order = 2
                points = 25
            },
            @{
                title = "إضافة التفاعلية بـ JavaScript"
                description = "برمجة الوظائف التفاعلية"
                order = 3
                points = 25
            },
            @{
                title = "التصميم المتجاوب والاختبار"
                description = "ضمان عمل الموقع على جميع الأجهزة"
                order = 4
                points = 25
            }
        )
        estimatedDuration = 20
        points = 100
        isPublished = $true
        tags = @("web-development", "beginner", "frontend")
    } | ConvertTo-Json -Depth 10
    
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$backendUrl/projects" -Method POST -Body $projectData -Headers $headers
    Write-Host "✅ تم إنشاء مشروع تجريبي بنجاح" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  حساب المعلم موجود بالفعل أو حدث خطأ" -ForegroundColor Yellow
}

Write-Host "`n✨ تم إضافة البيانات التجريبية بنجاح!" -ForegroundColor Green
Write-Host "`n🔑 بيانات الدخول:" -ForegroundColor Cyan
Write-Host "   طالب:" -ForegroundColor White
Write-Host "      البريد: student@example.com" -ForegroundColor Gray
Write-Host "      كلمة المرور: password123" -ForegroundColor Gray
Write-Host "   معلم:" -ForegroundColor White
Write-Host "      البريد: teacher@example.com" -ForegroundColor Gray
Write-Host "      كلمة المرور: password123" -ForegroundColor Gray
