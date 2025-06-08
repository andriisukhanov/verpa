import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { StorageService, StorageFile } from '../../infrastructure/storage/storage.service';
import { ImageProcessor } from '../../infrastructure/processors/image.processor';
import { FileUploadedResponse, FileCategory, FileVisibility } from '../dto/upload-file.dto';
import { FileInfo, SignedUrlResponse } from '../dto/get-file.dto';
import { DeleteFileResponse } from '../dto/delete-file.dto';

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category?: FileCategory;
  visibility: FileVisibility;
  userId: string;
  entityId?: string;
  entityType?: string;
  thumbnails?: Record<string, string>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly allowedImageTypes: string[];
  private readonly allowedDocumentTypes: string[];
  private readonly allowedVideoTypes: string[];
  private readonly maxFileSize: number;
  
  // In-memory storage for demo (should be replaced with database)
  private fileMetadataStore: Map<string, FileMetadata> = new Map();

  constructor(
    private readonly storageService: StorageService,
    private readonly imageProcessor: ImageProcessor,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const uploadConfig = this.configService.get('upload.allowedMimeTypes');
    this.allowedImageTypes = uploadConfig.images;
    this.allowedDocumentTypes = uploadConfig.documents;
    this.allowedVideoTypes = uploadConfig.videos;
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize');
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    options?: {
      category?: FileCategory;
      visibility?: FileVisibility;
      entityId?: string;
      entityType?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<FileUploadedResponse> {
    // Validate file
    this.validateFile(file);

    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${fileId}${extension}`;
    const visibility = options?.visibility || FileVisibility.PRIVATE;
    const isPublic = visibility === FileVisibility.PUBLIC;

    try {
      let mainFileKey = filename;
      const thumbnails: Record<string, string> = {};

      // Process image files
      if (this.isImage(file.mimetype)) {
        // Process and optimize the main image
        const processedImage = await this.imageProcessor.processImage(file.buffer);
        
        // Upload main image
        const uploadResult = await this.storageService.uploadFile(
          {
            buffer: processedImage.buffer,
            originalname: file.originalname,
            mimetype: `image/${processedImage.format}`,
            size: processedImage.size,
          },
          mainFileKey,
          isPublic,
          {
            userId,
            originalName: file.originalname,
            ...(options?.metadata || {}),
          },
        );

        // Generate and upload thumbnails
        const generatedThumbnails = await this.imageProcessor.generateThumbnails(file.buffer);
        
        for (const [sizeName, thumbnail] of Object.entries(generatedThumbnails)) {
          const thumbnailKey = `thumbnails/${fileId}/${sizeName}${extension}`;
          
          await this.storageService.uploadFile(
            {
              buffer: thumbnail.buffer,
              originalname: `${sizeName}_${file.originalname}`,
              mimetype: `image/${thumbnail.format}`,
              size: thumbnail.size,
            },
            thumbnailKey,
            isPublic,
          );

          thumbnails[sizeName] = await this.storageService.getFileUrl(thumbnailKey, isPublic);
        }
      } else {
        // Upload non-image files as-is
        await this.storageService.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
          mainFileKey,
          isPublic,
          {
            userId,
            originalName: file.originalname,
            ...(options?.metadata || {}),
          },
        );
      }

      // Store metadata
      const fileMetadata: FileMetadata = {
        id: fileId,
        filename: mainFileKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: options?.category,
        visibility,
        userId,
        entityId: options?.entityId,
        entityType: options?.entityType,
        thumbnails: Object.keys(thumbnails).length > 0 ? thumbnails : undefined,
        metadata: options?.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.fileMetadataStore.set(fileId, fileMetadata);

      // Emit event
      this.eventEmitter.emit('media.uploaded', {
        fileId,
        userId,
        filename: mainFileKey,
        mimeType: file.mimetype,
        size: file.size,
        category: options?.category,
      });

      // Get file URL
      const url = await this.storageService.getFileUrl(mainFileKey, isPublic);

      return {
        id: fileId,
        filename: mainFileKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        thumbnails: Object.keys(thumbnails).length > 0 ? thumbnails : undefined,
        metadata: fileMetadata.metadata || {},
        createdAt: fileMetadata.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async getFile(fileId: string, userId: string): Promise<FileInfo> {
    const metadata = this.fileMetadataStore.get(fileId);
    
    if (!metadata) {
      throw new NotFoundException('File not found');
    }

    // Check permissions (simplified for demo)
    if (metadata.visibility === FileVisibility.PRIVATE && metadata.userId !== userId) {
      throw new NotFoundException('File not found');
    }

    const isPublic = metadata.visibility === FileVisibility.PUBLIC;
    const url = await this.storageService.getFileUrl(metadata.filename, isPublic);

    return {
      id: metadata.id,
      filename: metadata.filename,
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      size: metadata.size,
      url,
      thumbnails: metadata.thumbnails,
      metadata: metadata.metadata || {},
      userId: metadata.userId,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    };
  }

  async getSignedUrl(fileId: string, userId: string, expiresIn?: number): Promise<SignedUrlResponse> {
    const metadata = this.fileMetadataStore.get(fileId);
    
    if (!metadata) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    if (metadata.visibility === FileVisibility.PRIVATE && metadata.userId !== userId) {
      throw new NotFoundException('File not found');
    }

    const isPublic = metadata.visibility === FileVisibility.PUBLIC;
    const expiry = expiresIn || this.configService.get<number>('security.signedUrlExpiry');
    const url = await this.storageService.getSignedUrl(metadata.filename, expiry, isPublic);

    return {
      url,
      expiresAt: new Date(Date.now() + expiry * 1000),
    };
  }

  async deleteFile(fileId: string, userId: string): Promise<DeleteFileResponse> {
    const metadata = this.fileMetadataStore.get(fileId);
    
    if (!metadata) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    if (metadata.userId !== userId) {
      throw new NotFoundException('File not found');
    }

    try {
      const isPublic = metadata.visibility === FileVisibility.PUBLIC;
      
      // Delete main file
      await this.storageService.deleteFile(metadata.filename, isPublic);

      // Delete thumbnails if they exist
      if (metadata.thumbnails) {
        for (const [sizeName] of Object.entries(metadata.thumbnails)) {
          const thumbnailKey = `thumbnails/${metadata.id}/${sizeName}${path.extname(metadata.filename)}`;
          try {
            await this.storageService.deleteFile(thumbnailKey, isPublic);
          } catch (error) {
            this.logger.warn(`Failed to delete thumbnail: ${thumbnailKey}`, error);
          }
        }
      }

      // Remove metadata
      this.fileMetadataStore.delete(fileId);

      // Emit event
      this.eventEmitter.emit('media.deleted', {
        fileId,
        userId,
        filename: metadata.filename,
      });

      return {
        success: true,
        deletedCount: 1,
        deletedFiles: [fileId],
      };
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      return {
        success: false,
        deletedCount: 0,
        deletedFiles: [],
        errors: [`Failed to delete file: ${fileId}`],
      };
    }
  }

  async deleteMultipleFiles(fileIds: string[], userId: string): Promise<DeleteFileResponse> {
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const fileId of fileIds) {
      try {
        const result = await this.deleteFile(fileId, userId);
        if (result.success) {
          deletedFiles.push(fileId);
        } else {
          errors.push(`Failed to delete: ${fileId}`);
        }
      } catch (error) {
        errors.push(`Failed to delete: ${fileId}`);
      }
    }

    return {
      success: errors.length === 0,
      deletedCount: deletedFiles.length,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async listFiles(
    userId: string,
    filters?: {
      entityId?: string;
      entityType?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ files: FileInfo[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    // Filter files (simplified for demo)
    let files = Array.from(this.fileMetadataStore.values())
      .filter(file => {
        // Only show user's own files or public files
        if (file.visibility === FileVisibility.PRIVATE && file.userId !== userId) {
          return false;
        }

        if (filters?.entityId && file.entityId !== filters.entityId) {
          return false;
        }

        if (filters?.entityType && file.entityType !== filters.entityType) {
          return false;
        }

        if (filters?.category && file.category !== filters.category) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = files.length;
    files = files.slice(offset, offset + limit);

    // Convert to FileInfo
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const isPublic = file.visibility === FileVisibility.PUBLIC;
        const url = await this.storageService.getFileUrl(file.filename, isPublic);

        return {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url,
          thumbnails: file.thumbnails,
          metadata: file.metadata || {},
          userId: file.userId,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        };
      }),
    );

    return {
      files: fileInfos,
      total,
      page,
      limit,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    // Check file type
    const allowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedDocumentTypes,
      ...this.allowedVideoTypes,
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  private isImage(mimeType: string): boolean {
    return this.allowedImageTypes.includes(mimeType);
  }

  private isVideo(mimeType: string): boolean {
    return this.allowedVideoTypes.includes(mimeType);
  }

  private isDocument(mimeType: string): boolean {
    return this.allowedDocumentTypes.includes(mimeType);
  }
}