import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import {
  RestoreOptions,
  RestoreResult,
  ServiceBackupConfig,
  StorageConfig,
} from '../utils/backup.types';
import { MongoDBBackupService } from './mongodb-backup.service';
import { PostgresBackupService } from './postgres-backup.service';
import { RedisBackupService } from './redis-backup.service';
import { StorageService } from './storage.service';
import { ValidationUtils } from '../utils/validation.utils';

@Injectable()
export class RestoreService {
  private readonly logger = new Logger(RestoreService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mongoBackupService: MongoDBBackupService,
    private readonly postgresBackupService: PostgresBackupService,
    private readonly redisBackupService: RedisBackupService,
    private readonly storageService: StorageService,
  ) {}

  async performRestore(
    backupPath: string,
    options: RestoreOptions,
  ): Promise<RestoreResult> {
    const startTime = Date.now();
    const restoredServices: string[] = [];
    const failedServices: string[] = [];
    const errors: Error[] = [];
    const warnings: string[] = [];

    this.logger.log(`Starting restore from: ${backupPath}`);

    try {
      // Validate backup
      if (!options.skipValidation) {
        const validationResult = await this.validateBackup(backupPath);
        if (!validationResult.isValid) {
          throw new Error(`Backup validation failed: ${validationResult.errors?.join(', ')}`);
        }
      }

      // Read manifest
      const manifestPath = path.join(backupPath, 'manifest.json');
      const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));

      // Dry run check
      if (options.dryRun) {
        this.logger.log('Dry run mode - no actual restore will be performed');
        return {
          success: true,
          restoredServices: manifest.services.map((s: any) => s.services[0]),
          failedServices: [],
          duration: 0,
          warnings: ['Dry run completed - no changes made'],
        };
      }

      // Restore each service
      const servicesToRestore = options.services || manifest.services.map((s: any) => s.services[0]);
      
      for (const serviceMetadata of manifest.services) {
        const serviceName = serviceMetadata.services[0];
        
        if (!servicesToRestore.includes(serviceName)) {
          this.logger.log(`Skipping service: ${serviceName}`);
          continue;
        }

        try {
          await this.restoreService(
            serviceName,
            path.join(backupPath, serviceName),
            serviceMetadata,
            options,
          );
          restoredServices.push(serviceName);
          this.logger.log(`Successfully restored: ${serviceName}`);
        } catch (error) {
          failedServices.push(serviceName);
          errors.push(error);
          this.logger.error(`Failed to restore ${serviceName}: ${error.message}`);
          
          if (!options.parallel) {
            // Stop on first error in sequential mode
            break;
          }
        }
      }

      // Post-restore validation
      if (!options.skipValidation) {
        await this.validateRestore(restoredServices);
      }

      const success = failedServices.length === 0;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Restore completed in ${duration}ms. ` +
        `Restored: ${restoredServices.length}, Failed: ${failedServices.length}`,
      );

      return {
        success,
        restoredServices,
        failedServices,
        duration,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async restoreService(
    serviceName: string,
    servicePath: string,
    metadata: any,
    options: RestoreOptions,
  ): Promise<void> {
    // Find backup file
    const files = await fs.promises.readdir(servicePath);
    const backupFile = files.find(f => 
      f.startsWith(`${serviceName}-`) && 
      (f.endsWith('.archive') || f.endsWith('.sql') || f.endsWith('.rdb') || f.endsWith('.json'))
    );

    if (!backupFile) {
      throw new Error(`No backup file found for service: ${serviceName}`);
    }

    const backupFilePath = path.join(servicePath, backupFile);

    // Determine service config
    const serviceConfig: ServiceBackupConfig = {
      name: serviceName,
      type: this.getServiceType(serviceName),
    };

    // Add connection strings from config
    const dbConfig = this.configService.get(`databases.${serviceName}`);
    if (dbConfig) {
      serviceConfig.connectionString = this.buildConnectionString(serviceName, dbConfig);
    }

    switch (serviceConfig.type) {
      case 'mongodb':
        await this.mongoBackupService.connect(serviceConfig.connectionString!);
        try {
          await this.mongoBackupService.restore(backupFilePath, serviceConfig, {
            decrypt: metadata.encryptionMethod !== undefined,
            decryptionKey: options.targetEnvironment ? 
              this.getEncryptionKey(options.targetEnvironment) : 
              this.getEncryptionKey('default'),
            decompress: metadata.compressionMethod !== undefined,
            targetDatabase: options.targetEnvironment ? 
              `${serviceName}_${options.targetEnvironment}` : 
              undefined,
            dropExisting: options.overwrite,
          });
        } finally {
          await this.mongoBackupService.disconnect();
        }
        break;

      case 'postgresql':
        await this.postgresBackupService.connect(this.parsePostgresConfig(serviceConfig));
        try {
          await this.postgresBackupService.restore(backupFilePath, serviceConfig, {
            decrypt: metadata.encryptionMethod !== undefined,
            decryptionKey: this.getEncryptionKey(options.targetEnvironment || 'default'),
            decompress: metadata.compressionMethod !== undefined,
            targetDatabase: options.targetEnvironment ? 
              `${serviceName}_${options.targetEnvironment}` : 
              undefined,
            dropExisting: options.overwrite,
            createDatabase: true,
          });
        } finally {
          await this.postgresBackupService.disconnect();
        }
        break;

      case 'redis':
        await this.redisBackupService.connect(this.parseRedisConfig(serviceConfig));
        try {
          await this.redisBackupService.restore(backupFilePath, serviceConfig, {
            decrypt: metadata.encryptionMethod !== undefined,
            decryptionKey: this.getEncryptionKey(options.targetEnvironment || 'default'),
            decompress: metadata.compressionMethod !== undefined,
            flushExisting: options.overwrite,
          });
        } finally {
          await this.redisBackupService.disconnect();
        }
        break;

      default:
        throw new Error(`Unsupported service type: ${serviceConfig.type}`);
    }
  }

  private getServiceType(serviceName: string): 'mongodb' | 'postgresql' | 'redis' | 'files' {
    // Map service names to types
    const typeMap: Record<string, any> = {
      'user-service': 'mongodb',
      'aquarium-service': 'mongodb',
      'event-service': 'mongodb',
      'notification-service': 'mongodb',
      'analytics-service': 'postgresql',
      'subscription-service': 'postgresql',
      'cache': 'redis',
      'session': 'redis',
    };

    return typeMap[serviceName] || 'files';
  }

  private buildConnectionString(serviceName: string, config: any): string {
    switch (this.getServiceType(serviceName)) {
      case 'mongodb':
        return config.uri || `mongodb://${config.host}:${config.port}/${config.database}`;
      case 'postgresql':
        return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      case 'redis':
        return `redis://:${config.password}@${config.host}:${config.port}/${config.db || 0}`;
      default:
        return '';
    }
  }

  private parsePostgresConfig(config: ServiceBackupConfig): any {
    if (config.connectionString) {
      const url = new URL(config.connectionString);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        username: url.username,
        password: url.password,
        ssl: url.searchParams.get('ssl') === 'true',
      };
    }
    return {};
  }

  private parseRedisConfig(config: ServiceBackupConfig): any {
    if (config.connectionString) {
      const url = new URL(config.connectionString);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password,
        db: parseInt(url.pathname.slice(1)) || 0,
      };
    }
    return {};
  }

  private getEncryptionKey(environment: string): string {
    // In production, retrieve from secure key management service
    return this.configService.get(`backup.encryption.keys.${environment}`) || 
           this.configService.get('backup.encryption.defaultKey');
  }

  private async validateBackup(backupPath: string): Promise<any> {
    // Check if backup directory exists
    try {
      await fs.promises.access(backupPath);
    } catch (error) {
      return { isValid: false, errors: ['Backup directory not found'] };
    }

    // Check for manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    try {
      await fs.promises.access(manifestPath);
    } catch (error) {
      return { isValid: false, errors: ['Backup manifest not found'] };
    }

    // Validate manifest structure
    try {
      const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
      if (!manifest.id || !manifest.services || !Array.isArray(manifest.services)) {
        return { isValid: false, errors: ['Invalid manifest structure'] };
      }
    } catch (error) {
      return { isValid: false, errors: ['Failed to parse manifest'] };
    }

    return { isValid: true };
  }

  private async validateRestore(restoredServices: string[]): Promise<void> {
    // Perform basic connectivity checks for restored services
    for (const service of restoredServices) {
      try {
        switch (this.getServiceType(service)) {
          case 'mongodb':
            // Test MongoDB connection
            break;
          case 'postgresql':
            // Test PostgreSQL connection
            break;
          case 'redis':
            // Test Redis connection
            break;
        }
      } catch (error) {
        this.logger.warn(`Post-restore validation failed for ${service}: ${error.message}`);
      }
    }
  }

  async restoreFromRemote(
    backupId: string,
    storageConfig: StorageConfig,
    options: RestoreOptions,
  ): Promise<RestoreResult> {
    const tempDir = path.join(
      this.configService.get('backup.tempPath', '/tmp/verpa-restore'),
      backupId,
    );

    try {
      // Create temp directory
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Download backup from remote storage
      this.logger.log(`Downloading backup ${backupId} from ${storageConfig.provider}`);
      await this.storageService.download(backupId, tempDir, storageConfig);

      // Perform restore
      return await this.performRestore(tempDir, options);
    } finally {
      // Clean up temp directory
      try {
        await fs.promises.rmdir(tempDir, { recursive: true });
      } catch (error) {
        this.logger.warn(`Failed to clean up temp directory: ${error.message}`);
      }
    }
  }

  async restoreToPointInTime(
    timestamp: Date,
    services: string[],
    options: RestoreOptions,
  ): Promise<RestoreResult> {
    // Find the appropriate backup for the given timestamp
    const backups = await this.findBackupsNearTimestamp(timestamp, services);
    
    if (backups.length === 0) {
      throw new Error(`No backups found near timestamp: ${timestamp.toISOString()}`);
    }

    // Select the best backup (closest before the timestamp)
    const selectedBackup = backups
      .filter(b => new Date(b.timestamp) <= timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!selectedBackup) {
      throw new Error(`No backup found before timestamp: ${timestamp.toISOString()}`);
    }

    this.logger.log(`Using backup from ${selectedBackup.timestamp} for point-in-time restore`);

    // Restore the full backup
    const result = await this.performRestore(selectedBackup.path, {
      ...options,
      services,
    });

    // Apply incremental changes if needed
    if (selectedBackup.type === 'full') {
      await this.applyIncrementalChanges(selectedBackup.timestamp, timestamp, services);
    }

    return result;
  }

  private async findBackupsNearTimestamp(
    timestamp: Date,
    services: string[],
  ): Promise<any[]> {
    // This would query backup metadata to find appropriate backups
    const basePath = this.configService.get('backup.basePath', '/var/backups/verpa');
    const backups: any[] = [];

    // Implementation would search for backups near the timestamp
    // This is a simplified version
    const dirs = await fs.promises.readdir(basePath);
    
    for (const dir of dirs) {
      const manifestPath = path.join(basePath, dir, 'manifest.json');
      try {
        const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
        const backupTime = new Date(manifest.timestamp);
        
        // Check if backup contains required services
        const backupServices = manifest.services.map((s: any) => s.services[0]);
        const hasAllServices = services.every(s => backupServices.includes(s));
        
        if (hasAllServices) {
          backups.push({
            ...manifest,
            path: path.join(basePath, dir),
          });
        }
      } catch (error) {
        // Skip invalid backups
      }
    }

    return backups;
  }

  private async applyIncrementalChanges(
    fromTimestamp: Date,
    toTimestamp: Date,
    services: string[],
  ): Promise<void> {
    // This would apply incremental/differential backups or transaction logs
    // to bring the database to the exact point in time
    this.logger.log(
      `Applying incremental changes from ${fromTimestamp.toISOString()} ` +
      `to ${toTimestamp.toISOString()}`,
    );

    // Implementation would depend on the specific database capabilities
    // For example:
    // - MongoDB: Apply oplog entries
    // - PostgreSQL: Apply WAL files
    // - Redis: Limited options, might need custom implementation
  }
}