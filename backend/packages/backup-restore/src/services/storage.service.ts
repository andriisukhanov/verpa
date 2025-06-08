import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Storage as GCSStorage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import { StorageConfig, StorageProvider } from '../utils/backup.types';
import { CompressionUtils } from '../utils/compression.utils';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client?: S3Client;
  private gcsStorage?: GCSStorage;

  async upload(localPath: string, config: StorageConfig): Promise<void> {
    switch (config.provider) {
      case StorageProvider.S3:
        await this.uploadToS3(localPath, config);
        break;
      case StorageProvider.GCS:
        await this.uploadToGCS(localPath, config);
        break;
      case StorageProvider.AZURE:
        await this.uploadToAzure(localPath, config);
        break;
      case StorageProvider.LOCAL:
        // Already stored locally
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async download(remotePath: string, localPath: string, config: StorageConfig): Promise<void> {
    switch (config.provider) {
      case StorageProvider.S3:
        await this.downloadFromS3(remotePath, localPath, config);
        break;
      case StorageProvider.GCS:
        await this.downloadFromGCS(remotePath, localPath, config);
        break;
      case StorageProvider.AZURE:
        await this.downloadFromAzure(remotePath, localPath, config);
        break;
      case StorageProvider.LOCAL:
        await fs.promises.copyFile(remotePath, localPath);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async list(prefix: string, config: StorageConfig): Promise<string[]> {
    switch (config.provider) {
      case StorageProvider.S3:
        return this.listFromS3(prefix, config);
      case StorageProvider.GCS:
        return this.listFromGCS(prefix, config);
      case StorageProvider.AZURE:
        return this.listFromAzure(prefix, config);
      case StorageProvider.LOCAL:
        return this.listLocal(path.join(config.path, prefix));
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async delete(remotePath: string, config: StorageConfig): Promise<void> {
    switch (config.provider) {
      case StorageProvider.S3:
        await this.deleteFromS3(remotePath, config);
        break;
      case StorageProvider.GCS:
        await this.deleteFromGCS(remotePath, config);
        break;
      case StorageProvider.AZURE:
        await this.deleteFromAzure(remotePath, config);
        break;
      case StorageProvider.LOCAL:
        await fs.promises.unlink(remotePath);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  // S3 Implementation
  private async uploadToS3(localPath: string, config: StorageConfig): Promise<void> {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: config.region || 'us-east-1',
        credentials: config.credentials,
        endpoint: config.credentials?.endpoint,
      });
    }

    const files = await this.getFilesRecursive(localPath);

    for (const file of files) {
      const key = path.join(
        config.path,
        path.relative(localPath, file),
      );

      const fileStream = fs.createReadStream(file);
      const stats = await fs.promises.stat(file);

      await this.s3Client.send(new PutObjectCommand({
        Bucket: config.bucket!,
        Key: key,
        Body: fileStream,
        ContentLength: stats.size,
        ContentType: this.getContentType(file),
        Metadata: {
          'backup-timestamp': new Date().toISOString(),
        },
      }));

      this.logger.log(`Uploaded to S3: ${key}`);
    }
  }

  private async downloadFromS3(remotePath: string, localPath: string, config: StorageConfig): Promise<void> {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: config.region || 'us-east-1',
        credentials: config.credentials,
        endpoint: config.credentials?.endpoint,
      });
    }

    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: config.bucket!,
      Key: remotePath,
    }));

    const writeStream = fs.createWriteStream(localPath);
    response.Body?.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  private async listFromS3(prefix: string, config: StorageConfig): Promise<string[]> {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: config.region || 'us-east-1',
        credentials: config.credentials,
        endpoint: config.credentials?.endpoint,
      });
    }

    const files: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: config.bucket!,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      if (response.Contents) {
        files.push(...response.Contents.map(obj => obj.Key!));
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  private async deleteFromS3(remotePath: string, config: StorageConfig): Promise<void> {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: config.region || 'us-east-1',
        credentials: config.credentials,
        endpoint: config.credentials?.endpoint,
      });
    }

    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: config.bucket!,
      Key: remotePath,
    }));
  }

  // GCS Implementation
  private async uploadToGCS(localPath: string, config: StorageConfig): Promise<void> {
    if (!this.gcsStorage) {
      this.gcsStorage = new GCSStorage({
        projectId: config.credentials?.projectId,
        keyFilename: config.credentials?.keyFile,
      });
    }

    const bucket = this.gcsStorage.bucket(config.bucket!);
    const files = await this.getFilesRecursive(localPath);

    for (const file of files) {
      const destination = path.join(
        config.path,
        path.relative(localPath, file),
      );

      await bucket.upload(file, {
        destination,
        metadata: {
          metadata: {
            'backup-timestamp': new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Uploaded to GCS: ${destination}`);
    }
  }

  private async downloadFromGCS(remotePath: string, localPath: string, config: StorageConfig): Promise<void> {
    if (!this.gcsStorage) {
      this.gcsStorage = new GCSStorage({
        projectId: config.credentials?.projectId,
        keyFilename: config.credentials?.keyFile,
      });
    }

    const bucket = this.gcsStorage.bucket(config.bucket!);
    await bucket.file(remotePath).download({ destination: localPath });
  }

  private async listFromGCS(prefix: string, config: StorageConfig): Promise<string[]> {
    if (!this.gcsStorage) {
      this.gcsStorage = new GCSStorage({
        projectId: config.credentials?.projectId,
        keyFilename: config.credentials?.keyFile,
      });
    }

    const bucket = this.gcsStorage.bucket(config.bucket!);
    const [files] = await bucket.getFiles({ prefix });

    return files.map(file => file.name);
  }

  private async deleteFromGCS(remotePath: string, config: StorageConfig): Promise<void> {
    if (!this.gcsStorage) {
      this.gcsStorage = new GCSStorage({
        projectId: config.credentials?.projectId,
        keyFilename: config.credentials?.keyFile,
      });
    }

    const bucket = this.gcsStorage.bucket(config.bucket!);
    await bucket.file(remotePath).delete();
  }

  // Azure Implementation (placeholder)
  private async uploadToAzure(localPath: string, config: StorageConfig): Promise<void> {
    throw new Error('Azure storage not implemented yet');
  }

  private async downloadFromAzure(remotePath: string, localPath: string, config: StorageConfig): Promise<void> {
    throw new Error('Azure storage not implemented yet');
  }

  private async listFromAzure(prefix: string, config: StorageConfig): Promise<string[]> {
    throw new Error('Azure storage not implemented yet');
  }

  private async deleteFromAzure(remotePath: string, config: StorageConfig): Promise<void> {
    throw new Error('Azure storage not implemented yet');
  }

  // Local storage helpers
  private async listLocal(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.listLocal(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to list directory ${dirPath}: ${error.message}`);
    }

    return files;
  }

  // Utility methods
  private async getFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.getFilesRecursive(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.json': 'application/json',
      '.sql': 'application/sql',
      '.rdb': 'application/octet-stream',
      '.gz': 'application/gzip',
      '.tar': 'application/x-tar',
      '.zip': 'application/zip',
      '.enc': 'application/octet-stream',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  async getStorageInfo(config: StorageConfig): Promise<any> {
    switch (config.provider) {
      case StorageProvider.LOCAL:
        const stats = await fs.promises.statfs(config.path);
        return {
          provider: 'local',
          totalSpace: stats.blocks * stats.bsize,
          freeSpace: stats.bfree * stats.bsize,
          usedSpace: (stats.blocks - stats.bfree) * stats.bsize,
        };

      case StorageProvider.S3:
        // Get bucket info
        return {
          provider: 's3',
          bucket: config.bucket,
          region: config.region,
        };

      case StorageProvider.GCS:
        // Get bucket info
        return {
          provider: 'gcs',
          bucket: config.bucket,
          projectId: config.credentials?.projectId,
        };

      default:
        return { provider: config.provider };
    }
  }
}