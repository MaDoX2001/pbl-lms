const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

class DriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.initialized = false;
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

      // Self-test: Try to list files to verify authentication
      console.log('🔍 Testing Drive API authentication...');
      await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });

      this.initialized = true;
      console.log('✅ Drive authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Drive initialization failed:', error.message);
      if (error.response?.data) {
        console.error('API Error:', error.response.data);
      }
      throw new Error(`Drive init failed: ${error.message}`);
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
      // Search for existing folder
      let query;
      
      if (!parentFolderId && folderName === 'PBL-LMS-Content') {
        // Special case: Root folder must be shared with service account
        query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`;
      } else if (parentFolderId) {
        query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      } else {
        query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (response.data.files.length > 0) {
        console.log(`📁 Found folder: ${folderName} (${response.data.files[0].id})`);
        return response.data.files[0].id;
      }

      // If it's the root PBL-LMS-Content folder and not found, throw error
      if (!parentFolderId && folderName === 'PBL-LMS-Content') {
        throw new Error('PBL-LMS-Content folder not found. Please share it with the service account: pbl-lms-drive-service@pbl-lms.iam.gserviceaccount.com');
      }

      // Create subfolder if not exists (only works inside shared folders)
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
        supportsAllDrives: true
      });

      console.log(`📁 Created folder: ${folderName} (${folder.data.id})`);
      return folder.data.id;
    } catch (error) {
      console.error('Error creating folder:', error.message);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
    this._ensureInitialized();
    
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

      // Make file accessible to anyone with the link
      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      });

      console.log(`📤 Uploaded file: ${fileName} (${file.data.id})`);

      return {
        fileId: file.data.id,
        fileName: file.data.name,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        size: file.data.size
      };
    } catch (error) {
      console.error('Error uploading file:', error.message);
      throw error;
    }
  }

  async deleteFile(fileId) {
    this._ensureInitialized();
    
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      console.log(`🗑️  Deleted file: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error.message);
      throw error;
    }
  }

  async getFile(fileId) {
    this._ensureInitialized();
    
    try {
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime'
      });
      return file.data;
    } catch (error) {
      console.error('Error getting file:', error.message);
      throw error;
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
      console.error('Error downloading file:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const driveService = new DriveService();
module.exports = driveService;
