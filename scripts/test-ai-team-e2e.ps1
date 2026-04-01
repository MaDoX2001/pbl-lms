param(
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$TeamId,
  [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api"
)

$ErrorActionPreference = 'Stop'
$h = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json; charset=utf-8' }

$subs = @((Invoke-RestMethod -Method Get -Uri "$ApiUrl/team-submissions/team/$TeamId/project/$ProjectId" -Headers $h).data)
$prog = @($subs | Where-Object { $_.stageKey -eq 'programming' } | Sort-Object {[datetime]$_.submittedAt} -Descending)
$final = @($subs | Where-Object { $_.stageKey -eq 'final_delivery' } | Sort-Object {[datetime]$_.submittedAt} -Descending | Select-Object -First 1)[0]

if (-not $final) {
  Write-Output 'RESULT: BLOCKED'
  Write-Output 'DETAIL: Missing final_delivery submission'
  exit 1
}

if ($prog.Count -lt 3) {
  Write-Output 'RESULT: BLOCKED'
  Write-Output 'DETAIL: Need at least 3 programming submissions'
  exit 1
}

$studentId = [string]$prog[0].submittedBy._id
$aiReq = @{ projectId = $ProjectId; studentId = $studentId; submissionId = $prog[0]._id } | ConvertTo-Json -Depth 8
$ai = (Invoke-RestMethod -Method Post -Uri "$ApiUrl/assessment/ai-evaluate-individual" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($aiReq))).data

if (-not $ai.evidenceSummary) {
  Write-Output 'RESULT: FAIL'
  Write-Output 'DETAIL: Missing evidenceSummary in AI response'
  exit 1
}

$evidenceCount = [int]$ai.evidenceSummary.totalArtifacts
$ids = @($ai.evidenceSummary.evidenceSubmissionIds)

if ($evidenceCount -ne 4 -or $ids.Count -ne 4) {
  Write-Output 'RESULT: FAIL'
  Write-Output "DETAIL: Expected exactly 4 AI evidence artifacts, got count=$evidenceCount ids=$($ids.Count)"
  exit 1
}

Write-Output 'AI_DRAFT: OK'
Write-Output "EVIDENCE_COUNT: $evidenceCount"
Write-Output "EVIDENCE_IDS: $($ids -join ',')"
Write-Output 'RESULT: PASS'
