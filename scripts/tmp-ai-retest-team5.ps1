param(
  [Parameter(Mandatory=$true)][string]$Token,
  [string]$ApiUrl = "https://pbl-lms-backend.onrender.com/api"
)

$ErrorActionPreference = 'Stop'
$h = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json; charset=utf-8' }

$projectId = '69b871c4a5e036badee888b8'
$teamId = '69c7b881c9f8879e647d0ca5'

$subs = @((Invoke-RestMethod -Method Get -Uri "$ApiUrl/team-submissions/team/$teamId/project/$projectId" -Headers $h).data)
$prog = @($subs | Where-Object { $_.stageKey -eq 'programming' } | Sort-Object {[datetime]$_.submittedAt} -Descending | Select-Object -First 1)[0]
$final = @($subs | Where-Object { $_.stageKey -eq 'final_delivery' } | Sort-Object {[datetime]$_.submittedAt} -Descending | Select-Object -First 1)[0]

if (-not $prog -or -not $final) {
  Write-Output "RESULT: BLOCKED"
  Write-Output "DETAIL: Missing programming or final_delivery submission"
  exit 0
}

$studentId = [string]$prog.submittedBy._id
Write-Output "TARGET_STUDENT: $studentId"

$aiReq = @{ projectId = $projectId; studentId = $studentId; submissionId = $prog._id } | ConvertTo-Json -Depth 8
$ai = (Invoke-RestMethod -Method Post -Uri "$ApiUrl/assessment/ai-evaluate-individual" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($aiReq))).data
Write-Output "AI_DRAFT: OK"

$groupSections = @()
foreach ($s in @($ai.groupCard.sectionEvaluations)) {
  $criteria = @()
  foreach ($c in @($s.criterionSelections)) {
    $criteria += @{ criterionName = $c.criterionName; selectedPercentage = $c.selectedPercentage; selectedDescription = ($(if ($c.selectedDescription) { $c.selectedDescription } else { '' })) }
  }
  $groupSections += @{ sectionName = $s.sectionName; criterionSelections = $criteria }
}
$groupReq = @{
  projectId = $projectId
  teamId = $teamId
  submissionId = $(if ($ai.basedOnGroupSubmissionId) { $ai.basedOnGroupSubmissionId } else { $final._id })
  sectionEvaluations = $groupSections
  feedbackSummary = $(if ($ai.feedbackSuggestion) { $ai.feedbackSuggestion } else { '' })
  evaluationSource = 'ai-batch'
} | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri "$ApiUrl/assessment/evaluate-group" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($groupReq)) | Out-Null
Write-Output "GROUP_SAVE: OK"

$indSections = @()
foreach ($s in @($ai.individualCard.sectionEvaluations)) {
  $criteria = @()
  foreach ($c in @($s.criterionSelections)) {
    $criteria += @{ criterionName = $c.criterionName; selectedPercentage = $c.selectedPercentage; selectedDescription = ($(if ($c.selectedDescription) { $c.selectedDescription } else { '' })) }
  }
  $indSections += @{ sectionName = $s.sectionName; criterionSelections = $criteria }
}
$indReq = @{
  projectId = $projectId
  teamId = $teamId
  studentId = $studentId
  studentRole = 'programmer'
  submissionId = $(if ($ai.basedOnIndividualSubmissionId) { $ai.basedOnIndividualSubmissionId } else { $prog._id })
  sectionEvaluations = $indSections
  feedbackSummary = $(if ($ai.feedbackSuggestion) { $ai.feedbackSuggestion } else { '' })
  evaluationSource = 'ai-batch'
} | ConvertTo-Json -Depth 20
try {
  Invoke-RestMethod -Method Post -Uri "$ApiUrl/assessment/evaluate-individual" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($indReq)) | Out-Null
  Write-Output "INDIV_SAVE: OK"
} catch {
  Write-Output "INDIV_SAVE: FAIL"
  if ($_.Exception -and $_.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $reader.Close()
      Write-Output "INDIV_ERROR_BODY: $body"
    } catch {}
  }
  throw
}

Write-Output "RESULT: PASS"
