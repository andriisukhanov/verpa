#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { BackupRestoreModule } from '../backup-restore.module';
import { BackupService } from '../services/backup.service';
import { BackupType } from '../utils/backup.types';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('backup-all')
  .description('Backup all Verpa services')
  .option('-t, --type <type>', 'Backup type (full, incremental, differential)', 'full')
  .option('-c, --compress', 'Compress backups', true)
  .option('-e, --encrypt', 'Encrypt backups', true)
  .option('-o, --output <path>', 'Output directory', '/var/backups/verpa')
  .option('-s, --storage <provider>', 'Storage provider (local, s3, gcs)', 'local')
  .option('--dry-run', 'Perform dry run without actual backup', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log('🚀 Starting Verpa backup...');
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(
    BackupRestoreModule.forRoot({
      enabled: true,
      basePath: options.output,
      storage: {
        default: options.storage,
      },
    }),
  );

  const backupService = app.get(BackupService);

  try {
    // Define backup job
    const backupJob = {
      id: `manual-${Date.now()}`,
      name: 'Manual Full Backup',
      schedule: '', // Not scheduled
      services: [
        {
          name: 'mongodb-all',
          type: 'mongodb' as const,
          connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017',
          databases: ['user-service', 'aquarium-service', 'event-service', 'notification-service'],
        },
        {
          name: 'postgresql-all',
          type: 'postgresql' as const,
          connectionString: process.env.POSTGRES_URI || 'postgresql://verpa:password@localhost:5432/verpa',
          databases: ['analytics', 'subscriptions'],
        },
        {
          name: 'redis-all',
          type: 'redis' as const,
          connectionString: process.env.REDIS_URI || 'redis://localhost:6379',
        },
      ],
      options: {
        type: options.type.toUpperCase() as BackupType,
        compress: options.compress,
        encrypt: options.encrypt,
        encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
        storage: {
          provider: options.storage as any,
          path: options.output,
          bucket: process.env.BACKUP_S3_BUCKET,
          region: process.env.BACKUP_S3_REGION,
        },
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 5,
        },
      },
      enabled: true,
    };

    if (options.dryRun) {
      console.log('🔍 Dry run mode - no actual backup will be performed');
      console.log('Backup configuration:', JSON.stringify(backupJob, null, 2));
      process.exit(0);
    }

    // Perform backup
    console.log('📦 Starting backup process...');
    const results = await backupService.performBackup(backupJob);

    // Display results
    console.log('\n✅ Backup completed successfully!');
    console.log('\nBackup Summary:');
    console.log('================');
    
    let totalSize = 0;
    results.forEach(result => {
      console.log(`\n${result.services[0]}:`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Size: ${formatBytes(result.size)}`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Checksum: ${result.checksum}`);
      totalSize += result.size;
    });

    console.log('\n================');
    console.log(`Total backup size: ${formatBytes(totalSize)}`);
    console.log(`Backup location: ${options.output}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});