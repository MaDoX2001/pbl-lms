# Create Project 11 - Team project with dual-phase evaluation

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api"
)

function Invoke-ApiCall {
    param($Method, $Endpoint, $Body)

    $json = $Body | ConvertTo-Json -Depth 15
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
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        exit 1
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$projectJson = Get-Content -Path "$scriptDir\project-11-data.json" -Encoding UTF8 -Raw
$groupCardJson = Get-Content -Path "$scriptDir\project-11-group-card.json" -Encoding UTF8 -Raw
$individualCardJson = Get-Content -Path "$scriptDir\project-11-individual-card.json" -Encoding UTF8 -Raw

Write-Host "`n=== Creating Project 11 ===" -ForegroundColor Cyan

$projectData = $projectJson | ConvertFrom-Json
$projectResponse = Invoke-ApiCall "Post" "projects" $projectData
$projectId = $projectResponse.data._id
Write-Host "Project created with ID: $projectId" -ForegroundColor Green

Write-Host "`n=== Creating Group Phase Observation Card ===" -ForegroundColor Cyan
$groupCard = $groupCardJson | ConvertFrom-Json
$groupCard | Add-Member -MemberType NoteProperty -Name "projectId" -Value $projectId
Invoke-ApiCall "Post" "assessment/observation-card" $groupCard | Out-Null
Write-Host "Group observation card created" -ForegroundColor Green

Write-Host "`n=== Creating Individual + Oral Phase Observation Card ===" -ForegroundColor Cyan
$individualCard = $individualCardJson | ConvertFrom-Json
$individualCard | Add-Member -MemberType NoteProperty -Name "projectId" -Value $projectId
Invoke-ApiCall "Post" "assessment/observation-card" $individualCard | Out-Null
Write-Host "Individual observation card created" -ForegroundColor Green

Write-Host "`nProject 11 setup complete" -ForegroundColor Green
Write-Host "Project URL: https://pbl-lms-phi.vercel.app/projects/$projectId" -ForegroundColor Yellow
