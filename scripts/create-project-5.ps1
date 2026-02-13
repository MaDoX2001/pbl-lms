# Create Project 5: Smart Temperature Monitoring & Alert System
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

# ==================== Load Project Data from JSON Files ====================

# Get script directory to locate JSON files
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read JSON files with UTF-8 encoding
$projectJson = Get-Content -Path "$scriptDir\project-5-data.json" -Encoding UTF8 -Raw
$groupCardJson = Get-Content -Path "$scriptDir\project-5-group-card.json" -Encoding UTF8 -Raw
$individualCardJson = Get-Content -Path "$scriptDir\project-5-individual-card.json" -Encoding UTF8 -Raw

# ==================== Script Execution ====================

Write-Host "`n=== Creating Project 5: Smart Temperature Monitoring & Alert System ===" -ForegroundColor Cyan

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

Write-Host "`n✅ Project 5 setup complete!" -ForegroundColor Green
Write-Host "Project URL: https://pbl-lms-phi.vercel.app/projects/$projectId" -ForegroundColor Yellow
Write-Host "`nProject Details:" -ForegroundColor Cyan
Write-Host "  - Title: Smart Temperature Monitoring & Alert System" -ForegroundColor White
Write-Host "  - Type: Team Project" -ForegroundColor White
Write-Host "  - Level: Advanced" -ForegroundColor White
Write-Host "  - Duration: 16 hours" -ForegroundColor White
Write-Host "  - Points: 100" -ForegroundColor White
Write-Host "  - Deadline: 2026-05-10" -ForegroundColor White
