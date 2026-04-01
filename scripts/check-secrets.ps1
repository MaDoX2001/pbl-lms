$ErrorActionPreference = 'Stop'

$patterns = @(
  'Bearer\s+eyJ[A-Za-z0-9_\-\.]+',
  'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}',
  'GEMINI_API_KEY\s*=\s*[^\s]+'
)

$staged = git diff --cached --name-only
if (-not $staged) {
  exit 0
}

$diff = git diff --cached
$violations = @()

foreach ($pattern in $patterns) {
  if ($diff -match $pattern) {
    $violations += $pattern
  }
}

if ($violations.Count -gt 0) {
  Write-Host 'ERROR: Potential secret detected in staged changes.' -ForegroundColor Red
  Write-Host 'Matched patterns:' -ForegroundColor Yellow
  $violations | Select-Object -Unique | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  Write-Host 'Commit blocked. Remove secret-like tokens and retry.' -ForegroundColor Red
  exit 1
}

Write-Host 'Secret scan passed for staged changes.' -ForegroundColor Green
exit 0
