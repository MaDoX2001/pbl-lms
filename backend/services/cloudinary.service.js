const cloudinary = require('cloudinary').v2;

class CloudinaryService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Cloudinary service already initialized');
      return true;
    }

    try {
      // Log environment variables (masked)
      console.log('🔑 Cloudinary credentials check:');
      console.log('  CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗');
      console.log('  API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓' : '✗');
      console.log('  API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓' : '✗');

      // Configure Cloudinary with environment variables
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });

      // Verify credentials by checking config
      const config = cloudinary.config();
      if (!config.cloud_name || !config.api_key || !config.api_secret) {
        throw new Error('Missing Cloudinary credentials in environment variables');
      }

      // Test connection by fetching usage stats
      console.log('🔍 Testing Cloudinary API connection...');
      await cloudinary.api.usage();

      this.initialized = true;
      console.log('✅ Cloudinary service initialized successfully');
      console.log(`📁 Cloud: ${config.cloud_name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary service');
      console.error('Error message:', error.message || 'undefined');
      console.error('Error code:', error.http_code || 'N/A');
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.warn('⚠️  Cloudinary service will not be available, but server will continue');
      return false;
    }
  }

  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Cloudinary service not initialized. Call initialize() first.');
    }
  }

  /**
   * Upload file to Cloudinary
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original filename
   * @param {string} folder - Cloudinary folder path (e.g., 'course-materials/project-123')
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadFile(fileBuffer, fileName, folder) {
    this._ensureInitialized();

    // Input validation
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Upload failed: File buffer is empty');
    }
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('Upload failed: File name is required');
    }
    if (!folder) {
      throw new Error('Upload failed: Folder path is required');
    }

    // File size limit (10GB) - Cloudinary free tier supports up to 100MB per file
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `Upload failed: File size ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    try {
      // Get file extension for resource_type detection
      const extension = fileName.split('.').pop().toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      
      let resourceType = 'raw'; // Default for documents
      if (imageExtensions.includes(extension)) {
        resourceType = 'image';
      } else if (videoExtensions.includes(extension)) {
        resourceType = 'video';
      }

      // Upload using upload_stream (supports all file types)
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder, // Don't add pbl-lms prefix, it's already in folder param
            resource_type: resourceType,
            public_id: fileName, // Keep full filename with extension
            use_filename: true,
            unique_filename: false, // Don't add random suffix
            overwrite: true // Allow replacing files with same name
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      console.log(`📤 Uploaded: ${fileName} (${result.public_id}) - ${(result.bytes / 1024).toFixed(2)} KB`);

      // Generate downloadable URL for raw files (documents)
      let downloadUrl = result.secure_url;
      if (resourceType === 'raw') {
        // Add fl_attachment flag to force download with correct filename
        downloadUrl = cloudinary.url(result.public_id, {
          resource_type: 'raw',
          flags: 'attachment',
          secure: true
        });
      }

      return {
        fileId: result.public_id,
        fileName: fileName,
        url: downloadUrl, // Use download URL for raw files
        format: result.format,
        resourceType: result.resource_type,
        size: result.bytes
      };
    } catch (error) {
      const enrichedError = new Error(`Upload failed for "${fileName}": ${error.message}`);
      enrichedError.code = error.http_code;
      enrichedError.fileName = fileName;

      if (error.http_code === 403) {
        console.error(`⚠️  403 Forbidden: Cannot upload "${fileName}"`);
      } else if (error.http_code === 429) {
        console.error(`⚠️  429 Rate Limit: Quota exceeded`);
      }

      console.error('Upload error:', enrichedError.message);
      throw enrichedError;
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID (with extension)
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(publicId, resourceType) {
    this._ensureInitialized();

    if (!publicId) {
      throw new Error('Delete failed: Public ID is required');
    }

    // Auto-detect resource type if not provided
    if (!resourceType) {
      const extension = publicId.split('.').pop().toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
      
      if (imageExtensions.includes(extension)) {
        resourceType = 'image';
      } else if (videoExtensions.includes(extension)) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      });

      if (result.result === 'ok' || result.result === 'not found') {
        console.log(`🗑️  Deleted: ${publicId}`);
        return true; // Idempotent
      }

      throw new Error(`Unexpected result: ${result.result}`);
    } catch (error) {
      console.error(`Delete failed for ${publicId}:`, error.message);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get file details from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<Object>} File metadata
   */
  async getFile(publicId, resourceType = 'raw') {
    this._ensureInitialized();

    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        fileId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      if (error.http_code === 404) {
        throw new Error(`File ${publicId} not found`);
      }
      throw new Error(`Failed to get file ${publicId}: ${error.message}`);
    }
  }

  /**
   * Generate a temporary download URL (useful for private resources)
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type
   * @returns {string} Download URL
   */
  getDownloadUrl(publicId, resourceType = 'raw') {
    this._ensureInitialized();

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      flags: 'attachment'
    });
  }
}

module.exports = new CloudinaryService();
