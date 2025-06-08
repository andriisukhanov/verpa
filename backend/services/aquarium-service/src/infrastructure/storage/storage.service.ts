import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const region = this.configService.get<string>('storage.region', 'us-east-1');
    
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKey'),
        secretAccessKey: this.configService.get<string>('storage.secretKey'),
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.bucket = this.configService.get<string>('storage.bucket');
    this.region = region;
  }

  async uploadAquariumImage(
    aquariumId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Check file size
    const maxSize = this.configService.get<number>('limits.maxImageSize');
    if (buffer.length > maxSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    const extension = mimeType.split('/')[1];
    const key = `aquariums/${aquariumId}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        aquariumId,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      await this.s3Client.send(command);
      return this.getPublicUrl(key);
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Don't throw error as file might not exist
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('storage.endpoint');
    return `${endpoint}/${this.bucket}/${key}`;
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Remove bucket name from path
      pathParts.shift(); // Remove leading empty string
      pathParts.shift(); // Remove bucket name
      return pathParts.join('/');
    } catch {
      return null;
    }
  }

  async createBucketIfNotExists(): Promise<void> {
    // This would be called during initialization
    // For MinIO, buckets are usually created manually or via init scripts
  }
}