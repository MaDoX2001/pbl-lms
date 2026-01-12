# Google Drive API Setup Guide

## Error: "Method doesn't allow unregistered callers"

This error means the Google Drive API is not enabled for your service account project.

## Steps to Fix:

### 1. Enable Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project (the one where you created the service account `pbl-lms-drive-service@pbl-lms.iam.gserviceaccount.com`)
3. In the search bar at the top, type "Google Drive API"
4. Click on "Google Drive API" in the results
5. Click the blue "ENABLE" button
6. Wait a few seconds for it to enable

### 2. Verify Service Account Permissions

1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find your service account: `pbl-lms-drive-service@pbl-lms.iam.gserviceaccount.com`
3. Make sure it has at least one of these roles:
   - **Editor** (recommended for development)
   - **Owner** (full access)
   - Or custom role with Drive permissions

### 3. Create a Shared Folder (Recommended)

Since the service account is a separate Google account, you should create a shared folder:

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder called "PBL-LMS-Content"
3. Right-click the folder → Share
4. Add the service account email: `pbl-lms-drive-service@pbl-lms.iam.gserviceaccount.com`
5. Give it "Editor" permissions
6. Click "Send" (uncheck "Notify people" since it's a service account)

### 4. Alternative: Enable Domain-Wide Delegation (For G Suite/Workspace)

If you're using Google Workspace and want the service account to access any user's drive:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin → Service Accounts
3. Find your service account
4. Click "Edit" → "Show Domain-Wide Delegation"
5. Enable "Enable G Suite Domain-wide Delegation"
6. Save

Then in your Google Workspace Admin Console:
1. Security → API Controls → Domain-wide Delegation
2. Add the service account client ID
3. Add OAuth scope: `https://www.googleapis.com/auth/drive`

## After Enabling the API

1. Wait 1-2 minutes for changes to propagate
2. Restart your Render service (or it will auto-restart on next deployment)
3. Check logs - you should see: `✅ Google Drive service initialized successfully`
4. Try uploading a file again

## Testing Without Shared Folder

If you don't share a folder, the service account will create folders in its own Drive space. You can still access them by:

1. Going to [Google Cloud Console](https://console.cloud.google.com/)
2. Using the service account credentials to access [Google Drive API Explorer](https://developers.google.com/drive/api/v3/reference/files/list)
3. Or by checking the `webViewLink` in the database submission records

## Quick Verification

After enabling the API, you can test with this curl command:

```bash
# Get an access token (replace with your service account key file)
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)

# List files (should return empty array if no files)
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  'https://www.googleapis.com/drive/v3/files?pageSize=1'
```

## Current Status

✅ Service account created: `pbl-lms-drive-service@pbl-lms.iam.gserviceaccount.com`
✅ Credentials file uploaded to Render
✅ Backend code configured
❌ **Google Drive API not enabled** ← Fix this first!
