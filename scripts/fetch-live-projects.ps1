param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$API_URL = "https://pbl-lms-backend.onrender.com/api"
$OUTPUT_DIR = "$PSScriptRoot"

$headers = @{
    'Authorization' = "Bearer $Token"
    'Content-Type' = 'application/json; charset=utf-8'
    'Origin' = 'https://pbl-lms-phi.vercel.app'
}

Write-Host "[*] Fetching live projects from backend..." -ForegroundColor Cyan

try {
    Write-Host "[*] Getting projects list..." -ForegroundColor Yellow
    $resp = Invoke-RestMethod -Uri "$API_URL/projects" -Method Get -Headers $headers -UseBasicParsing
    
    if (-not $resp.success) {
        throw "Error fetching projects: $($resp.message)"
    }
    
    $projects = $resp.data
    Write-Host "[OK] Retrieved $($projects.Count) projects" -ForegroundColor Green
    
    foreach ($project in $projects) {
        $projectId = $project._id
        $projectOrder = if ($project.projectOrder) { $project.projectOrder } else { "0" }
        
        Write-Host "[*] Processing: $($project.title)" -ForegroundColor Cyan
        
        try {
            $cardsUrl = "$API_URL/observation-cards?projectId=$projectId"
            $cardsResp = Invoke-RestMethod -Uri $cardsUrl -Method Get -Headers $headers -UseBasicParsing
            
            if ($cardsResp.success) {
                $cards = $cardsResp.data
                
                $groupCard = $null
                $individualCard = $null
                
                foreach ($card in $cards) {
                    if ($card.phase -eq 'group') {
                        $groupCard = $card
                    }
                    if ($card.phase -eq 'individual_oral') {
                        $individualCard = $card
                    }
                }
                
                if ($groupCard) {
                    $groupCardFile = "$OUTPUT_DIR/project-$projectOrder-group-card.json"
                    $groupCard | ConvertTo-Json -Depth 10 | Out-File -FilePath $groupCardFile -Encoding UTF8
                    Write-Host "   [OK] Saved group card" -ForegroundColor Green
                }
                
                if ($individualCard) {
                    $indvFile = "$OUTPUT_DIR/project-$projectOrder-individual-card.json"
                    $individualCard | ConvertTo-Json -Depth 10 | Out-File -FilePath $indvFile -Encoding UTF8
                    Write-Host "   [OK] Saved individual card" -ForegroundColor Green
                }
            }
            
            $dataFile = "$OUTPUT_DIR/project-$projectOrder-data.json"
            $project | ConvertTo-Json -Depth 10 | Out-File -FilePath $dataFile -Encoding UTF8
            Write-Host "   [OK] Saved project data" -ForegroundColor Green
            
        } catch {
            Write-Host "   [WARN] Error: $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n[OK] Completed! Saved projects:" -ForegroundColor Green
    Get-ChildItem "$OUTPUT_DIR/project-*-data.json" | ForEach-Object { Write-Host "   * $($_.Name)" }
    
} catch {
    Write-Host "`n[ERROR] $_" -ForegroundColor Red
    exit 1
}
