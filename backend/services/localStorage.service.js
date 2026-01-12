const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LocalStorageService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  }

  async initialize() {
    try {
      // Create uploads directory if it doesn't exist
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadsDir, 'resources'), { recursive: true });
      await fs.mkdir(path.join(this.uploadsDir, 'submissions'), { recursive: true });
      console.log('✅ Local storage service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize local storage service:', error.message);
      throw error;
    }
  }

  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${Date.now()}-${hash}${ext}`;
  }

  async uploadFile(fileBuffer, fileName, mimeType, folder = 'resources') {
    try {
      const newFileName = this.generateFileName(fileName);
      const filePath = path.join(this.uploadsDir, folder, newFileName);

      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      const fileStats = await fs.stat(filePath);

      console.log(`📤 Uploaded file: ${fileName} (${newFileName})`);

      return {
        fileId: newFileName,
        fileName: fileName,
        filePath: `/uploads/${folder}/${newFileName}`,
        webViewLink: `${this.baseUrl}/uploads/${folder}/${newFileName}`,
        webContentLink: `${this.baseUrl}/uploads/${folder}/${newFileName}`,
        size: fileStats.size
      };
    } catch (error) {
      console.error('Error uploading file:', error.message);
      throw error;
    }
  }

  async deleteFile(fileId, folder = 'resources') {
    try {
      const filePath = path.join(this.uploadsDir, folder, fileId);
      await fs.unlink(filePath);
      console.log(`🗑️  Deleted file: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error.message);
      // Don't throw error if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return false;
    }
  }

  async getFile(fileId, folder = 'resources') {
    try {
      const filePath = path.join(this.uploadsDir, folder, fileId);
      const fileStats = await fs.stat(filePath);
      
      return {
        id: fileId,
        name: fileId,
        size: fileStats.size,
        webViewLink: `${this.baseUrl}/uploads/${folder}/${fileId}`,
        webContentLink: `${this.baseUrl}/uploads/${folder}/${fileId}`,
        createdTime: fileStats.birthtime
      };
    } catch (error) {
      console.error('Error getting file:', error.message);
      throw error;
    }
  }

  async downloadFile(fileId, folder = 'resources') {
    try {
      const filePath = path.join(this.uploadsDir, folder, fileId);
      return await fs.readFile(filePath);
    } catch (error) {
      console.error('Error downloading file:', error.message);
      throw error;
    }
  }

  // Helper method to check if file exists
  async fileExists(fileId, folder = 'resources') {
    try {
      const filePath = path.join(this.uploadsDir, folder, fileId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const localStorageService = new LocalStorageService();
module.exports = localStorageService;
