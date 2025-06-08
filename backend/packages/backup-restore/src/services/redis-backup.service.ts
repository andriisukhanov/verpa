import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BackupMetadata, BackupType, ServiceBackupConfig } from '../utils/backup.types';
import { CompressionUtils } from '../utils/compression.utils';
import { EncryptionUtils } from '../utils/encryption.utils';

const execAsync = promisify(exec);

@Injectable()
export class RedisBackupService {
  private readonly logger = new Logger(RedisBackupService.name);
  private client: Redis;

  async connect(config: any): Promise<void> {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
    });
    
    await new Promise<void>((resolve, reject) => {
      this.client.on('connect', () => {
        this.logger.log('Connected to Redis for backup operations');
        resolve();
      });
      this.client.on('error', reject);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  async backup(
    config: ServiceBackupConfig,
    outputDir: string,
    options: {
      type: BackupType;
      compress?: boolean;
      encrypt?: boolean;
      encryptionKey?: string;
    },
  ): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `redis-${Date.now()}`;
    const tempDir = path.join(outputDir, 'temp', backupId);

    try {
      // Create temp directory
      await fs.promises.mkdir(tempDir, { recursive: true });

      let backupPath: string;
      let size: number;

      if (options.type === BackupType.FULL) {
        backupPath = await this.performFullBackup(config, tempDir);
      } else {
        // Redis doesn't support incremental/differential backups natively
        // We'll perform a full backup for all types
        this.logger.warn('Redis only supports full backups, performing full backup');
        backupPath = await this.performFullBackup(config, tempDir);
      }

      // Compress if requested
      if (options.compress) {
        const compressedPath = `${backupPath}.gz`;
        await CompressionUtils.compressFile(backupPath, compressedPath);
        await fs.promises.unlink(backupPath);
        backupPath = compressedPath;
      }

      // Encrypt if requested
      if (options.encrypt && options.encryptionKey) {
        const encryptedPath = `${backupPath}.enc`;
        const encryptionMetadata = await EncryptionUtils.encryptFile(
          backupPath,
          encryptedPath,
          options.encryptionKey,
        );
        await fs.promises.unlink(backupPath);
        backupPath = encryptedPath;

        // Save encryption metadata
        await fs.promises.writeFile(
          `${encryptedPath}.meta`,
          JSON.stringify(encryptionMetadata),
        );
      }

      // Calculate final size
      const stats = await fs.promises.stat(backupPath);
      size = stats.size;

      // Move to final location
      const finalPath = path.join(outputDir, path.basename(backupPath));
      await fs.promises.rename(backupPath, finalPath);

      // Calculate checksum
      const checksum = await EncryptionUtils.calculateChecksum(finalPath);

      // Clean up temp directory
      await fs.promises.rmdir(tempDir, { recursive: true });

      return {
        id: backupId,
        timestamp: new Date(),
        type: BackupType.FULL,
        status: 'completed' as any,
        size,
        duration: Date.now() - startTime,
        services: ['redis'],
        version: '1.0',
        checksum,
        encryptionMethod: options.encrypt ? 'aes-256-gcm' : undefined,
        compressionMethod: options.compress ? 'gzip' : undefined,
      };
    } catch (error) {
      this.logger.error(`Redis backup failed: ${error.message}`, error.stack);
      
      // Clean up on error
      try {
        await fs.promises.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        this.logger.error(`Failed to clean up temp directory: ${cleanupError.message}`);
      }

      throw error;
    }
  }

  private async performFullBackup(
    config: ServiceBackupConfig,
    outputDir: string,
  ): Promise<string> {
    const outputPath = path.join(outputDir, `redis-full-${Date.now()}.rdb`);

    // Method 1: Use BGSAVE command (preferred)
    try {
      return await this.performBGSaveBackup(outputPath);
    } catch (error) {
      this.logger.warn(`BGSAVE backup failed, trying alternative method: ${error.message}`);
    }

    // Method 2: Export all keys to JSON (fallback)
    return await this.performJSONExport(outputPath.replace('.rdb', '.json'));
  }

  private async performBGSaveBackup(outputPath: string): Promise<string> {
    // Trigger background save
    const result = await this.client.bgsave();
    this.logger.log(`BGSAVE initiated: ${result}`);

    // Wait for BGSAVE to complete
    await this.waitForBGSaveComplete();

    // Get Redis data directory
    const configResult = await this.client.config('GET', 'dir');
    const redisDir = configResult[1];
    const dbFilename = (await this.client.config('GET', 'dbfilename'))[1];
    const rdbPath = path.join(redisDir, dbFilename);

    // Copy RDB file to backup location
    await fs.promises.copyFile(rdbPath, outputPath);

    this.logger.log(`Redis RDB backup completed: ${outputPath}`);
    return outputPath;
  }

  private async waitForBGSaveComplete(timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const info = await this.client.info('persistence');
      const isSaving = info.includes('rdb_bgsave_in_progress:1');
      
      if (!isSaving) {
        // Check if last save was successful
        if (info.includes('rdb_last_bgsave_status:ok')) {
          return;
        } else {
          throw new Error('BGSAVE failed');
        }
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('BGSAVE timeout');
  }

  private async performJSONExport(outputPath: string): Promise<string> {
    const data: Record<string, any> = {};
    
    // Get all keys using SCAN to avoid blocking
    const keys = await this.scanAllKeys();
    
    // Export each key
    for (const key of keys) {
      const type = await this.client.type(key);
      const ttl = await this.client.ttl(key);
      
      let value: any;
      switch (type) {
        case 'string':
          value = await this.client.get(key);
          break;
        case 'list':
          value = await this.client.lrange(key, 0, -1);
          break;
        case 'set':
          value = await this.client.smembers(key);
          break;
        case 'zset':
          value = await this.client.zrange(key, 0, -1, 'WITHSCORES');
          break;
        case 'hash':
          value = await this.client.hgetall(key);
          break;
        default:
          this.logger.warn(`Unknown type ${type} for key ${key}`);
          continue;
      }
      
      data[key] = {
        type,
        value,
        ttl: ttl > 0 ? ttl : null,
      };
    }
    
    // Write to file
    await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2));
    
    this.logger.log(`Redis JSON export completed: ${outputPath}`);
    return outputPath;
  }

  private async scanAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await this.client.scan(cursor, 'COUNT', 1000);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys;
  }

  async restore(
    backupPath: string,
    config: ServiceBackupConfig,
    options: {
      decrypt?: boolean;
      decryptionKey?: string;
      decompress?: boolean;
      flushExisting?: boolean;
    },
  ): Promise<void> {
    let processedPath = backupPath;

    try {
      // Decrypt if needed
      if (options.decrypt && options.decryptionKey) {
        const decryptedPath = backupPath.replace('.enc', '');
        await EncryptionUtils.decryptFile(backupPath, decryptedPath, options.decryptionKey);
        processedPath = decryptedPath;
      }

      // Decompress if needed
      if (options.decompress || processedPath.endsWith('.gz')) {
        const decompressedPath = processedPath.replace('.gz', '');
        await CompressionUtils.decompressFile(processedPath, decompressedPath);
        
        if (processedPath !== backupPath) {
          await fs.promises.unlink(processedPath);
        }
        processedPath = decompressedPath;
      }

      // Flush existing data if requested
      if (options.flushExisting) {
        await this.client.flushdb();
        this.logger.log('Flushed existing Redis data');
      }

      // Perform restore based on backup type
      if (processedPath.endsWith('.rdb')) {
        await this.restoreFromRDB(processedPath, config);
      } else if (processedPath.endsWith('.json')) {
        await this.restoreFromJSON(processedPath);
      }

      // Clean up temporary files
      if (processedPath !== backupPath) {
        await fs.promises.unlink(processedPath);
      }

      this.logger.log('Redis restore completed successfully');
    } catch (error) {
      this.logger.error(`Redis restore failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async restoreFromRDB(rdbPath: string, config: ServiceBackupConfig): Promise<void> {
    // For RDB restore, we need to:
    // 1. Stop Redis server
    // 2. Replace the RDB file
    // 3. Start Redis server
    
    // This requires server-level access and is typically done outside the application
    throw new Error(
      'RDB restore requires stopping Redis server. ' +
      'Please manually copy the RDB file to Redis data directory and restart Redis.'
    );
  }

  private async restoreFromJSON(jsonPath: string): Promise<void> {
    const data = JSON.parse(await fs.promises.readFile(jsonPath, 'utf-8'));
    
    // Use pipeline for better performance
    const pipeline = this.client.pipeline();
    
    for (const [key, metadata] of Object.entries(data)) {
      const { type, value, ttl } = metadata as any;
      
      switch (type) {
        case 'string':
          pipeline.set(key, value);
          break;
        case 'list':
          pipeline.del(key);
          if (value.length > 0) {
            pipeline.rpush(key, ...value);
          }
          break;
        case 'set':
          pipeline.del(key);
          if (value.length > 0) {
            pipeline.sadd(key, ...value);
          }
          break;
        case 'zset':
          pipeline.del(key);
          if (value.length > 0) {
            // Convert flat array to pairs
            const members: string[] = [];
            for (let i = 0; i < value.length; i += 2) {
              members.push(value[i + 1], value[i]);
            }
            pipeline.zadd(key, ...members);
          }
          break;
        case 'hash':
          pipeline.del(key);
          if (Object.keys(value).length > 0) {
            pipeline.hset(key, value);
          }
          break;
      }
      
      // Set TTL if needed
      if (ttl && ttl > 0) {
        pipeline.expire(key, ttl);
      }
    }
    
    // Execute pipeline
    await pipeline.exec();
    
    this.logger.log(`Restored ${Object.keys(data).length} keys from JSON backup`);
  }

  async validateBackup(backupPath: string, expectedChecksum?: string): Promise<boolean> {
    try {
      // Verify file exists
      await fs.promises.access(backupPath);

      // Verify checksum if provided
      if (expectedChecksum) {
        const actualChecksum = await EncryptionUtils.calculateChecksum(backupPath);
        if (actualChecksum !== expectedChecksum) {
          this.logger.error('Backup checksum mismatch');
          return false;
        }
      }

      // For JSON backups, validate structure
      if (backupPath.endsWith('.json')) {
        try {
          const data = JSON.parse(await fs.promises.readFile(backupPath, 'utf-8'));
          if (typeof data !== 'object') {
            throw new Error('Invalid JSON structure');
          }
        } catch (error) {
          this.logger.error('JSON validation failed');
          return false;
        }
      }

      // For RDB files, check magic string
      if (backupPath.endsWith('.rdb')) {
        const fd = await fs.promises.open(backupPath, 'r');
        const buffer = Buffer.alloc(5);
        await fd.read(buffer, 0, 5, 0);
        await fd.close();
        
        if (buffer.toString() !== 'REDIS') {
          this.logger.error('Invalid RDB file format');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Backup validation failed: ${error.message}`);
      return false;
    }
  }

  async getBackupInfo(): Promise<any> {
    const info = await this.client.info('persistence');
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    }
    
    return {
      lastSaveTime: new Date(parseInt(result.rdb_last_save_time) * 1000),
      lastSaveStatus: result.rdb_last_bgsave_status,
      currentlySaving: result.rdb_bgsave_in_progress === '1',
      lastSaveDuration: parseInt(result.rdb_last_bgsave_time_sec),
      aofEnabled: result.aof_enabled === '1',
    };
  }
}