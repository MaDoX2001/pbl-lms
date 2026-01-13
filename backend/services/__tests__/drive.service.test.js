/**
 * Google Drive Service - Production Tests
 * Tests Shared Drive integration with mocked Google APIs
 */

const DriveService = require('../drive.service');
const { google } = require('googleapis');

// Mock the google module
jest.mock('googleapis');
jest.mock('fs').promises;

describe('DriveService - Shared Drive Integration', () => {
  let driveService;
  let mockDrive;
  let mockAuth;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create fresh instance
    driveService = new DriveService();

    // Mock Drive API
    mockDrive = {
      files: {
        list: jest.fn(),
        create: jest.fn(),
        get: jest.fn(),
        delete: jest.fn()
      },
      permissions: {
        create: jest.fn()
      }
    };

    // Mock Auth
    mockAuth = {
      getClient: jest.fn().mockResolvedValue({})
    };

    google.auth.GoogleAuth = jest.fn().mockReturnValue(mockAuth);
    google.drive = jest.fn().mockReturnValue(mockDrive);

    // Mock fs
    const fs = require('fs').promises;
    fs.readFile = jest.fn().mockResolvedValue(JSON.stringify({
      client_email: 'test@example.com',
      private_key: 'fake-key'
    }));
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid credentials', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] }
      });

      await driveService.initialize();

      expect(driveService.initialized).toBe(true);
      expect(mockDrive.files.list).toHaveBeenCalledWith(
        expect.objectContaining({
          corpora: 'drive',
          driveId: driveService.sharedDriveId,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true
        })
      );
    });

    test('should throw error if credentials are invalid', async () => {
      const fs = require('fs').promises;
      fs.readFile.mockResolvedValue(JSON.stringify({
        // Missing required fields
      }));

      await expect(driveService.initialize()).rejects.toThrow('Invalid service account credentials');
    });

    test('should throw error if Shared Drive is not accessible', async () => {
      mockDrive.files.list.mockRejectedValue({
        code: 403,
        message: 'Forbidden'
      });

      await expect(driveService.initialize()).rejects.toThrow('Drive initialization failed');
    });

    test('should throw error if credentials file is missing', async () => {
      const fs = require('fs').promises;
      fs.readFile.mockRejectedValue({
        code: 'ENOENT',
        message: 'File not found'
      });

      await expect(driveService.initialize()).rejects.toThrow();
    });
  });

  describe('Upload Safety', () => {
    beforeEach(async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      await driveService.initialize();
    });

    test('should throw error when Drive is not initialized', async () => {
      const uninitializedService = new DriveService();
      
      await expect(
        uninitializedService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain', 'folder123')
      ).rejects.toThrow('FATAL: Google Drive service not initialized');
    });

    test('should throw error for empty file buffer', async () => {
      await expect(
        driveService.uploadFile(Buffer.from(''), 'test.txt', 'text/plain', 'folder123')
      ).rejects.toThrow('File buffer is empty');
    });

    test('should throw error for missing file name', async () => {
      await expect(
        driveService.uploadFile(Buffer.from('test'), '', 'text/plain', 'folder123')
      ).rejects.toThrow('File name is required');
    });

    test('should throw error for missing MIME type', async () => {
      await expect(
        driveService.uploadFile(Buffer.from('test'), 'test.txt', null, 'folder123')
      ).rejects.toThrow('MIME type is required');
    });

    test('should throw error for file exceeding size limit', async () => {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024 * 1024); // 11 GB (exceeds 10GB limit)

      await expect(
        driveService.uploadFile(hugeBuffer, 'huge.bin', 'application/octet-stream', 'folder123')
      ).rejects.toThrow('exceeds limit');
    });

    test('should upload file with Shared Drive parameters', async () => {
      mockDrive.files.create.mockResolvedValue({
        data: {
          id: 'file123',
          name: 'test.txt',
          size: 1024,
          webViewLink: 'https://drive.google.com/file/d/file123'
        }
      });

      mockDrive.permissions.create.mockResolvedValue({});

      const result = await driveService.uploadFile(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'folder123'
      );

      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supportsAllDrives: true,
          resource: expect.objectContaining({
            driveId: driveService.sharedDriveId
          })
        })
      );

      expect(result).toHaveProperty('fileId', 'file123');
    });

    test('should handle 403 quota errors gracefully', async () => {
      mockDrive.files.create.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded'
      });

      await expect(
        driveService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain', 'folder123')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('Folder Operations', () => {
    beforeEach(async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      await driveService.initialize();
    });

    test('should search within Shared Drive scope only', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] }
      });

      mockDrive.files.create.mockResolvedValue({
        data: { id: 'newfolder123' }
      });

      await driveService.findOrCreateFolder('TestFolder', 'parent123');

      expect(mockDrive.files.list).toHaveBeenCalledWith(
        expect.objectContaining({
          corpora: 'drive',
          driveId: driveService.sharedDriveId,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true
        })
      );
    });

    test('should return existing folder ID (idempotent)', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [{ id: 'existing123', name: 'TestFolder' }]
        }
      });

      const folderId = await driveService.findOrCreateFolder('TestFolder');

      expect(folderId).toBe('existing123');
      expect(mockDrive.files.create).not.toHaveBeenCalled();
    });

    test('should create folder in Shared Drive if not exists', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] }
      });

      mockDrive.files.create.mockResolvedValue({
        data: { id: 'newfolder123' }
      });

      const folderId = await driveService.findOrCreateFolder('NewFolder');

      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supportsAllDrives: true,
          resource: expect.objectContaining({
            parents: [driveService.sharedDriveId]
          })
        })
      );

      expect(folderId).toBe('newfolder123');
    });

    test('should use Shared Drive as default parent', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      mockDrive.files.create.mockResolvedValue({ data: { id: 'folder123' } });

      await driveService.findOrCreateFolder('RootFolder');

      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            parents: [driveService.sharedDriveId]
          })
        })
      );
    });
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      await driveService.initialize();
    });

    test('should delete file with Shared Drive support', async () => {
      mockDrive.files.delete.mockResolvedValue({});

      await driveService.deleteFile('file123');

      expect(mockDrive.files.delete).toHaveBeenCalledWith({
        fileId: 'file123',
        supportsAllDrives: true
      });
    });

    test('should be idempotent for 404 errors', async () => {
      mockDrive.files.delete.mockRejectedValue({
        code: 404,
        message: 'Not found'
      });

      // Should not throw - already deleted is success
      const result = await driveService.deleteFile('file123');
      expect(result).toBe(true);
    });

    test('should throw for permission errors', async () => {
      mockDrive.files.delete.mockRejectedValue({
        code: 403,
        message: 'Forbidden'
      });

      await expect(driveService.deleteFile('file123')).rejects.toThrow('Delete failed');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      await driveService.initialize();
    });

    test('should enrich errors with operation context', async () => {
      mockDrive.files.create.mockRejectedValue({
        code: 403,
        message: 'Permission denied'
      });

      try {
        await driveService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain', 'folder123');
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('test.txt');
        expect(error.code).toBe(403);
        expect(error.fileName).toBe('test.txt');
      }
    });

    test('should detect and log quota errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDrive.files.create.mockRejectedValue({
        code: 429,
        message: 'Rate limit exceeded'
      });

      await expect(
        driveService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain', 'folder123')
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('429 Rate Limit')
      );

      consoleSpy.mockRestore();
    });
  });
});
