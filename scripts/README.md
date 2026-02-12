# Scripts Directory

Utility scripts for managing the PBL LMS platform.

## Project Management Scripts

### `create-project-template.ps1`
Template for creating new projects with observation cards via API.

**Usage:**
```powershell
# Get your admin token from browser console: localStorage.getItem('token')
.\scripts\create-project-template.ps1 -Token "your-jwt-token-here"
```

**Customization:**
Edit the `$projectData`, `$individualCard`, and `$groupCard` variables in the script to match your project requirements.

### `seed-project-0.ps1`
Creates observation card for Project 0 (Arduino LED intro project).

**Usage:**
```powershell
.\scripts\seed-project-0.ps1
# Enter admin token when prompted
```

## Database Seed Scripts

### `seed.ps1` (Root level)
Initial database seeding with sample data. Run this after fresh MongoDB setup.

**Usage:**
```powershell
cd backend
node scripts/seed.js
```

## Development Utilities

### UTF-8 API Testing
For testing Arabic content via PowerShell:

```powershell
$token = "Bearer your-token"
$body = @{ title = "عنوان عربي" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "https://pbl-lms-backend.onrender.com/api/projects" `
  -Method Post -Headers @{ Authorization = $token } -Body $bytes
```

## Notes

- All scripts require admin authentication token
- Use UTF-8 encoding for Arabic text in API calls
- Production API: `https://pbl-lms-backend.onrender.com/api`
- Local API: `http://localhost:5000/api`
