const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

class DriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.rootFolderId = null;
  }

  async initialize() {
    try {
      // Load service account credentials
      // On Render, secret files are in /etc/secrets/
      // In development, they're in the project root
      const keyFileName = 'pbl-lms-a29c9d004248.json';
      let keyFilePath;
      
      if (process.env.NODE_ENV === 'production') {
        keyFilePath = `/etc/secrets/${keyFileName}`;
      } else {
        keyFilePath = path.join(__dirname, '../../', keyFileName);
      }

      const keyFile = await fs.readFile(keyFilePath, 'utf8');
      const credentials = JSON.parse(keyFile);

      // Create JWT auth client
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive']
      );

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      console.log('✅ Google Drive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error.message);
      throw error;
    }
  }

  async findOrCreateFolder(folderName, parentFolderId = null) {
    try {
      // Search for existing folder
      const query = parentFolderId
        ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create folder if not exists
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });

      console.log(`📁 Created folder: ${folderName} (${folder.data.id})`);
      return folder.data.id;
    } catch (error) {
      console.error('Error creating folder:', error.message);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, folderId) {
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

      // Make file accessible to anyone with the link
      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
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
