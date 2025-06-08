import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

export interface ImageSize {
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  size: number;
  format: string;
  width: number;
  height: number;
}

export interface ThumbnailOptions {
  sizes: Record<string, ImageSize>;
  quality: number;
  format: string;
}

@Injectable()
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);
  private readonly thumbnailSizes: Record<string, ImageSize>;
  private readonly quality: number;
  private readonly format: string;

  constructor(private readonly configService: ConfigService) {
    this.thumbnailSizes = this.configService.get<Record<string, ImageSize>>('image.thumbnails');
    this.quality = this.configService.get<number>('image.quality');
    this.format = this.configService.get<string>('image.format');
  }

  async processImage(
    buffer: Buffer,
    options?: Partial<ThumbnailOptions>,
  ): Promise<ProcessedImage> {
    try {
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();

      // Apply format conversion
      const format = options?.format || this.format;
      let processed = sharpInstance;

      switch (format) {
        case 'webp':
          processed = processed.webp({ quality: options?.quality || this.quality });
          break;
        case 'jpeg':
        case 'jpg':
          processed = processed.jpeg({ quality: options?.quality || this.quality });
          break;
        case 'png':
          processed = processed.png({ quality: options?.quality || this.quality });
          break;
        default:
          // Keep original format
          break;
      }

      // Auto-orient based on EXIF data
      processed = processed.rotate();

      const outputBuffer = await processed.toBuffer();
      const outputMetadata = await sharp(outputBuffer).metadata();

      return {
        buffer: outputBuffer,
        size: outputBuffer.length,
        format: outputMetadata.format || format,
        width: outputMetadata.width || 0,
        height: outputMetadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Failed to process image', error);
      throw error;
    }
  }

  async generateThumbnails(
    buffer: Buffer,
    sizes?: Record<string, ImageSize>,
  ): Promise<Record<string, ProcessedImage>> {
    const thumbnails: Record<string, ProcessedImage> = {};
    const sizesToGenerate = sizes || this.thumbnailSizes;

    try {
      for (const [sizeName, dimensions] of Object.entries(sizesToGenerate)) {
        const thumbnail = await this.generateThumbnail(buffer, dimensions);
        thumbnails[sizeName] = thumbnail;
      }

      return thumbnails;
    } catch (error) {
      this.logger.error('Failed to generate thumbnails', error);
      throw error;
    }
  }

  async generateThumbnail(
    buffer: Buffer,
    size: ImageSize,
  ): Promise<ProcessedImage> {
    try {
      const sharpInstance = sharp(buffer);
      
      // Auto-orient first
      const oriented = sharpInstance.rotate();
      
      // Resize with aspect ratio preservation
      const resized = oriented.resize(size.width, size.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Apply format and quality
      let processed = resized;
      switch (this.format) {
        case 'webp':
          processed = processed.webp({ quality: this.quality });
          break;
        case 'jpeg':
        case 'jpg':
          processed = processed.jpeg({ quality: this.quality });
          break;
        case 'png':
          processed = processed.png({ quality: this.quality });
          break;
      }

      const outputBuffer = await processed.toBuffer();
      const metadata = await sharp(outputBuffer).metadata();

      return {
        buffer: outputBuffer,
        size: outputBuffer.length,
        format: metadata.format || this.format,
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Failed to generate thumbnail', error);
      throw error;
    }
  }

  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height);
    } catch (error) {
      return false;
    }
  }

  async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      this.logger.error('Failed to get image metadata', error);
      throw error;
    }
  }

  async optimizeImage(buffer: Buffer, maxWidth?: number, maxHeight?: number): Promise<ProcessedImage> {
    try {
      let sharpInstance = sharp(buffer);
      
      // Auto-orient
      sharpInstance = sharpInstance.rotate();
      
      // Resize if needed
      if (maxWidth || maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to optimal format
      const optimized = sharpInstance.webp({ quality: this.quality });
      const outputBuffer = await optimized.toBuffer();
      const metadata = await sharp(outputBuffer).metadata();

      return {
        buffer: outputBuffer,
        size: outputBuffer.length,
        format: metadata.format || 'webp',
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Failed to optimize image', error);
      throw error;
    }
  }
}