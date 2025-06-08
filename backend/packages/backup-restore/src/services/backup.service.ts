import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  BackupJob,
  BackupMetadata,
  BackupOptions,
  BackupStatus,
  BackupType,
  ServiceBackupConfig,
} from '../utils/backup.types';
import { BackupConfiguration } from '../utils/backup.config';
import { MongoDBBackupService } from './mongodb-backup.service';
import { PostgresBackupService } from './postgres-backup.service';
import { RedisBackupService } from './redis-backup.service';
import { StorageService } from './storage.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private runningBackups: Map<string, BackupMetadata> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly mongoBackupService: MongoDBBackupService,
    private readonly postgresBackupService: PostgresBackupService,
    private readonly redisBackupService: RedisBackupService,
    private readonly storageService: StorageService,
  ) {}

  async performBackup(job: BackupJob): Promise<BackupMetadata[]> {
    const backupId = uuidv4();
    const startTime = Date.now();
    const results: BackupMetadata[] = [];

    this.logger.log(`Starting backup job: ${job.name} (${backupId})`);

    // Create backup directory
    const backupDir = path.join(
      this.configService.get<string>('backup.basePath', '/var/backups/verpa'),
      job.name,
      new Date().toISOString().split('T')[0],
    );
    await fs.promises.mkdir(backupDir, { recursive: true });

    try {
      // Backup each service
      for (const serviceConfig of job.services) {
        const serviceBackup = await this.backupService(
          serviceConfig,
          backupDir,
          job.options,
        );
        results.push(serviceBackup);
      }

      // Create manifest file
      const manifest = {
        id: backupId,
        job: job.name,
        timestamp: new Date(),
        services: results,
        totalSize: results.reduce((sum, r) => sum + r.size, 0),
        totalDuration: Date.now() - startTime,
      };

      await fs.promises.writeFile(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );

      // Upload to remote storage if configured
      if (job.options.storage.provider !== 'local') {
        await this.storageService.upload(backupDir, job.options.storage);
      }

      // Apply retention policy
      if (job.options.retention) {
        await this.applyRetentionPolicy(job);
      }

      // Send notifications
      if (job.options.notifications) {
        await this.sendNotification(job, results, 'success');
      }

      this.logger.log(`Backup job completed: ${job.name} (${backupId})`);
      return results;
    } catch (error) {
      this.logger.error(`Backup job failed: ${job.name}`, error.stack);

      // Send failure notification
      if (job.options.notifications) {
        await this.sendNotification(job, results, 'failure', error.message);
      }

      throw error;
    }
  }

  private async backupService(
    config: ServiceBackupConfig,
    outputDir: string,
    options: BackupOptions,
  ): Promise<BackupMetadata> {
    const serviceDir = path.join(outputDir, config.name);
    await fs.promises.mkdir(serviceDir, { recursive: true });

    switch (config.type) {
      case 'mongodb':
        await this.mongoBackupService.connect(config.connectionString!);
        try {
          return await this.mongoBackupService.backup(config, serviceDir, {
            type: options.type,
            compress: options.compress,
            encrypt: options.encrypt,
            encryptionKey: options.encryptionKey,
          });
        } finally {
          await this.mongoBackupService.disconnect();
        }

      case 'postgresql':
        await this.postgresBackupService.connect(this.parsePostgresConfig(config));
        try {
          return await this.postgresBackupService.backup(config, serviceDir, {
            type: options.type,
            compress: options.compress,
            encrypt: options.encrypt,
            encryptionKey: options.encryptionKey,
          });
        } finally {
          await this.postgresBackupService.disconnect();
        }

      case 'redis':
        await this.redisBackupService.connect(this.parseRedisConfig(config));
        try {
          return await this.redisBackupService.backup(config, serviceDir, {
            type: options.type,
            compress: options.compress,
            encrypt: options.encrypt,
            encryptionKey: options.encryptionKey,
          });
        } finally {
          await this.redisBackupService.disconnect();
        }

      case 'files':
        return await this.backupFiles(config, serviceDir, options);

      default:
        throw new Error(`Unsupported backup type: ${config.type}`);
    }
  }

  private async backupFiles(
    config: ServiceBackupConfig,
    outputDir: string,
    options: BackupOptions,
  ): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `files-${Date.now()}`;
    const archivePath = path.join(outputDir, `files-${Date.now()}.tar.gz`);

    // Create archive of specified paths
    const CompressionUtils = await import('../utils/compression.utils').then(m => m.CompressionUtils);
    const result = await CompressionUtils.createArchive(
      config.paths || [],
      archivePath,
      'tar',
      options.compress ? 9 : 0,
    );

    // Encrypt if needed
    if (options.encrypt && options.encryptionKey) {
      const EncryptionUtils = await import('../utils/encryption.utils').then(m => m.EncryptionUtils);
      const encryptedPath = `${archivePath}.enc`;
      await EncryptionUtils.encryptFile(archivePath, encryptedPath, options.encryptionKey);
      await fs.promises.unlink(archivePath);
    }

    return {
      id: backupId,
      timestamp: new Date(),
      type: options.type,
      status: BackupStatus.COMPLETED,
      size: result.size,
      duration: Date.now() - startTime,
      services: ['files'],
      version: '1.0',
    };
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

  private async applyRetentionPolicy(job: BackupJob): Promise<void> {
    const basePath = path.join(
      this.configService.get<string>('backup.basePath', '/var/backups/verpa'),
      job.name,
    );

    // Get all backup directories
    const dirs = await fs.promises.readdir(basePath);
    const backupDirs = dirs
      .filter(dir => /^\d{4}-\d{2}-\d{2}$/.test(dir))
      .sort()
      .reverse();

    // Apply retention rules
    const retention = job.options.retention!;
    const now = new Date();
    const toDelete: string[] = [];

    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    for (const dir of backupDirs) {
      const date = new Date(dir);
      const ageInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      let keep = false;

      // Keep daily backups
      if (dailyCount < retention.daily && ageInDays < retention.daily) {
        keep = true;
        dailyCount++;
      }
      // Keep weekly backups (Sunday)
      else if (weeklyCount < retention.weekly && date.getDay() === 0 && ageInDays < retention.weekly * 7) {
        keep = true;
        weeklyCount++;
      }
      // Keep monthly backups (1st of month)
      else if (monthlyCount < retention.monthly && date.getDate() === 1 && ageInDays < retention.monthly * 30) {
        keep = true;
        monthlyCount++;
      }
      // Keep yearly backups (Jan 1st)
      else if (yearlyCount < retention.yearly && date.getMonth() === 0 && date.getDate() === 1) {
        keep = true;
        yearlyCount++;
      }

      if (!keep) {
        toDelete.push(path.join(basePath, dir));
      }
    }

    // Delete old backups
    for (const dir of toDelete) {
      this.logger.log(`Deleting old backup: ${dir}`);
      await fs.promises.rmdir(dir, { recursive: true });
    }
  }

  private async sendNotification(
    job: BackupJob,
    results: BackupMetadata[],
    status: 'success' | 'failure',
    error?: string,
  ): Promise<void> {
    const notification = {
      job: job.name,
      status,
      timestamp: new Date(),
      results: results.map(r => ({
        service: r.services[0],
        size: r.size,
        duration: r.duration,
        status: r.status,
      })),
      error,
    };

    // Email notification
    if (job.options.notifications?.email) {
      // Implement email sending
      this.logger.log(`Sending email notification to ${job.options.notifications.email.join(', ')}`);
    }

    // Slack notification
    if (job.options.notifications?.slack) {
      // Implement Slack webhook
      this.logger.log(`Sending Slack notification`);
    }

    // Webhook notification
    if (job.options.notifications?.webhook) {
      // Implement webhook call
      this.logger.log(`Sending webhook notification to ${job.options.notifications.webhook}`);
    }
  }

  async listBackups(jobName?: string): Promise<any[]> {
    const basePath = this.configService.get<string>('backup.basePath', '/var/backups/verpa');
    const backups: any[] = [];

    const jobDirs = jobName ? [jobName] : await fs.promises.readdir(basePath);

    for (const job of jobDirs) {
      const jobPath = path.join(basePath, job);
      const stat = await fs.promises.stat(jobPath);

      if (!stat.isDirectory()) continue;

      const dateDirs = await fs.promises.readdir(jobPath);

      for (const dateDir of dateDirs) {
        const backupPath = path.join(jobPath, dateDir);
        const manifestPath = path.join(backupPath, 'manifest.json');

        try {
          const manifest = JSON.parse(
            await fs.promises.readFile(manifestPath, 'utf-8'),
          );
          backups.push({
            ...manifest,
            path: backupPath,
          });
        } catch (error) {
          // Skip if no manifest
        }
      }
    }

    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getBackupStatus(backupId: string): Promise<BackupMetadata | null> {
    return this.runningBackups.get(backupId) || null;
  }

  async cancelBackup(backupId: string): Promise<boolean> {
    const backup = this.runningBackups.get(backupId);
    if (backup && backup.status === BackupStatus.IN_PROGRESS) {
      backup.status = BackupStatus.CANCELLED;
      this.runningBackups.set(backupId, backup);
      return true;
    }
    return false;
  }
}