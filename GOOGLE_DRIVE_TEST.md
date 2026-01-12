# Testing Google Drive Upload/Download

## Prerequisites
1. Google Drive service account credentials file (`pbl-lms-a29c9d004248.json`) is in the project root
2. Backend has been deployed to Render with the credentials as a secret file
3. Frontend has been deployed to Vercel

## Test Steps

### 1. Create a Test Project (as Teacher/Admin)
1. Login with admin credentials: `admin@pbl-lms.com` / `Admin@123456`
2. Navigate to "Create Project" page
3. Create a new project with these details:
   - Title: "Test Project for Google Drive"
   - Description: "Testing file upload and download"
   - Difficulty: "Beginner"
   - Category: "Programming"

### 2. Create an Assignment (as Teacher/Admin)
Use the API or create through the UI:

**API Endpoint:** `POST /api/resources/:projectId/assignments`

**Request Body:**
```json
{
  "title": "Upload Test Assignment",
  "description": "Test uploading files to Google Drive",
  "dueDate": "2026-12-31",
  "maxScore": 100,
  "allowedFileTypes": ["pdf", "zip", "docx", "doc", "txt", "jpg", "png"],
  "maxFileSize": 10485760,
  "allowLateSubmission": true
}
```

**Using curl:**
```bash
curl -X POST "https://pbl-lms-backend.onrender.com/api/resources/PROJECT_ID/assignments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Upload Test Assignment",
    "description": "Test uploading files to Google Drive",
    "dueDate": "2026-12-31",
    "maxScore": 100,
    "allowedFileTypes": ["pdf", "zip", "docx", "doc", "txt", "jpg", "png"],
    "maxFileSize": 10485760,
    "allowLateSubmission": true
  }'
```

### 3. Enroll as Student
1. Logout from admin account
2. Login with a student account or create a new one
3. Navigate to the project page
4. Click "Enroll" button

### 4. Upload a File (as Student)
1. Go to the project detail page
2. Find the assignment in the "المهام" (Assignments) tab
3. Click "تسليم الواجب" (Submit Assignment)
4. In the dialog:
   - Select a file (PDF, DOCX, TXT, etc.)
   - Add a title
   - Add comments (optional)
   - Click "تسليم" (Submit)
5. You should see:
   - Upload progress bar
   - Success message: "تم تسليم الواجب بنجاح"
   - Status chip showing "تم التسليم" (Submitted)

### 5. Download the File (as Student)
1. After successful upload, the "تسليم الواجب" button changes to "تحميل التسليم" (Download Submission)
2. Click the download button
3. The file should download to your computer

### 6. Verify in Google Drive (as Admin)
1. Go to [Google Drive Console](https://drive.google.com)
2. Login with the service account or shared folder
3. Navigate to: `PBL-LMS-Content/Student-Submissions/Project-{ID}/Assignment-{ID}/Student-{ID}/`
4. Verify the uploaded file is there

### 7. View Submissions (as Teacher/Admin)
1. Login as admin or the project instructor
2. Navigate to the project
3. Go to assignments tab
4. Click "عرض التسليمات" (View Submissions)
5. You should see all student submissions with download buttons

## API Endpoints Reference

### Upload File
```
POST /api/submissions/projects/:projectId/assignments/:assignmentId/submit
Content-Type: multipart/form-data

FormData:
- file: [File]
- fileTitle: string
- comments: string
```

### Download File
```
GET /api/submissions/:submissionId/download
Authorization: Bearer {token}

Response: Binary file stream
```

### Get My Submissions
```
GET /api/submissions/projects/:projectId/my-submissions
Authorization: Bearer {token}

Response: Array of submission objects
```

### Get Assignment Submissions (Teacher/Admin)
```
GET /api/submissions/projects/:projectId/assignments/:assignmentId/submissions
Authorization: Bearer {token}

Response: Array of all student submissions
```

## Google Drive Folder Structure
```
PBL-LMS-Content/
  └── Student-Submissions/
      └── Project-{projectId}/
          └── Assignment-{assignmentId}/
              └── Student-{userId}/
                  └── uploaded-file.pdf
```

## Troubleshooting

### Upload fails with "خطأ في تسليم المهمة"
- Check file size is under the limit (default 10MB)
- Check file type is in allowedFileTypes
- Check student is enrolled in the project
- Check backend logs for Google Drive errors

### Download fails
- Verify the submission ID is correct
- Check user has permission (owner, instructor, or admin)
- Check Google Drive service is initialized correctly
- Check backend has read access to the file

### Google Drive service not initialized
- Verify credentials file exists
- Check Render secret file is properly configured
- Check backend logs: Should show "✅ Google Drive service initialized successfully"

## Current Status
✅ Backend endpoints created
✅ Frontend upload dialog implemented  
✅ Frontend download button added
✅ Google Drive service configured
✅ File permissions set to "anyone with link"
🔄 Waiting for Render and Vercel deployment

## Next Steps
1. Wait for deployments to complete (~3-5 minutes)
2. Follow test steps above
3. Verify files appear in Google Drive
4. Test download functionality
