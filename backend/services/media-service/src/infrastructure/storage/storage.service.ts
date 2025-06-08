import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
  etag?: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private s3Client: S3Client;
  private readonly provider: string;
  private readonly bucket: string;
  private readonly publicBucket: string;
  private readonly endpoint: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('storage.provider', 'minio');
    this.bucket = this.configService.get<string>('storage.bucket');
    this.publicBucket = this.configService.get<string>('storage.publicBucket');
    this.endpoint = this.configService.get<string>('storage.endpoint');
    this.region = this.configService.get<string>('storage.region');

    if (this.provider === 'minio') {
      this.initializeMinio();
    } else {
      this.initializeS3();
    }
  }

  async onModuleInit() {
    await this.ensureBucketsExist();
  }

  private initializeMinio() {
    const endpointUrl = new URL(this.endpoint);
    this.minioClient = new Minio.Client({
      endPoint: endpointUrl.hostname,
      port: parseInt(endpointUrl.port) || (this.configService.get<boolean>('storage.useSSL') ? 443 : 80),
      useSSL: this.configService.get<boolean>('storage.useSSL'),
      accessKey: this.configService.get<string>('storage.accessKey'),
      secretKey: this.configService.get<string>('storage.secretKey'),
    });
  }

  private initializeS3() {
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKey'),
        secretAccessKey: this.configService.get<string>('storage.secretKey'),
      },
      ...(this.endpoint && { endpoint: this.endpoint }),
    });
  }

  async uploadFile(
    file: StorageFile,
    key: string,
    isPublic: boolean = false,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    try {
      if (this.provider === 'minio') {
        const result = await this.minioClient.putObject(
          bucket,
          key,
          file.buffer,
          file.size,
          {
            'Content-Type': file.mimetype,
            ...metadata,
          },
        );

        return {
          key,
          bucket,
          url: await this.getFileUrl(key, isPublic),
          size: file.size,
          etag: result.etag,
        };
      } else {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: metadata,
        });

        const result = await this.s3Client.send(command);

        return {
          key,
          bucket,
          url: await this.getFileUrl(key, isPublic),
          size: file.size,
          etag: result.ETag,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw error;
    }
  }

  async getFile(key: string, isPublic: boolean = false): Promise<Buffer> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    try {
      if (this.provider === 'minio') {
        const stream = await this.minioClient.getObject(bucket, key);
        return await this.streamToBuffer(stream);
      } else {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        const result = await this.s3Client.send(command);
        return await this.streamToBuffer(result.Body as Readable);
      }
    } catch (error) {
      this.logger.error(`Failed to get file: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string, isPublic: boolean = false): Promise<void> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    try {
      if (this.provider === 'minio') {
        await this.minioClient.removeObject(bucket, key);
      } else {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        await this.s3Client.send(command);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw error;
    }
  }

  async getFileUrl(key: string, isPublic: boolean = false): Promise<string> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    if (isPublic) {
      // For public files, return direct URL
      return `${this.endpoint}/${bucket}/${key}`;
    }

    // For private files, always use the API endpoint
    return `/api/v1/media/files/${encodeURIComponent(key)}`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600, isPublic: boolean = false): Promise<string> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    try {
      if (this.provider === 'minio') {
        return await this.minioClient.presignedGetObject(bucket, key, expiresIn);
      } else {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
      }
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${key}`, error);
      throw error;
    }
  }

  async fileExists(key: string, isPublic: boolean = false): Promise<boolean> {
    const bucket = isPublic ? this.publicBucket : this.bucket;

    try {
      if (this.provider === 'minio') {
        await this.minioClient.statObject(bucket, key);
        return true;
      } else {
        const command = new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        await this.s3Client.send(command);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  private async ensureBucketsExist() {
    try {
      if (this.provider === 'minio') {
        // Check and create private bucket
        const privateBucketExists = await this.minioClient.bucketExists(this.bucket);
        if (!privateBucketExists) {
          await this.minioClient.makeBucket(this.bucket, this.region);
          this.logger.log(`Created bucket: ${this.bucket}`);
        }

        // Check and create public bucket
        const publicBucketExists = await this.minioClient.bucketExists(this.publicBucket);
        if (!publicBucketExists) {
          await this.minioClient.makeBucket(this.publicBucket, this.region);
          
          // Set public bucket policy
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.publicBucket}/*`],
              },
            ],
          };
          await this.minioClient.setBucketPolicy(this.publicBucket, JSON.stringify(policy));
          this.logger.log(`Created public bucket: ${this.publicBucket}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to ensure buckets exist', error);
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}