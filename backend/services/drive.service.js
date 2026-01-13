const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

// CRITICAL: Shared Drive ID - all operations MUST use this as root
// Service accounts cannot use "My Drive" - they require Shared Drives
const SHARED_DRIVE_ID = '1qUUG934LRrJvULgBKEdmScQspRaAsYjC';

class DriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.initialized = false;
    this.sharedDriveId = SHARED_DRIVE_ID;
  }

  /**
   * Internal guard: throws if Drive service is used before initialization
   * Prevents silent failures in production
   */
  _ensureInitialized() {
    if (!this.initialized || !this.drive) {
      throw new Error(
        'FATAL: Google Drive service not initialized. ' +
        'Application cannot function without Drive access. ' +
        'Check service account credentials and Shared Drive permissions.'
      );
    }
  }

  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Drive service already initialized');
      return true;
    }

    try {
      // Load service account credentials
      const keyFileName = 'pbl-lms-a29c9d004248.json';
      let keyFilePath;
      
      if (process.env.NODE_ENV === 'production') {
        keyFilePath = `/etc/secrets/${keyFileName}`;
      } else {
        keyFilePath = path.join(__dirname, '../../', keyFileName);
      }

      console.log('📁 Loading credentials from:', keyFilePath);

      const keyFile = await fs.readFile(keyFilePath, 'utf8');
      const credentials = JSON.parse(keyFile);

      console.log('🔑 Loaded service account:', credentials.client_email);

      // Use GoogleAuth with service account
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      // Initialize Drive API with auth
      this.drive = google.drive({ 
        version: 'v3', 
        auth: this.auth 
      });

      // CRITICAL: Test Shared Drive access
      console.log('🔍 Testing Shared Drive access...');
      await this.drive.files.list({
        pageSize: 1,
        corpora: 'drive',
        driveId: this.sharedDriveId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id, name)'
      });

      this.initialized = true;
      console.log('✅ Google Drive service initialized successfully');
      console.log(`📂 Using Shared Drive: ${this.sharedDriveId}`);
      return true;
    } catch (error) {
      console.error('❌ FATAL: Failed to initialize Google Drive service');
      console.error('Error:', error.message);
      console.error('Code:', error.code);
      
      if (error.code === 403) {
        console.error('⚠️  403 Forbidden: Service account lacks access to Shared Drive');
        console.error(`   → Shared Drive ID: ${this.sharedDriveId}`);
      } else if (error.code === 404) {
        console.error('⚠️  404 Not Found: Shared Drive does not exist');
        console.error(`   → Verify Shared Drive ID: ${this.sharedDriveId}`);
      }
      
      throw new Error(
        `Drive initialization failed: ${error.message}. ` +
        'Application cannot start without Drive access.'
      );
    }
  }

  _ensureInitialized() {
    if (!this.initialized || !this.drive) {
      throw new Error('Drive service not initialized. Call initialize() first.');
    }
  }

  async findOrCreateFolder(folderName, parentFolderId = null) {
    this._ensureInitialized();
    
    try {
      // Default parent is Shared Drive root
      const parentId = parentFolderId || this.sharedDriveId;
      
      // Search within Shared Drive scope ONLY
      const query = `name='${folderName.replace(/'/g, "\\'")}'  and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        corpora: 'drive',
        driveId: this.sharedDriveId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id, name, parents)',
        pageSize: 10
      });

      // Folder exists - return its ID (idempotent)
      if (response.data.files && response.data.files.length > 0) {
        console.log(`📁 Found folder: ${folderName} (${response.data.files[0].id})`);
        return response.data.files[0].id;
      }

      // Create new folder in Shared Drive
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
        supportsAllDrives: true
      });

      console.log(`📁 Created folder in Shared Drive: ${folderName} (${folder.data.id})`);
      return folder.data.id;
    } catch (error) {
      const enrichedError = new Error(`Failed to find/create folder "${folderName}": ${error.message}`);
      enrichedError.code = error.code;
      enrichedError.folderName = folderName;
      
      if (error.code === 403) {
        console.error(`⚠️  403 Forbidden: Cannot create folder "${folderName}"`);
      }
      console.error('Folder operation failed:', enrichedError.message);
      throw enrichedError;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    this._ensureInitialized();
    
    // Input validation - fail fast
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Upload failed: File buffer is empty');
    }
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('Upload failed: File name is required');
    }
    if (!mimeType) {
      throw new Error('Upload failed: MIME type is required');
    }
    if (!folderId) {
      throw new Error('Upload failed: Folder ID is required');
    }
    
    // File size limit (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `Upload failed: File size ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit`
      );
    }
    
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: require('stream').Readable.from(fileBuffer)
      };

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size',
        supportsAllDrives: true
      });

      // Set public permissions
      try {
        await this.drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true
        });
      } catch (permError) {
        console.warn(`⚠️  Could not set permissions on ${file.data.id}:`, permError.message);
      }

      console.log(`📤 Uploaded: ${fileName} (${file.data.id}) - ${(file.data.size / 1024).toFixed(2)} KB`);

      return {
        fileId: file.data.id,
        fileName: file.data.name,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        size: file.data.size
      };
    } catch (error) {
      const enrichedError = new Error(`Upload failed for "${fileName}": ${error.message}`);
      enrichedError.code = error.code;
      enrichedError.fileName = fileName;
      
      if (error.code === 403) {
        console.error(`⚠️  403 Forbidden: Cannot upload "${fileName}"`);
      } else if (error.code === 429) {
        console.error(`⚠️  429 Rate Limit: Quota exceeded`);
      }
      
      console.error('Upload error:', enrichedError.message);
      throw enrichedError;
    }
  }

  async deleteFile(fileId) {
    this._ensureInitialized();
    
    if (!fileId) {
      throw new Error('Delete failed: File ID is required');
    }
    
    try {
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true
      });
      console.log(`🗑️  Deleted: ${fileId}`);
      return true;
    } catch (error) {
      if (error.code === 404) {
        console.warn(`⚠️  File ${fileId} not found - may already be deleted`);
        return true; // Idempotent
      }
      console.error(`Delete failed for ${fileId}:`, error.message);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getFile(fileId) {
    this._ensureInitialized();
    
    try {
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, parents',
        supportsAllDrives: true
      });
      return file.data;
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File ${fileId} not found in Shared Drive`);
      }
      throw new Error(`Failed to get file ${fileId}: ${error.message}`);
    }
  }

  async downloadFile(fileId) {
    this._ensureInitialized();
    
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
          supportsAllDrives: true
        },
        { responseType: 'stream' }
      );
      return response.data;
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File ${fileId} not found in Shared Drive`);
      }
      throw new Error(`Download failed for ${fileId}: ${error.message}`);
    }
  }
}

// Export singleton instance
const driveService = new DriveService();
module.exports = driveService;
