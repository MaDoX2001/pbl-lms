const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class CloudinaryService {
  constructor() {
    this.initialized = false;
    this.client = null;
    this.bucketName = '';
    this.publicBaseUrl = '';
  }

  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Storage service already initialized');
      return true;
    }

    try {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.R2_BUCKET_NAME;
      const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

      console.log('🔑 Cloudflare R2 credentials check:');
      console.log('  R2_ACCOUNT_ID:', accountId ? '✓' : '✗');
      console.log('  R2_ACCESS_KEY_ID:', accessKeyId ? '✓' : '✗');
      console.log('  R2_SECRET_ACCESS_KEY:', secretAccessKey ? '✓' : '✗');
      console.log('  R2_BUCKET_NAME:', bucketName ? '✓' : '✗');

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error('Missing required R2 environment variables');
      }

      this.client = new S3Client({
        region: 'auto',
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.bucketName = bucketName;
      this.publicBaseUrl = this._getPublicBaseUrl(accountId, bucketName);

      this.initialized = true;
      console.log('✅ Cloudflare R2 service initialized successfully');
      console.log(`🪣 Bucket: ${bucketName}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Cloudflare R2 service');
      console.error('Error message:', error.message || 'undefined');
      console.error('Error code:', error.code || 'N/A');
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.warn('⚠️  R2 service will not be available, but server will continue');
      return false;
    }
  }

  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Storage service not initialized. Call initialize() first.');
    }
  }

  _getPublicBaseUrl(accountId, bucketName) {
    if (process.env.R2_PUBLIC_URL) {
      return process.env.R2_PUBLIC_URL.replace(/\/+$/, '');
    }

    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
  }

  _sanitizeFileName(fileName) {
    return fileName
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');
  }

  _detectResourceType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];

    if (imageExtensions.includes(extension)) {
      return 'image';
    }

    if (videoExtensions.includes(extension)) {
      return 'video';
    }

    return 'raw';
  }

  _guessContentType(fileName, resourceType) {
    const extension = fileName.split('.').pop().toLowerCase();

    const contentTypeMap = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      csv: 'text/csv',
      json: 'application/json',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };

    if (contentTypeMap[extension]) {
      return contentTypeMap[extension];
    }

    if (resourceType === 'image') {
      return 'image/*';
    }

    if (resourceType === 'video') {
      return 'video/*';
    }

    return 'application/octet-stream';
  }

  _buildPublicUrl(objectKey) {
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  /**
   * Upload file to R2
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original filename
   * @param {string} folder - Folder path (e.g., 'course-materials/project-123')
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

    // File size limit (10GB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `Upload failed: File size ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    try {
      const resourceType = this._detectResourceType(fileName);
      const safeFileName = this._sanitizeFileName(fileName);
      const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
      const objectKey = `${normalizedFolder}/${safeFileName}`;
      const contentType = this._guessContentType(fileName, resourceType);

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: contentType,
          ContentDisposition: resourceType === 'raw' ? `attachment; filename="${safeFileName}"` : undefined,
        })
      );

      console.log(`📤 Uploaded to R2: ${fileName} (${objectKey}) - ${(fileBuffer.length / 1024).toFixed(2)} KB`);

      return {
        fileId: objectKey,
        fileName: fileName,
        url: this._buildPublicUrl(objectKey),
        format: fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '',
        resourceType,
        size: fileBuffer.length
      };
    } catch (error) {
      const enrichedError = new Error(`Upload failed for "${fileName}": ${error.message}`);
      enrichedError.code = error.code;
      enrichedError.fileName = fileName;

      if (error?.$metadata?.httpStatusCode === 403) {
        console.error(`⚠️  403 Forbidden: Cannot upload "${fileName}"`);
      }

      console.error('Upload error:', enrichedError.message);
      throw enrichedError;
    }
  }

  /**
   * Delete file from R2
   * @param {string} publicId - R2 object key
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(publicId) {
    this._ensureInitialized();

    if (!publicId) {
      throw new Error('Delete failed: Public ID is required');
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: publicId,
        })
      );

      console.log(`🗑️  Deleted from R2: ${publicId}`);
      return true;
    } catch (error) {
      console.error(`Delete failed for ${publicId}:`, error.message);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get file details from R2
   * @param {string} publicId - R2 object key
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<Object>} File metadata
   */
  async getFile(publicId) {
    this._ensureInitialized();

    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: publicId,
        })
      );

      return {
        fileId: publicId,
        url: this._buildPublicUrl(publicId),
        format: publicId.includes('.') ? publicId.split('.').pop().toLowerCase() : '',
        size: result.ContentLength,
        createdAt: result.LastModified
      };
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404) {
        throw new Error(`File ${publicId} not found`);
      }
      throw new Error(`Failed to get file ${publicId}: ${error.message}`);
    }
  }

  /**
   * Generate a temporary download URL (useful for private resources)
   * @param {string} publicId - R2 object key
   * @param {string} resourceType - Resource type
   * @returns {string} Download URL
   */
  async getDownloadUrl(publicId) {
    this._ensureInitialized();

    const expiresIn = Number(process.env.R2_SIGNED_URL_EXPIRES || 900);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      }),
      { expiresIn }
    );
  }
}

module.exports = new CloudinaryService();
