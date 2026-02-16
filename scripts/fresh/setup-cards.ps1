# Get project IDs and create evaluation cards

$url = "https://pbl-lms-backend.onrender.com/api"
$dir = "c:\pbl-lms\scripts\fresh"

# Login
Write-Host "Logging in..." -ForegroundColor Yellow
$login = '{"email":"admin@pbl-lms.com","password":"Admin@123456"}'
$lb = [System.Text.Encoding]::UTF8.GetBytes($login)
$lr = Invoke-RestMethod -Uri "$url/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $lb
$token = $lr.data.token
$h = @{"Authorization"="Bearer $token"; "Content-Type"="application/json; charset=utf-8"}

# Get all projects
Write-Host "Fetching projects..." -ForegroundColor Yellow
$projects = Invoke-RestMethod -Uri "$url/projects" -Headers $h
Write-Host "Found $($projects.data.Count) projects" -ForegroundColor Green

# Create a map of projectOrder -> projectId
$projectMap = @{}
foreach ($p in $projects.data) {
    $order = $p.projectOrder
    if ($order) {
        $projectMap[$order] = $p._id
        Write-Host "Project $order = $($p._id)" -ForegroundColor Cyan
    }
}

# Now we need to add the cards. We'll need the actual card files.
# For now, just verify we have all projects
Write-Host "`nProject Map Ready:" -ForegroundColor Yellow
$projectMap.GetEnumerator() | Sort-Object -Property Name | ForEach-Object {
    Write-Host "  [$($_.Name)] $($_.Value)" -ForegroundColor Green
}

Write-Host "`nNext: Create and assign evaluation cards!" -ForegroundColor Cyan
