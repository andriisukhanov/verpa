import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './services/backup.service';
import { RestoreService } from './services/restore.service';
import { MongoDBBackupService } from './services/mongodb-backup.service';
import { PostgresBackupService } from './services/postgres-backup.service';
import { RedisBackupService } from './services/redis-backup.service';
import { StorageService } from './services/storage.service';
import { SchedulerService } from './services/scheduler.service';
import { BackupConfiguration } from './utils/backup.config';

@Global()
@Module({})
export class BackupRestoreModule {
  static forRoot(config?: Partial<BackupConfiguration>): DynamicModule {
    return {
      module: BackupRestoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
      ],
      providers: [
        {
          provide: 'BACKUP_CONFIG',
          useValue: config || {},
        },
        BackupService,
        RestoreService,
        MongoDBBackupService,
        PostgresBackupService,
        RedisBackupService,
        StorageService,
        SchedulerService,
      ],
      exports: [
        BackupService,
        RestoreService,
        SchedulerService,
      ],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<Partial<BackupConfiguration>> | Partial<BackupConfiguration>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: BackupRestoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'BACKUP_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        BackupService,
        RestoreService,
        MongoDBBackupService,
        PostgresBackupService,
        RedisBackupService,
        StorageService,
        SchedulerService,
      ],
      exports: [
        BackupService,
        RestoreService,
        SchedulerService,
      ],
    };
  }
}