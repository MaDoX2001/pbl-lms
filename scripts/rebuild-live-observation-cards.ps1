param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api",

    [Parameter(Mandatory=$false)]
    [switch]$DryRun,

    [Parameter(Mandatory=$false)]
    [switch]$OnlyPublished
)

$ErrorActionPreference = 'Stop'

function Invoke-ApiCall {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Endpoint,
        [Parameter(Mandatory=$false)]$Body = $null
    )

    $headers = @{
        Authorization = "Bearer $Token"
        "Content-Type" = "application/json; charset=utf-8"
    }

    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 30
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        return Invoke-RestMethod -Method $Method -Uri "$ApiUrl/$Endpoint" -Headers $headers -Body $bytes
    }

    return Invoke-RestMethod -Method $Method -Uri "$ApiUrl/$Endpoint" -Headers $headers
}

function Get-GroupScaleOptions {
    param([string]$CriterionName)

    return @(
        @{ percentage = 0;   description = "الأداء في '$CriterionName' غير متحقق، والمنتج لا يحقق المتطلب الأساسي." },
        @{ percentage = 20;  description = "الأداء في '$CriterionName' ضعيف جدًا، مع مشكلات واضحة تعوق جودة المشروع." },
        @{ percentage = 40;  description = "الأداء في '$CriterionName' مقبول جزئيًا، لكن توجد نواقص جوهرية تحتاج تحسين." },
        @{ percentage = 60;  description = "الأداء في '$CriterionName' متوسط ومقبول، مع ملاحظات يمكن معالجتها." },
        @{ percentage = 80;  description = "الأداء في '$CriterionName' جيد جدًا، والمشروع يعمل بجودة واضحة." },
        @{ percentage = 100; description = "الأداء في '$CriterionName' متقن بالكامل، والجودة ممتازة ومستقرة." }
    )
}

function Get-IndividualScaleOptions {
    param([string]$CriterionName)

    return @(
        @{ percentage = 0;   description = "لم يطبق الطالب مهارة '$CriterionName'." },
        @{ percentage = 20;  description = "تطبيق محدود جدًا لمهارة '$CriterionName' مع أخطاء أساسية." },
        @{ percentage = 40;  description = "تطبيق جزئي لمهارة '$CriterionName' ويحتاج دعمًا واضحًا." },
        @{ percentage = 60;  description = "تطبيق مقبول لمهارة '$CriterionName' مع بعض الأخطاء." },
        @{ percentage = 80;  description = "تطبيق جيد لمهارة '$CriterionName' مع دقة جيدة." },
        @{ percentage = 100; description = "تطبيق متقن وكامل لمهارة '$CriterionName' دون أخطاء مؤثرة." }
    )
}

function New-GroupCriterion {
    param([string]$Name)

    return @{
        name = $Name
        applicableRoles = @('all')
        options = Get-GroupScaleOptions -CriterionName $Name
    }
}

function New-IndividualCriterion {
    param([string]$Name)

    return @{
        name = $Name
        applicableRoles = @('all')
        options = Get-IndividualScaleOptions -CriterionName $Name
    }
}

function Contains-Any {
    param(
        [string]$Text,
        [string[]]$Needles
    )

    if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
    foreach ($n in $Needles) {
        if ($Text -match [regex]::Escape($n)) { return $true }
    }
    return $false
}

function Get-SkillCatalog {
    return @{
        CoreStructure = @(
            "أن يبني الهيكل الأساسي لبرنامج Arduino بشكل صحيح.",
            "أن يكتب كود منظم وخال من الأخطاء البرمجية."
        )
        BasicCommands = @(
            "أن ينظم توقيت تنفيذ الأوامر باستخدام delay.",
            "أن ينشيء مخرج تماثلي باستخدام analogWrite ضمن النطاق 0–255.",
            "أن يقرأ قيمة تماثلية باستخدام analogRead.",
            "أن يتحكم في مخرج رقمي باستخدام digitalWrite.",
            "أن يقرأ حالة مدخل رقمي باستخدام digitalRead.",
            "أن يهيئ المنافذ الرقمية كمدخلات أو مخرجات باستخدام pinMode.",
            "أن يوظف القيم المقروءة داخل منطق تحكم برمجي."
        )
        Ultrasonic = @(
            "أن يهيئ منفذ Trigger بصورة صحيحة.",
            "أن يهيئ منفذ Echo بصورة صحيحة.",
            "أن يولد نبضة إرسال قصيرة عبر منفذ Trigger.",
            "أن يقيس زمن عودة النبضة باستخدام pulseIn.",
            "أن يطبق قيمة حدية Distance Threshold للتحكم في مخرج."
        )
        PIR = @(
            "أن يوظف متوسط قراءات الحساس في اتخاذ قرار برمجي.",
            "أن ينشيء شرط برمجي للاستجابة عند اكتشاف الحركة.",
            "أن يعالج حالتي وجود الحركة وعدم وجودها باستخدام else-if."
        )
        Button = @(
            "أن يعالج حالتي الضغط وعدم الضغط باستخدام else-if.",
            "أن ينفذ تبديل حالة مخرج Toggle عند كل ضغطة زر.",
            "أن ينظم زمن الاستجابة لتقليل الاهتزاز البرمجي Debouncing."
        )
        LDR = @(
            "أن يحدد قيمة حدية Threshold للتحكم في الاستجابة.",
            "أن يطبق شرط برمجي للتحكم في مخرج بناءً على شدة الإضاءة."
        )
        DHT11 = @(
            "أن يدرج مكتبة DHT داخل البرنامج باستخدام #include.",
            "أن يستدعي الدالة dht.begin لتهيئة الحساس.",
            "أن يقرأ درجة الحرارة باستخدام readTemperature.",
            "أن يقرأ نسبة الرطوبة باستخدام readHumidity.",
            "أن يتحقق من القيم غير الصالحة NaN ومعالجتها برمجيًا."
        )
        LEDPWM = @(
            "أن يحدد قيمة الخرج الضوئي ضمن النطاق 0–255.",
            "أن ينشيء تدرج ضوئي باستخدام حلقة التكرار for.",
            "أن ينسق بين قراءة تماثلية مثل LDR ومستوى إضاءة LED برمجيًا."
        )
        Buzzer = @(
            "أن يولد نغمة صوتية محددة باستخدام tone.",
            "أن يوقف النغمة باستخدام noTone.",
            "أن يبرمج نمط إنذار زمني.",
            "أن يفعل صوت الإنذار عند تحقق شرط برمجي."
        )
        LCD = @(
            "أن يدرج مكتبة LiquidCrystal داخل البرنامج باستخدام #include.",
            "أن يعرف كائن الشاشة مع تحديد أطراف التوصيل داخل الكود.",
            "أن يهييء الشاشة باستخدام lcd.begin وفق عدد الصفوف والأعمدة.",
            "أن يعرض نصوص ثابتة باستخدام lcd.print.",
            "أن يحدد موضع الكتابة باستخدام lcd.setCursor.",
            "أن يجدد محتوى الشاشة باستخدام lcd.clear عند تحديث البيانات.",
            "أن ينظم عرض البيانات على أكثر من سطر بطريقة صحيحة."
        )
    }
}

function Get-GroupQualityCriteria {
    param($Project)

    $title = [string]($Project.title)
    $description = [string]($Project.description)
    $blob = "$title $description".ToLower()

    $criteria = @(
        "تحليل متطلبات المشروع وتحديد الهدف التشغيلي بوضوح.",
        "جودة التصميم العام وترابط أجزاء المشروع.",
        "جودة التوصيلات وتنظيم المكونات وسلامة التركيب.",
        "ملاءمة المكونات المختارة لتحقيق وظيفة المشروع.",
        "دقة منطق التشغيل العام للمشروع عبر سيناريوهات الاستخدام.",
        "استقرار عمل المشروع أثناء التشغيل المتكرر دون أعطال.",
        "جودة اختبار الفريق وتوثيق نتائج الاختبار والملاحظات.",
        "تحقيق المشروع للوظيفة المطلوبة كما هو موصوف في المهمة."
    )

    if (Contains-Any -Text $blob -Needles @('ultrasonic','مسافة','distance')) {
        $criteria += "دقة استجابة النظام لتغير المسافة ضمن الحدود المتوقعة."
    }
    if (Contains-Any -Text $blob -Needles @('حركة','pir')) {
        $criteria += "دقة استجابة النظام لحالات وجود الحركة وعدم وجودها."
    }
    if (Contains-Any -Text $blob -Needles @('إضاءة','ldr','light')) {
        $criteria += "ثبات أداء النظام في بيئات إضاءة مختلفة."
    }
    if (Contains-Any -Text $blob -Needles @('حرارة','رطوبة','dht','humidity','temperature')) {
        $criteria += "وضوح عرض القياسات واستقرار النتائج على واجهة المشروع."
    }

    return $criteria | Select-Object -Unique
}

function Get-IndividualSkillCriteriaForProject {
    param($Project)

    $catalog = Get-SkillCatalog
    $title = [string]($Project.title)
    $description = [string]($Project.description)
    $blob = "$title $description".ToLower()

    $selected = @()

    # Common foundational skills across all projects.
    $selected += $catalog.CoreStructure
    $selected += @(
        "أن ينظم توقيت تنفيذ الأوامر باستخدام delay.",
        "أن يهيئ المنافذ الرقمية كمدخلات أو مخرجات باستخدام pinMode.",
        "أن يقرأ حالة مدخل رقمي باستخدام digitalRead.",
        "أن يتحكم في مخرج رقمي باستخدام digitalWrite.",
        "أن يوظف القيم المقروءة داخل منطق تحكم برمجي."
    )

    if (Contains-Any -Text $blob -Needles @('التمهيدي')) {
        # Intro project keeps foundation only.
        return ($selected | Select-Object -Unique)
    }

    if (Contains-Any -Text $blob -Needles @('مدخل المستخدم','button','زر')) {
        $selected += $catalog.Button
    }

    if (Contains-Any -Text $blob -Needles @('التحكم الذكي في الإضاءة','ldr','إضاءة','light')) {
        $selected += @(
            "أن يقرأ قيمة تماثلية باستخدام analogRead.",
            "أن ينشيء مخرج تماثلي باستخدام analogWrite ضمن النطاق 0–255."
        )
        $selected += $catalog.LDR
        $selected += $catalog.LEDPWM
    }

    if (Contains-Any -Text $blob -Needles @('كشف الحركة','pir','الحركة')) {
        $selected += $catalog.PIR
        $selected += $catalog.Buzzer
    }

    if (Contains-Any -Text $blob -Needles @('المسافة','ultrasonic','distance','trigger','echo')) {
        $selected += $catalog.Ultrasonic
        $selected += $catalog.Buzzer
    }

    if (Contains-Any -Text $blob -Needles @('الحرارة','الرطوبة','dht','humidity','temperature')) {
        $selected += $catalog.DHT11
        $selected += $catalog.LCD
    }

    return ($selected | Select-Object -Unique)
}

function Build-GroupSections {
    param($Project)

    $groupCriteria = Get-GroupQualityCriteria -Project $Project
    $sec1 = @($groupCriteria | Select-Object -First 3)
    $sec2 = @($groupCriteria | Select-Object -Skip 3 -First 3)
    $sec3 = @($groupCriteria | Select-Object -Skip 6)

    return @(
        @{
            name = "جودة التصميم والتنفيذ الهندسي للمشروع"
            weight = 35
            criteria = $sec1 | ForEach-Object { New-GroupCriterion -Name $_ }
        },
        @{
            name = "جودة المنتج النهائي وكفاءة التشغيل"
            weight = 35
            criteria = $sec2 | ForEach-Object { New-GroupCriterion -Name $_ }
        },
        @{
            name = "جودة الاختبار والتوثيق وتحقيق الهدف"
            weight = 30
            criteria = $sec3 | ForEach-Object { New-GroupCriterion -Name $_ }
        }
    )
}

function Build-IndividualSections {
    param($Project)

    $skills = @(Get-IndividualSkillCriteriaForProject -Project $Project)

    $foundation = @($skills | Select-Object -First 4)
    $coreCommands = @($skills | Select-Object -Skip 4 -First 4)
    $specialized = @($skills | Select-Object -Skip 8)

    if ($specialized.Count -eq 0) {
        $specialized = @($coreCommands | Select-Object -Last 2)
    }

    return @(
        @{
            name = "مهارات بناء هيكل البرنامج"
            weight = 30
            criteria = $foundation | ForEach-Object { New-IndividualCriterion -Name $_ }
        },
        @{
            name = "مهارات الأوامر البرمجية الأساسية"
            weight = 30
            criteria = $coreCommands | ForEach-Object { New-IndividualCriterion -Name $_ }
        },
        @{
            name = "مهارات البرمجة التخصصية حسب المشروع"
            weight = 40
            criteria = $specialized | ForEach-Object { New-IndividualCriterion -Name $_ }
        }
    )
}

function Upsert-ObservationCard {
    param(
        [string]$ProjectId,
        [string]$Phase,
        [array]$Sections
    )

    try {
        $existing = Invoke-ApiCall -Method "Get" -Endpoint "assessment/observation-card/$ProjectId/$Phase"
        $cardId = $existing.data._id

        if ($DryRun) {
            Write-Host "[DryRun] Update card: project=$ProjectId phase=$Phase card=$cardId" -ForegroundColor Yellow
            return
        }

        Invoke-ApiCall -Method "Put" -Endpoint "assessment/observation-card/$cardId" -Body @{ sections = $Sections } | Out-Null
        Write-Host "✅ Updated $Phase card for project $ProjectId" -ForegroundColor Green
    } catch {
        $responseBody = ""
        if ($_.Exception.Response) {
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
            } catch {}
        }

        $isNotFound = $false
        if ($responseBody -match '404' -or $responseBody -match 'بطاقة الملاحظة غير موجودة') { $isNotFound = $true }
        if ($_.Exception.Message -match '404') { $isNotFound = $true }

        if (-not $isNotFound) {
            throw
        }

        if ($DryRun) {
            Write-Host "[DryRun] Create card: project=$ProjectId phase=$Phase" -ForegroundColor Yellow
            return
        }

        Invoke-ApiCall -Method "Post" -Endpoint "assessment/observation-card" -Body @{
            projectId = $ProjectId
            phase = $Phase
            sections = $Sections
        } | Out-Null

        Write-Host "✅ Created $Phase card for project $ProjectId" -ForegroundColor Green
    }
}

Write-Host "`n=== Rebuilding Observation Cards (Live) ===" -ForegroundColor Cyan
Write-Host "Concept: Group = تقييم المشروع ككل | Individual = تقييم البرمجة" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Running in DRY RUN mode (no write operations)." -ForegroundColor Yellow
}
if ($OnlyPublished) {
    Write-Host "Filter: Only published projects will be processed." -ForegroundColor Yellow
} else {
    Write-Host "Filter: All projects visible to your role will be processed (published + unpublished for admin/teacher)." -ForegroundColor Yellow
}

$projectsResponse = Invoke-ApiCall -Method "Get" -Endpoint "projects"
$projects = @($projectsResponse.data)

# Skip the temporary non-real project used for testing.
$beforeFilterCount = $projects.Count
$projects = @($projects | Where-Object { ([string]$_.title).Trim().ToLower() -ne 'test' })
$skippedCount = $beforeFilterCount - $projects.Count
if ($skippedCount -gt 0) {
    Write-Host "Skipped temporary test projects: $skippedCount" -ForegroundColor Yellow
}

if ($OnlyPublished) {
    $projects = @($projects | Where-Object { $_.isPublished -eq $true })
}

if (-not $projects -or $projects.Count -eq 0) {
    Write-Host "No projects found from API endpoint: $ApiUrl/projects" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($projects.Count) project(s)." -ForegroundColor White

$publishedCount = @($projects | Where-Object { $_.isPublished -eq $true }).Count
$unpublishedCount = @($projects | Where-Object { $_.isPublished -ne $true }).Count
Write-Host "Published: $publishedCount | Unpublished: $unpublishedCount" -ForegroundColor White

$updatedCount = 0
foreach ($project in $projects) {
    $projectId = [string]$project._id
    $projectTitle = [string]$project.title
    $visibility = if ($project.isPublished) { "published" } else { "unpublished" }

    Write-Host "`n--- Project: $projectTitle ($projectId) [$visibility] ---" -ForegroundColor Magenta

    $individualSkills = Get-IndividualSkillCriteriaForProject -Project $project
    $groupSections = Build-GroupSections -Project $project
    $individualSections = Build-IndividualSections -Project $project

    Write-Host "Selected individual programming skills:" -ForegroundColor DarkCyan
    $individualSkills | ForEach-Object { Write-Host " - $_" -ForegroundColor DarkCyan }

    Upsert-ObservationCard -ProjectId $projectId -Phase "group" -Sections $groupSections
    Upsert-ObservationCard -ProjectId $projectId -Phase "individual_oral" -Sections $individualSections

    $updatedCount += 1
}

Write-Host "`n✅ Done. Processed $updatedCount project(s)." -ForegroundColor Green
Write-Host "Use this script with: .\scripts\rebuild-live-observation-cards.ps1 -Token \"YOUR_ADMIN_OR_TEACHER_TOKEN\"" -ForegroundColor Yellow
