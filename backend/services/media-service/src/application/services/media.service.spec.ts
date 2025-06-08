import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ImageProcessor } from '../../infrastructure/processors/image.processor';
import { FileCategory, FileVisibility } from '../dto/upload-file.dto';

describe('MediaService', () => {
  let service: MediaService;
  let storageService: StorageService;
  let imageProcessor: ImageProcessor;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;

  const mockStorageService = {
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    getSignedUrl: jest.fn(),
    deleteFile: jest.fn(),
    listFiles: jest.fn(),
  };

  const mockImageProcessor = {
    processImage: jest.fn(),
    generateThumbnails: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'upload.allowedMimeTypes': {
          images: ['image/jpeg', 'image/png', 'image/webp'],
          documents: ['application/pdf', 'application/msword'],
          videos: ['video/mp4', 'video/quicktime'],
        },
        'upload.maxFileSize': 10485760, // 10MB
        'security.signedUrlExpiry': 3600, // 1 hour
      };
      return config[key];
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test image data'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ImageProcessor,
          useValue: mockImageProcessor,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    storageService = module.get<StorageService>(StorageService);
    imageProcessor = module.get<ImageProcessor>(ImageProcessor);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
    // Clear the in-memory store
    (service as any).fileMetadataStore.clear();
  });

  describe('uploadFile', () => {
    it('should upload image file successfully', async () => {
      const processedImage = {
        buffer: Buffer.from('processed image'),
        format: 'jpeg',
        size: 800,
      };

      const thumbnails = {
        small: { buffer: Buffer.from('small'), format: 'jpeg', size: 100 },
        medium: { buffer: Buffer.from('medium'), format: 'jpeg', size: 200 },
        large: { buffer: Buffer.from('large'), format: 'jpeg', size: 400 },
      };

      mockImageProcessor.processImage.mockResolvedValue(processedImage);
      mockImageProcessor.generateThumbnails.mockResolvedValue(thumbnails);
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockImplementation((key: string) =>
        Promise.resolve(`https://storage.example.com/${key}`),
      );

      const result = await service.uploadFile(mockFile, 'user123', {
        category: FileCategory.AQUARIUM_IMAGE,
        visibility: FileVisibility.PUBLIC,
        entityId: 'aquarium123',
        entityType: 'aquarium',
        metadata: { description: 'Test aquarium photo' },
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        filename: expect.stringMatching(/^[a-f0-9-]+\.jpg$/),
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: expect.stringContaining('https://storage.example.com/'),
        thumbnails: {
          small: expect.stringContaining('thumbnails'),
          medium: expect.stringContaining('thumbnails'),
          large: expect.stringContaining('thumbnails'),
        },
        metadata: { description: 'Test aquarium photo' },
        createdAt: expect.any(Date),
      });

      expect(mockImageProcessor.processImage).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockImageProcessor.generateThumbnails).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(4); // main + 3 thumbnails
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('media.uploaded', {
        fileId: result.id,
        userId: 'user123',
        filename: result.filename,
        mimeType: 'image/jpeg',
        size: 1024,
        category: FileCategory.AQUARIUM_IMAGE,
      });
    });

    it('should upload non-image file without processing', async () => {
      const pdfFile = {
        ...mockFile,
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/doc.pdf');

      const result = await service.uploadFile(pdfFile, 'user123');

      expect(result).toMatchObject({
        id: expect.any(String),
        filename: expect.stringMatching(/^[a-f0-9-]+\.pdf$/),
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        thumbnails: undefined,
      });

      expect(mockImageProcessor.processImage).not.toHaveBeenCalled();
      expect(mockImageProcessor.generateThumbnails).not.toHaveBeenCalled();
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error for oversized file', async () => {
      const largeFile = {
        ...mockFile,
        size: 20485760, // 20MB
      };

      await expect(service.uploadFile(largeFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported file type', async () => {
      const unsupportedFile = {
        ...mockFile,
        mimetype: 'application/x-executable',
      };

      await expect(service.uploadFile(unsupportedFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle upload errors gracefully', async () => {
      mockImageProcessor.processImage.mockRejectedValue(new Error('Processing failed'));

      await expect(service.uploadFile(mockFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should handle private file upload', async () => {
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/private/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const result = await service.uploadFile(mockFile, 'user123', {
        visibility: FileVisibility.PRIVATE,
      });

      expect(result.url).toContain('private');
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        false, // isPublic = false for private files
        expect.any(Object),
      );
    });
  });

  describe('getFile', () => {
    it('should get file by id', async () => {
      // First upload a file to populate the store
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      // Now get the file
      const result = await service.getFile(uploadResult.id, 'user123');

      expect(result).toMatchObject({
        id: uploadResult.id,
        filename: uploadResult.filename,
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://storage.example.com/file.jpg',
        userId: 'user123',
      });
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.getFile('non-existent-id', 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should deny access to private files from other users', async () => {
      // Upload a private file
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123', {
        visibility: FileVisibility.PRIVATE,
      });

      // Try to access from different user
      await expect(service.getFile(uploadResult.id, 'different-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow access to public files from any user', async () => {
      // Upload a public file
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123', {
        visibility: FileVisibility.PUBLIC,
      });

      // Access from different user
      const result = await service.getFile(uploadResult.id, 'different-user');
      expect(result).toBeDefined();
      expect(result.id).toBe(uploadResult.id);
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for file', async () => {
      // Upload a file first
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockStorageService.getSignedUrl.mockResolvedValue('https://storage.example.com/signed-url');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      const result = await service.getSignedUrl(uploadResult.id, 'user123', 7200);

      expect(result).toEqual({
        url: 'https://storage.example.com/signed-url',
        expiresAt: expect.any(Date),
      });

      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        uploadResult.filename,
        7200,
        false, // isPublic
      );
    });

    it('should use default expiry when not specified', async () => {
      // Upload a file
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockStorageService.getSignedUrl.mockResolvedValue('https://storage.example.com/signed-url');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      await service.getSignedUrl(uploadResult.id, 'user123');

      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
        uploadResult.filename,
        3600, // default from config
        false,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Upload a file with thumbnails
      const thumbnails = {
        small: { buffer: Buffer.from('small'), format: 'jpeg', size: 100 },
        medium: { buffer: Buffer.from('medium'), format: 'jpeg', size: 200 },
      };

      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockImplementation((key: string) =>
        Promise.resolve(`https://storage.example.com/${key}`),
      );
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue(thumbnails);

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      const result = await service.deleteFile(uploadResult.id, 'user123');

      expect(result).toEqual({
        success: true,
        deletedCount: 1,
        deletedFiles: [uploadResult.id],
      });

      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(3); // main + 2 thumbnails
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('media.deleted', {
        fileId: uploadResult.id,
        userId: 'user123',
        filename: uploadResult.filename,
      });
    });

    it('should deny deletion from non-owner', async () => {
      // Upload a file
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      await expect(service.deleteFile(uploadResult.id, 'different-user')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      // Upload a file
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockStorageService.deleteFile.mockRejectedValue(new Error('Delete failed'));
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const uploadResult = await service.uploadFile(mockFile, 'user123');

      const result = await service.deleteFile(uploadResult.id, 'user123');

      expect(result).toEqual({
        success: false,
        deletedCount: 0,
        deletedFiles: [],
        errors: [`Failed to delete file: ${uploadResult.id}`],
      });
    });
  });

  describe('deleteMultipleFiles', () => {
    it('should delete multiple files', async () => {
      // Upload multiple files
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const file1 = await service.uploadFile(mockFile, 'user123');
      const file2 = await service.uploadFile(mockFile, 'user123');
      const file3 = await service.uploadFile(mockFile, 'user123');

      const result = await service.deleteMultipleFiles(
        [file1.id, file2.id, file3.id],
        'user123',
      );

      expect(result).toEqual({
        success: true,
        deletedCount: 3,
        deletedFiles: [file1.id, file2.id, file3.id],
      });
    });

    it('should handle partial failures', async () => {
      // Upload files
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      const file1 = await service.uploadFile(mockFile, 'user123');
      const file2 = await service.uploadFile(mockFile, 'user123');

      // Make deletion fail for the second file
      mockStorageService.deleteFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'));

      const result = await service.deleteMultipleFiles([file1.id, file2.id], 'user123');

      expect(result).toEqual({
        success: false,
        deletedCount: 1,
        deletedFiles: [file1.id],
        errors: [`Failed to delete: ${file2.id}`],
      });
    });
  });

  describe('listFiles', () => {
    it('should list user files with pagination', async () => {
      // Upload multiple files
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockImplementation((key: string) =>
        Promise.resolve(`https://storage.example.com/${key}`),
      );
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      // Upload 5 files
      const uploadedFiles = [];
      for (let i = 0; i < 5; i++) {
        const file = await service.uploadFile(mockFile, 'user123', {
          entityId: i < 3 ? 'aquarium123' : 'aquarium456',
          entityType: 'aquarium',
        });
        uploadedFiles.push(file);
      }

      // List with pagination
      const result = await service.listFiles('user123', {
        page: 1,
        limit: 3,
      });

      expect(result).toMatchObject({
        files: expect.arrayContaining([
          expect.objectContaining({ id: uploadedFiles[4].id }),
          expect.objectContaining({ id: uploadedFiles[3].id }),
          expect.objectContaining({ id: uploadedFiles[2].id }),
        ]),
        total: 5,
        page: 1,
        limit: 3,
      });
      expect(result.files).toHaveLength(3);
    });

    it('should filter files by entity', async () => {
      // Upload files for different entities
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      await service.uploadFile(mockFile, 'user123', {
        entityId: 'aquarium123',
        entityType: 'aquarium',
      });
      await service.uploadFile(mockFile, 'user123', {
        entityId: 'aquarium456',
        entityType: 'aquarium',
      });
      await service.uploadFile(mockFile, 'user123', {
        entityId: 'aquarium123',
        entityType: 'aquarium',
      });

      const result = await service.listFiles('user123', {
        entityId: 'aquarium123',
      });

      expect(result.total).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.files.every(f => f.metadata?.entityId === 'aquarium123')).toBe(true);
    });

    it('should not show private files from other users', async () => {
      // Upload files from different users
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      await service.uploadFile(mockFile, 'user123', {
        visibility: FileVisibility.PRIVATE,
      });
      await service.uploadFile(mockFile, 'user456', {
        visibility: FileVisibility.PRIVATE,
      });
      await service.uploadFile(mockFile, 'user456', {
        visibility: FileVisibility.PUBLIC,
      });

      const result = await service.listFiles('user123');

      expect(result.total).toBe(2); // own private + other's public
    });

    it('should filter by category', async () => {
      // Upload files with different categories
      mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
      mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file.jpg');
      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed'),
        format: 'jpeg',
        size: 800,
      });
      mockImageProcessor.generateThumbnails.mockResolvedValue({});

      await service.uploadFile(mockFile, 'user123', {
        category: FileCategory.AQUARIUM_IMAGE,
      });
      await service.uploadFile(mockFile, 'user123', {
        category: FileCategory.FISH_IMAGE,
      });

      const result = await service.listFiles('user123', {
        category: FileCategory.AQUARIUM_IMAGE,
      });

      expect(result.total).toBe(1);
    });
  });

  describe('file type validation', () => {
    it('should accept valid image types', async () => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (const mimetype of imageTypes) {
        const file = { ...mockFile, mimetype };
        
        mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
        mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file');
        mockImageProcessor.processImage.mockResolvedValue({
          buffer: Buffer.from('processed'),
          format: mimetype.split('/')[1],
          size: 800,
        });
        mockImageProcessor.generateThumbnails.mockResolvedValue({});

        await expect(service.uploadFile(file, 'user123')).resolves.toBeDefined();
      }
    });

    it('should accept valid document types', async () => {
      const documentTypes = ['application/pdf', 'application/msword'];

      for (const mimetype of documentTypes) {
        const file = { ...mockFile, mimetype, originalname: 'doc.pdf' };
        
        mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
        mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file');

        await expect(service.uploadFile(file, 'user123')).resolves.toBeDefined();
      }
    });

    it('should accept valid video types', async () => {
      const videoTypes = ['video/mp4', 'video/quicktime'];

      for (const mimetype of videoTypes) {
        const file = { ...mockFile, mimetype, originalname: 'video.mp4' };
        
        mockStorageService.uploadFile.mockResolvedValue({ key: 'test-key' });
        mockStorageService.getFileUrl.mockResolvedValue('https://storage.example.com/file');

        await expect(service.uploadFile(file, 'user123')).resolves.toBeDefined();
      }
    });

    it('should reject invalid mime types', async () => {
      const invalidTypes = [
        'application/x-executable',
        'application/javascript',
        'text/html',
      ];

      for (const mimetype of invalidTypes) {
        const file = { ...mockFile, mimetype };
        
        await expect(service.uploadFile(file, 'user123')).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });
});