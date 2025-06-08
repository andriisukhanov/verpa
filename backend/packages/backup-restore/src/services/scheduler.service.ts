import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { BackupJob, BackupType } from '../utils/backup.types';
import { BackupService } from './backup.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private jobs: Map<string, CronJob> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly backupService: BackupService,
  ) {}

  async onModuleInit() {
    const schedulingEnabled = this.configService.get('backup.scheduling.enabled', false);
    
    if (!schedulingEnabled) {
      this.logger.log('Backup scheduling is disabled');
      return;
    }

    await this.loadScheduledJobs();
  }

  async onModuleDestroy() {
    // Stop all jobs
    for (const [jobName, job] of this.jobs) {
      job.stop();
      this.logger.log(`Stopped scheduled job: ${jobName}`);
    }
  }

  private async loadScheduledJobs() {
    const timezone = this.configService.get('backup.scheduling.timezone', 'UTC');
    
    // Load job configurations
    const jobConfigs = this.getJobConfigurations();

    for (const jobConfig of jobConfigs) {
      if (!jobConfig.enabled) {
        continue;
      }

      try {
        const job = new CronJob(
          jobConfig.schedule,
          async () => {
            await this.executeBackupJob(jobConfig);
          },
          null,
          true,
          timezone,
        );

        this.schedulerRegistry.addCronJob(jobConfig.name, job);
        this.jobs.set(jobConfig.name, job);

        this.logger.log(
          `Scheduled backup job: ${jobConfig.name} ` +
          `(${jobConfig.schedule} in ${timezone})`
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule job ${jobConfig.name}: ${error.message}`
        );
      }
    }
  }

  private getJobConfigurations(): BackupJob[] {
    // In production, these would come from database or configuration
    return [
      {
        id: 'full-backup-weekly',
        name: 'Weekly Full Backup',
        schedule: this.configService.get('backup.scheduling.jobs.full', '0 2 * * 0'),
        services: [
          {
            name: 'mongodb',
            type: 'mongodb',
            connectionString: this.configService.get('databases.mongodb.uri'),
            databases: ['user-service', 'aquarium-service', 'event-service'],
          },
          {
            name: 'postgresql',
            type: 'postgresql',
            connectionString: this.buildPostgresConnectionString(),
            databases: ['analytics', 'subscriptions'],
          },
          {
            name: 'redis',
            type: 'redis',
            connectionString: this.buildRedisConnectionString(),
          },
        ],
        options: {
          type: BackupType.FULL,
          compress: true,
          encrypt: true,
          encryptionKey: this.configService.get('backup.encryption.defaultKey'),
          storage: {
            provider: this.configService.get('backup.storage.default', 'local'),
            path: this.configService.get('backup.storage.local.path'),
            bucket: this.configService.get('backup.storage.s3.bucket'),
            region: this.configService.get('backup.storage.s3.region'),
          },
          retention: {
            daily: 7,
            weekly: 4,
            monthly: 12,
            yearly: 5,
          },
          notifications: {
            email: this.configService.get('backup.notifications.email.recipients'),
            slack: this.configService.get('backup.notifications.slack.webhookUrl'),
          },
        },
        enabled: true,
      },
      {
        id: 'incremental-backup-daily',
        name: 'Daily Incremental Backup',
        schedule: this.configService.get('backup.scheduling.jobs.incremental', '0 2 * * 1-6'),
        services: [
          {
            name: 'mongodb',
            type: 'mongodb',
            connectionString: this.configService.get('databases.mongodb.uri'),
            databases: ['user-service', 'aquarium-service', 'event-service'],
          },
        ],
        options: {
          type: BackupType.INCREMENTAL,
          compress: true,
          encrypt: true,
          encryptionKey: this.configService.get('backup.encryption.defaultKey'),
          storage: {
            provider: this.configService.get('backup.storage.default', 'local'),
            path: this.configService.get('backup.storage.local.path'),
          },
          retention: {
            daily: 30,
            weekly: 0,
            monthly: 0,
            yearly: 0,
          },
        },
        enabled: true,
      },
      {
        id: 'differential-backup-hourly',
        name: 'Hourly Differential Backup',
        schedule: this.configService.get('backup.scheduling.jobs.differential', '0 * * * *'),
        services: [
          {
            name: 'redis',
            type: 'redis',
            connectionString: this.buildRedisConnectionString(),
          },
        ],
        options: {
          type: BackupType.DIFFERENTIAL,
          compress: true,
          encrypt: false, // Redis backups are less sensitive
          storage: {
            provider: 'local' as any,
            path: this.configService.get('backup.storage.local.path'),
          },
          retention: {
            daily: 24, // Keep 24 hourly backups
            weekly: 0,
            monthly: 0,
            yearly: 0,
          },
        },
        enabled: false, // Disabled by default due to frequency
      },
    ];
  }

  private buildPostgresConnectionString(): string {
    const config = this.configService.get('databases.postgresql');
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  }

  private buildRedisConnectionString(): string {
    const config = this.configService.get('databases.redis');
    return `redis://:${config.password}@${config.host}:${config.port}/${config.db || 0}`;
  }

  private async executeBackupJob(job: BackupJob) {
    this.logger.log(`Executing backup job: ${job.name}`);
    
    try {
      const startTime = Date.now();
      const results = await this.backupService.performBackup(job);
      const duration = Date.now() - startTime;

      this.logger.log(
        `Backup job completed: ${job.name} ` +
        `(${results.length} services, ${duration}ms)`
      );

      // Update job metadata
      job.lastRun = new Date();
      job.nextRun = this.getNextRunTime(job.schedule);

      // Store job execution history
      await this.storeJobHistory(job, results, 'success');
    } catch (error) {
      this.logger.error(
        `Backup job failed: ${job.name} - ${error.message}`,
        error.stack
      );

      // Store failure in history
      await this.storeJobHistory(job, [], 'failure', error.message);
    }
  }

  private getNextRunTime(cronExpression: string): Date {
    const job = new CronJob(cronExpression, () => {});
    return job.nextDate().toJSDate();
  }

  private async storeJobHistory(
    job: BackupJob,
    results: any[],
    status: 'success' | 'failure',
    error?: string,
  ) {
    // In production, store this in database
    const history = {
      jobId: job.id,
      jobName: job.name,
      executedAt: new Date(),
      status,
      results: results.map(r => ({
        service: r.services[0],
        size: r.size,
        duration: r.duration,
      })),
      error,
    };

    this.logger.debug(`Job history: ${JSON.stringify(history)}`);
  }

  async addScheduledJob(job: BackupJob): Promise<void> {
    if (this.jobs.has(job.id)) {
      throw new Error(`Job with ID ${job.id} already exists`);
    }

    const timezone = this.configService.get('backup.scheduling.timezone', 'UTC');
    
    const cronJob = new CronJob(
      job.schedule,
      async () => {
        await this.executeBackupJob(job);
      },
      null,
      job.enabled,
      timezone,
    );

    this.schedulerRegistry.addCronJob(job.id, cronJob);
    this.jobs.set(job.id, cronJob);

    this.logger.log(`Added scheduled job: ${job.name} (${job.id})`);
  }

  async removeScheduledJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    job.stop();
    this.schedulerRegistry.deleteCronJob(jobId);
    this.jobs.delete(jobId);

    this.logger.log(`Removed scheduled job: ${jobId}`);
  }

  async updateScheduledJob(jobId: string, updates: Partial<BackupJob>): Promise<void> {
    const existingJob = this.jobs.get(jobId);
    
    if (!existingJob) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // Stop existing job
    existingJob.stop();

    // Create new job with updates
    const updatedJob: BackupJob = {
      id: jobId,
      ...updates,
    } as BackupJob;

    // Remove old job
    this.schedulerRegistry.deleteCronJob(jobId);
    this.jobs.delete(jobId);

    // Add updated job
    await this.addScheduledJob(updatedJob);
  }

  async triggerJob(jobId: string): Promise<void> {
    const jobConfig = this.getJobConfigurations().find(j => j.id === jobId);
    
    if (!jobConfig) {
      throw new Error(`Job configuration not found: ${jobId}`);
    }

    await this.executeBackupJob(jobConfig);
  }

  getScheduledJobs(): Array<{
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
  }> {
    const jobs: any[] = [];

    for (const [jobId, cronJob] of this.jobs) {
      const jobConfig = this.getJobConfigurations().find(j => j.id === jobId);
      
      if (jobConfig) {
        jobs.push({
          id: jobConfig.id,
          name: jobConfig.name,
          schedule: jobConfig.schedule,
          enabled: cronJob.running,
          lastRun: jobConfig.lastRun,
          nextRun: cronJob.nextDate().toJSDate(),
        });
      }
    }

    return jobs;
  }

  async getJobHistory(
    jobId?: string,
    limit: number = 100,
  ): Promise<any[]> {
    // In production, fetch from database
    return [];
  }
}