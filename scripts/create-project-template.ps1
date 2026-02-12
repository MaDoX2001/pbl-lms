# Project Seeding Template
# Use this template to create new projects with observation cards

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api"
)

# ====================================================================================
# PROJECT DATA - Customize this section for your project
# ====================================================================================

$projectData = @{
    title = "عنوان المشروع"
    shortDescription = "وصف مختصر للمشروع (حتى 200 حرف)"
    description = "الوصف التفصيلي للمشروع - يشمل الأهداف والمتطلبات وما سيتعلمه الطالب"
    difficulty = "beginner"  # beginner, intermediate, advanced
    category = "other"       # web, mobile, desktop, data-science, ai-ml, game-dev, other
    estimatedDuration = 4
    deadline = "2026-03-01T23:59:00"
    points = 50
    isPublished = $true
    objectives = @(
        "الهدف التعليمي الأول",
        "الهدف التعليمي الثاني",
        "الهدف التعليمي الثالث"
    )
    showObjectives = $true
    learningScenario = @"
1. الخطوة الأولى في السيناريو التعليمي
2. الخطوة الثانية
3. الخطوة الثالثة
"@
    teachingStrategy = @"
1. استراتيجية تعليمية أولى
2. استراتيجية تعليمية ثانية
"@
    finalReportNote = "ملاحظة حول التقرير النهائي المطلوب"
    isTeamProject = $false
    hasObservationCard = $false
    projectOrder = 1  # For level progression (1-6)
}

# Individual/Oral Observation Card (required for all projects)
$individualCard = @{
    phase = "individual_oral"
    sections = @(
        @{
            name = "اسم القسم الأول"
            weight = 50
            criteria = @(
                @{ 
                    name = "المعيار الأول"
                    description = "وصف المعيار"
                    maxScore = 25 
                },
                @{ 
                    name = "المعيار الثاني"
                    description = "وصف المعيار"
                    maxScore = 25 
                }
            )
        },
        @{
            name = "اسم القسم الثاني"
            weight = 50
            criteria = @(
                @{ 
                    name = "المعيار الثالث"
                    description = "وصف المعيار"
                    maxScore = 50 
                }
            )
        }
    )
}

# Group Observation Card (only if isTeamProject = $true)
$groupCard = @{
    phase = "group"
    sections = @(
        @{
            name = "العمل الجماعي"
            weight = 100
            criteria = @(
                @{ 
                    name = "التعاون"
                    description = "مدى تعاون أعضاء الفريق"
                    maxScore = 50 
                },
                @{ 
                    name = "تقسيم المهام"
                    description = "كفاءة توزيع المهام"
                    maxScore = 50 
                }
            )
        }
    )
}

# ====================================================================================
# SCRIPT EXECUTION - Don't modify below this line
# ====================================================================================

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
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Creating Project ===" -ForegroundColor Cyan
$projectResponse = Invoke-ApiCall "Post" "projects" $projectData
$projectId = $projectResponse.data._id
Write-Host "✅ Project created with ID: $projectId" -ForegroundColor Green

Write-Host "`n=== Creating Individual Observation Card ===" -ForegroundColor Cyan
$individualCard.projectId = $projectId
$cardResponse = Invoke-ApiCall "Post" "assessment/observation-card" $individualCard
Write-Host "✅ Individual card created" -ForegroundColor Green

if ($projectData.isTeamProject) {
    Write-Host "`n=== Creating Group Observation Card ===" -ForegroundColor Cyan
    $groupCard.projectId = $projectId
    $groupResponse = Invoke-ApiCall "Post" "assessment/observation-card" $groupCard
    Write-Host "✅ Group card created" -ForegroundColor Green
}

Write-Host "`n✅ Project setup complete!" -ForegroundColor Green
Write-Host "Project URL: https://pbl-lms-phi.vercel.app/projects/$projectId" -ForegroundColor Yellow
