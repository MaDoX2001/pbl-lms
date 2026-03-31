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

function New-StandardOptions {
    param([string]$CriterionName)

    return @(
        @{ percentage = 0; description = "Not performed: $CriterionName" },
        @{ percentage = 50; description = "Performed with errors: $CriterionName" },
        @{ percentage = 100; description = "Performed correctly: $CriterionName" }
    )
}

function Normalize-CardSections {
    param([array]$Sections)

    $normalized = @()
    foreach ($section in ($Sections | ForEach-Object { $_ })) {
        $criteria = @()
        foreach ($criterion in ($section.criteria | ForEach-Object { $_ })) {
            $criteria += @{
                name = [string]$criterion.name
                applicableRoles = @('all')
                options = New-StandardOptions -CriterionName ([string]$criterion.name)
            }
        }

        $normalized += @{
            name = [string]$section.name
            weight = [double]$section.weight
            criteria = $criteria
        }
    }

    return $normalized
}

Write-Host "`n=== Rebuilding Observation Cards (Live) ===" -ForegroundColor Cyan
Write-Host "Scale: 0/50/100 with unified option descriptions" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Running in DRY RUN mode (no write operations)." -ForegroundColor Yellow
}
if ($OnlyPublished) {
    Write-Host "Filter: Only published projects will be processed." -ForegroundColor Yellow
} else {
    Write-Host "Filter: All projects visible to your role will be processed." -ForegroundColor Yellow
}

$projectsResponse = Invoke-ApiCall -Method "Get" -Endpoint "projects"
$projects = @($projectsResponse.data)

if ($OnlyPublished) {
    $projects = @($projects | Where-Object { $_.isPublished -eq $true })
}

if (-not $projects -or $projects.Count -eq 0) {
    Write-Host "No projects found from API endpoint: $ApiUrl/projects" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($projects.Count) project(s)." -ForegroundColor White

$updatedCount = 0
$skippedCount = 0

foreach ($project in $projects) {
    $projectId = [string]$project._id
    $projectTitle = [string]$project.title

    Write-Host "`n--- Project: $projectTitle ($projectId) ---" -ForegroundColor Magenta

    foreach ($phase in @('group', 'individual_oral')) {
        try {
            $cardResponse = Invoke-ApiCall -Method "Get" -Endpoint "assessment/observation-card/$projectId/$phase"
            $card = $cardResponse.data
            if (-not $card) {
                Write-Host "Skipped $phase (no card found)." -ForegroundColor Yellow
                $skippedCount += 1
                continue
            }

            $normalizedSections = Normalize-CardSections -Sections $card.sections

            if ($DryRun) {
                Write-Host "[DryRun] Would update $phase card for project $projectId" -ForegroundColor Yellow
                continue
            }

            Invoke-ApiCall -Method "Put" -Endpoint "assessment/observation-card/$($card._id)" -Body @{ sections = $normalizedSections } | Out-Null
            Write-Host "Updated $phase card." -ForegroundColor Green
            $updatedCount += 1
        } catch {
            Write-Host "Skipped $phase due to error: $($_.Exception.Message)" -ForegroundColor Yellow
            $skippedCount += 1
        }
    }
}

Write-Host "`nDone. Updated cards: $updatedCount | Skipped: $skippedCount" -ForegroundColor Green
Write-Host "Usage: .\scripts\rebuild-live-observation-cards.ps1 -Token \"YOUR_ADMIN_OR_TEACHER_TOKEN\"" -ForegroundColor Cyan
