# Create Project 1: Smart LED Controller (Button → LED)
# Team project with dual-phase evaluation

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api"
)

# ==================== Helper Function ====================

function Invoke-ApiCall {
    param($Method, $Endpoint, $Body)
    
    $json = $Body | ConvertTo-Json -Depth 10
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    
    try {
        return Invoke-RestMethod `
            -Method $Method `
            -Uri "$ApiUrl/$Endpoint" `
            -Headers @{ 
                Authorization = "Bearer $Token"
                "Content-Type" = "application/json; charset=utf-8"
            } `
            -Body $bytes
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        exit 1
    }
}

# ==================== Project Data (Using JSON) ====================

$projectJson = @'
{
    "title": "Smart LED Controller (Button → LED)",
    "shortDescription": "تصميم نظام تحكم بسيط يستخدم زر Button للتحكم في تشغيل وإيقاف LED خارجي داخل بيئة المحاكاة.",
    "description": "يهدف هذا المشروع إلى نقل الطلاب من مرحلة التحكم في المخرجات الداخلية إلى التعامل مع المدخلات والمخرجات الخارجية داخل بيئة المحاكاة الرقمية.\nيقوم الطلاب بتصميم وتنفيذ نظام تحكم بسيط يعتمد على زر Button كمدخل، وLED كمخرج، باستخدام لوحة Arduino Uno.\nيركز المشروع على تنمية الفهم العملي لمفاهيم Input / Output، وبناء أول منطق تحكم شرطي، وتنمية مهارات العمل التعاوني القائم على الأدوار.\nكما يسهم المشروع في تطوير قدرة الطلاب على الربط بين التوصيلات داخل بيئة المحاكاة والمنطق البرمجي المستخدم للتحكم في المخرجات.",
    "difficulty": "beginner",
    "category": "other",
    "estimatedDuration": 8,
    "deadline": "2026-03-05T23:59:00",
    "points": 100,
    "isPublished": true,
    "objectives": [
        "أن يتمكن الطلاب من شرح مفهوم المدخل والمخرج في الأنظمة الذكية في ظل نظام Button → LED بدقة لا تقل عن 85%.",
        "أن يتمكن الطلاب من تنفيذ توصيل صحيح لزر Button وLED باستخدام لوحة Arduino Uno داخل بيئة المحاكاة دون أخطاء.",
        "أن يتمكن الطلاب من كتابة برنامج بسيط يستخدم digitalRead و digitalWrite للتحكم في تشغيل وإيقاف LED وفق حالة الزر بنسبة صحة لا تقل عن 85%."
    ],
    "showObjectives": true,
    "learningScenario": "1. يبدأ الطلاب بقراءة وصف المشكلة التعليمية وفهم فكرة التحكم اليدوي.\n2. يناقش الفريق دور Button كمدخل وLED كمخرج.\n3. يخطط الفريق لتصميم النظام داخل بيئة المحاكاة.\n4. ينفذ الطلاب التوصيلات الافتراضية للمكونات.\n5. يكتب الطالب المسؤول عن البرمجة الكود المطلوب.\n6. يختبر الفريق النظام ويتحقق من صحة التشغيل.\n7. يعدّ الفريق تقرير المشروع النهائي.",
    "teachingStrategy": "1. التعلم القائم على المشروعات\n2. التعلم التعاوني القائم على الأدوار",
    "finalReportNote": "يقوم الفريق بإعداد تقرير جماعي يوضح وصف المشكلة، فكرة الحل، التوصيلات المستخدمة، منطق البرنامج، ودور كل طالب، ويُعد التقرير المنتج النهائي للمشروع.",
    "isTeamProject": true,
    "hasObservationCard": true,
    "projectOrder": 1,
    "projectLevel": "beginner"
}
'@

$groupCardJson = @'
{
    "phase": "group",
    "sections": [
        {
            "name": "تصميم فكرة النظام",
            "weight": 30,
            "criteria": [
                {
                    "name": "تحديد المدخل والمخرج",
                    "description": "وضوح تحديد Button كمدخل وLED كمخرج",
                    "maxScore": 15
                },
                {
                    "name": "منطق فكرة الحل",
                    "description": "مناسبة فكرة التحكم باستخدام الزر",
                    "maxScore": 15
                }
            ]
        },
        {
            "name": "تنفيذ المحاكاة",
            "weight": 40,
            "criteria": [
                {
                    "name": "صحة التوصيلات",
                    "description": "تنفيذ توصيل Button وLED بصورة صحيحة",
                    "maxScore": 20
                },
                {
                    "name": "استقرار عمل النظام",
                    "description": "عمل المحاكاة دون أخطاء",
                    "maxScore": 20
                }
            ]
        },
        {
            "name": "المنتج النهائي",
            "weight": 30,
            "criteria": [
                {
                    "name": "تحقيق متطلبات المشروع",
                    "description": "التزام النظام بوظيفة التشغيل والإيقاف",
                    "maxScore": 30
                }
            ]
        }
    ]
}
'@

$individualCardJson = @'
{
    "phase": "individual_oral",
    "sections": [
        {
            "name": "الأداء الفردي حسب الدور",
            "weight": 60,
            "criteria": [
                {
                    "name": "تنفيذ مهام الدور",
                    "description": "إتقان الطالب لمهام دوره داخل الفريق",
                    "maxScore": 30
                },
                {
                    "name": "المساهمة التقنية",
                    "description": "جودة المساهمة في التصميم أو البرمجة",
                    "maxScore": 30
                }
            ]
        },
        {
            "name": "التقييم الشفهي",
            "weight": 40,
            "criteria": [
                {
                    "name": "وضوح الشرح",
                    "description": "قدرة الطالب على شرح فكرة النظام",
                    "maxScore": 20
                },
                {
                    "name": "تفسير منطق التحكم",
                    "description": "تفسير العلاقة بين الزر والـ LED",
                    "maxScore": 20
                }
            ]
        }
    ]
}
'@

# ==================== Script Execution ====================

Write-Host "`n=== Creating Project 1: Smart LED Controller ===" -ForegroundColor Cyan

# Create Project
$projectData = $projectJson | ConvertFrom-Json
$projectResponse = Invoke-ApiCall "Post" "projects" $projectData
$projectId = $projectResponse.data._id
Write-Host "✅ Project created with ID: $projectId" -ForegroundColor Green

# Create Group Phase Observation Card
Write-Host "`n=== Creating Group Phase Observation Card ===" -ForegroundColor Cyan
$groupCard = $groupCardJson | ConvertFrom-Json
$groupCard | Add-Member -MemberType NoteProperty -Name "projectId" -Value $projectId
$groupResponse = Invoke-ApiCall "Post" "assessment/observation-card" $groupCard
Write-Host "✅ Group observation card created" -ForegroundColor Green

# Create Individual + Oral Phase Observation Card
Write-Host "`n=== Creating Individual + Oral Phase Observation Card ===" -ForegroundColor Cyan
$individualCard = $individualCardJson | ConvertFrom-Json
$individualCard | Add-Member -MemberType NoteProperty -Name "projectId" -Value $projectId
$individualResponse = Invoke-ApiCall "Post" "assessment/observation-card" $individualCard
Write-Host "✅ Individual observation card created" -ForegroundColor Green

Write-Host "`n✅ Project 1 setup complete!" -ForegroundColor Green
Write-Host "Project URL: https://pbl-lms-phi.vercel.app/projects/$projectId" -ForegroundColor Yellow
Write-Host "`nProject Details:" -ForegroundColor Cyan
Write-Host "  - Title: Smart LED Controller (Button → LED)" -ForegroundColor White
Write-Host "  - Type: Team Project" -ForegroundColor White
Write-Host "  - Duration: 8 hours" -ForegroundColor White
Write-Host "  - Points: 100" -ForegroundColor White
Write-Host "  - Deadline: 2026-03-05" -ForegroundColor White
