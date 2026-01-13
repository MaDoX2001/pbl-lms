const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

class DriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.initialized = false;
    this.rootFolderId = null; // Service account's root folder
  }

  /**
   * Internal guard: throws if Drive service is used before initialization
   */
  _ensureInitialized() {
    if (!this.initialized || !this.drive) {
      throw new Error(
        'FATAL: Google Drive service not initialized. ' +
        'Application cannot function without Drive access.'
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

      // Test Drive access with simple file list
      console.log('🔍 Testing Google Drive access...');
      await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });

      // Create/find root folder owned by service account
      console.log('📁 Setting up PBL-LMS-Content folder...');
      this.rootFolderId = await this._createOrFindRootFolder();
      console.log(`✅ Root folder ready: ${this.rootFolderId}`);

      this.initialized = true;
      console.log('✅ Google Drive service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service');
      console.error('Error:', error.message);
      console.error('Code:', error.code);
      
      if (error.code === 403) {
        console.error('⚠️  403 Forbidden: Check service account permissions');
      } else if (error.code === 404) {
        console.error('⚠️  404 Not Found: Resource not accessible');
      }
      
      console.error('⚠️  Drive service will not be available, but server will continue');
      return false;
    }
  }

  _ensureInitialized() {
    if (!this.initialized || !this.drive) {
      throw new Error('Drive service not initialized. Call initialize() first.');
    }
  }

  async _createOrFindRootFolder() {
    const folderName = 'PBL-LMS-Content';
    
    try {
      // Search for existing folder owned by service account
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id;
        console.log(`📁 Found existing root folder: ${folderName} (${folderId})`);
        return folderId;
      }

      // Create new folder owned by service account
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name'
      });

      // Make folder accessible to anyone with link (for teachers/students to view)
      await this.drive.permissions.create({
        fileId: folder.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      console.log(`📁 Created new root folder: ${folderName} (${folder.data.id})`);
      return folder.data.id;
    } catch (error) {
      throw new Error(`Failed to create/find root folder: ${error.message}`);
    }
  }

  async findOrCreateFolder(folderName, parentFolderId = null) {
    this._ensureInitialized();
    
    try {
      // Use root folder as default parent if none specified
      const actualParentId = parentFolderId || this.rootFolderId;
      
      // Build query
      let query;
      if (actualParentId) {
        query = `name='${folderName.replace(/'/g, "\\'")}' and '${actualParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      } else {
        query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      }

      // Search for existing folder
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, parents)',
        pageSize: 10
      });

      // Folder exists - return its ID (idempotent)
      if (response.data.files && response.data.files.length > 0) {
        console.log(`📁 Found folder: ${folderName} (${response.data.files[0].id})`);
        return response.data.files[0].id;
      }

      // Create new folder
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      
      // Set parent
      if (actualParentId) {
        fileMetadata.parents = [actualParentId];
      }

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name'
      });

      console.log(`📁 Created folder: ${folderName} (${folder.data.id})`);
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
    
    // File size limit (10GB) - increased for large project files
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `Upload failed: File size ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
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
        fields: 'id, name, webViewLink, webContentLink, size'
      });

      // Set public permissions
      try {
        await this.drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
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
        fileId: fileId
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
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, parents'
      });
      return file.data;
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File ${fileId} not found`);
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
          alt: 'media'
        },
        { responseType: 'stream' }
      );
      return response.data;
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`File ${fileId} not found`);
      }
      throw new Error(`Download failed for ${fileId}: ${error.message}`);
    }
  }
}

// Export singleton instance
const driveService = new DriveService();
module.exports = driveService;
