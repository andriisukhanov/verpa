# Verpa Backup & Restore

A comprehensive backup and restore solution for all Verpa microservices, supporting MongoDB, PostgreSQL, Redis, and file-based backups.

## Features

- **Multi-Database Support**: MongoDB, PostgreSQL, Redis, and file backups
- **Backup Types**: Full, incremental, and differential backups
- **Encryption**: AES-256-GCM encryption for sensitive data
- **Compression**: Gzip compression to reduce storage usage
- **Storage Options**: Local, AWS S3, Google Cloud Storage, Azure Blob
- **Scheduling**: Automated backups with cron-based scheduling
- **Retention Policies**: Automatic cleanup of old backups
- **Validation**: Checksum validation and integrity checks
- **Point-in-Time Recovery**: Restore to specific timestamps
- **Notifications**: Email, Slack, and webhook notifications

## Installation

```bash
npm install @verpa/backup-restore
```

## Quick Start

### 1. Configure the module

```typescript
import { BackupRestoreModule } from '@verpa/backup-restore';

@Module({
  imports: [
    BackupRestoreModule.forRoot({
      enabled: true,
      basePath: '/var/backups/verpa',
      storage: {
        default: 'local',
        local: {
          path: '/var/backups/verpa',
        },
      },
      scheduling: {
        enabled: true,
        timezone: 'UTC',
        jobs: {
          full: '0 2 * * 0',      // Sunday at 2 AM
          incremental: '0 2 * * 1-6', // Monday-Saturday at 2 AM
        },
      },
      security: {
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          keyPath: '/etc/verpa/backup-key',
        },
        compression: {
          enabled: true,
          algorithm: 'gzip',
          level: 6,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Manual backup

```typescript
import { BackupService } from '@verpa/backup-restore';

@Injectable()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  async createBackup() {
    const job = {
      id: 'manual-backup',
      name: 'Manual Backup',
      schedule: '',
      services: [
        {
          name: 'mongodb',
          type: 'mongodb',
          connectionString: 'mongodb://localhost:27017',
          databases: ['myapp'],
        },
      ],
      options: {
        type: BackupType.FULL,
        compress: true,
        encrypt: true,
        storage: {
          provider: StorageProvider.LOCAL,
          path: '/backups',
        },
      },
      enabled: true,
    };

    const results = await this.backupService.performBackup(job);
    return results;
  }
}
```

### 3. Restore from backup

```typescript
import { RestoreService } from '@verpa/backup-restore';

@Injectable()
export class RestoreController {
  constructor(private readonly restoreService: RestoreService) {}

  async restoreBackup(backupPath: string) {
    const result = await this.restoreService.performRestore(backupPath, {
      services: ['mongodb', 'redis'],
      skipValidation: false,
      overwrite: true,
    });
    return result;
  }
}
```

## CLI Commands

### Backup all services

```bash
npm run backup:all -- --type full --compress --encrypt
```

Options:
- `-t, --type <type>`: Backup type (full, incremental, differential)
- `-c, --compress`: Enable compression
- `-e, --encrypt`: Enable encryption
- `-o, --output <path>`: Output directory
- `-s, --storage <provider>`: Storage provider (local, s3, gcs)
- `--dry-run`: Perform dry run

### Restore from backup

```bash
npm run restore:all -- --backup /path/to/backup --services mongodb redis
```

Options:
- `-b, --backup <path>`: Backup directory path (required)
- `-s, --services <services...>`: Services to restore
- `-t, --target <environment>`: Target environment
- `--skip-validation`: Skip backup validation
- `--dry-run`: Perform dry run
- `--overwrite`: Overwrite existing data
- `--parallel`: Restore services in parallel

### Service-specific backups

```bash
# MongoDB backup
npm run backup:mongodb -- --database myapp --compress

# PostgreSQL backup
npm run backup:postgres -- --database analytics --type full

# Redis backup
npm run backup:redis -- --compress
```

## Configuration

### Environment Variables

```env
# Database connections
MONGODB_URI=mongodb://localhost:27017
POSTGRES_URI=postgresql://user:pass@localhost:5432/db
REDIS_URI=redis://localhost:6379

# Backup settings
BACKUP_BASE_PATH=/var/backups/verpa
BACKUP_ENCRYPTION_KEY=your-encryption-key

# S3 storage (optional)
BACKUP_S3_BUCKET=verpa-backups
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Notifications (optional)
BACKUP_EMAIL_RECIPIENTS=admin@verpa.com
BACKUP_SLACK_WEBHOOK=https://hooks.slack.com/...
```

### Backup Configuration

```typescript
const backupConfig: BackupConfiguration = {
  // General settings
  enabled: true,
  basePath: '/var/backups/verpa',
  tempPath: '/tmp/verpa-backups',
  logLevel: 'info',

  // Database connections
  databases: {
    mongodb: {
      uri: 'mongodb://localhost:27017',
      authSource: 'admin',
    },
    postgresql: {
      host: 'localhost',
      port: 5432,
      database: 'verpa',
      username: 'verpa',
      password: 'password',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'password',
    },
  },

  // Storage configuration
  storage: {
    default: 's3',
    s3: {
      bucket: 'verpa-backups',
      region: 'us-east-1',
      prefix: 'backups/',
    },
  },

  // Scheduling
  scheduling: {
    enabled: true,
    timezone: 'America/New_York',
    jobs: {
      full: '0 2 * * 0',        // Weekly
      incremental: '0 2 * * *', // Daily
      differential: '0 */6 * * *', // Every 6 hours
    },
  },

  // Security
  security: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyPath: '/etc/verpa/backup.key',
    },
    compression: {
      enabled: true,
      algorithm: 'gzip',
      level: 6,
    },
  },

  // Retention
  retention: {
    enabled: true,
    policies: {
      full: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 5,
      },
      incremental: {
        count: 30,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    },
  },
};
```

## Backup Types

### Full Backup
- Complete copy of all data
- Can be restored independently
- Larger size, longer duration
- Recommended: Weekly

### Incremental Backup
- Only changes since last backup
- Requires full backup for restore
- Smaller size, faster
- Recommended: Daily

### Differential Backup
- Changes since last full backup
- Faster restore than incremental
- Medium size
- Recommended: Every few hours for critical data

## Storage Providers

### Local Storage
```typescript
storage: {
  provider: StorageProvider.LOCAL,
  path: '/var/backups/verpa',
}
```

### AWS S3
```typescript
storage: {
  provider: StorageProvider.S3,
  bucket: 'verpa-backups',
  region: 'us-east-1',
  prefix: 'prod/',
  credentials: {
    accessKeyId: 'key',
    secretAccessKey: 'secret',
  },
}
```

### Google Cloud Storage
```typescript
storage: {
  provider: StorageProvider.GCS,
  bucket: 'verpa-backups',
  credentials: {
    projectId: 'my-project',
    keyFile: '/path/to/key.json',
  },
}
```

## Scheduling

### Cron Expression Examples
- `0 2 * * *` - Daily at 2 AM
- `0 2 * * 0` - Weekly on Sunday at 2 AM
- `0 2 1 * *` - Monthly on the 1st at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 2 * * 1-5` - Weekdays at 2 AM

### Scheduled Job Management

```typescript
// Get all scheduled jobs
const jobs = schedulerService.getScheduledJobs();

// Add new scheduled job
await schedulerService.addScheduledJob({
  id: 'custom-backup',
  name: 'Custom Backup',
  schedule: '0 3 * * *',
  services: [...],
  options: {...},
  enabled: true,
});

// Trigger job manually
await schedulerService.triggerJob('custom-backup');

// Update job schedule
await schedulerService.updateScheduledJob('custom-backup', {
  schedule: '0 4 * * *',
});

// Remove job
await schedulerService.removeScheduledJob('custom-backup');
```

## Retention Policies

### Policy Configuration
```typescript
retention: {
  daily: 7,    // Keep 7 daily backups
  weekly: 4,   // Keep 4 weekly backups
  monthly: 12, // Keep 12 monthly backups
  yearly: 5,   // Keep 5 yearly backups
}
```

### How It Works
1. Daily backups: Kept for specified number of days
2. Weekly backups: Sunday backups kept for weeks
3. Monthly backups: 1st of month kept for months
4. Yearly backups: Jan 1st kept for years

## Security

### Encryption
- Algorithm: AES-256-GCM
- Key derivation: PBKDF2 with 100,000 iterations
- Unique IV for each backup
- Encrypted files have `.enc` extension

### Key Management
```bash
# Generate encryption key
openssl rand -base64 32 > /etc/verpa/backup.key
chmod 600 /etc/verpa/backup.key
```

### Compression
- Default: Gzip level 6
- Reduces backup size by 60-80%
- Applied before encryption

## Monitoring

### Health Checks
```typescript
// Check backup system health
const health = await backupService.getHealth();
console.log(health);
// {
//   status: 'healthy',
//   lastBackup: '2024-01-15T02:00:00Z',
//   nextBackup: '2024-01-16T02:00:00Z',
//   storage: { used: '10GB', available: '90GB' }
// }
```

### Metrics
- Backup success/failure rates
- Backup duration trends
- Storage usage over time
- Restore success rates

### Alerts
Configure alerts for:
- Backup failures
- Storage space low
- Backup duration exceeds threshold
- Retention policy violations

## Disaster Recovery

### Recovery Time Objective (RTO)
- Local restore: < 30 minutes
- Remote restore: < 2 hours
- Point-in-time: < 4 hours

### Recovery Point Objective (RPO)
- Critical data: 1 hour (differential backups)
- Standard data: 24 hours (daily incremental)
- Archive data: 7 days (weekly full)

### DR Procedures

1. **Identify Recovery Point**
   ```bash
   npm run backup:list -- --service mongodb --date 2024-01-15
   ```

2. **Validate Backup**
   ```bash
   npm run backup:validate -- --backup /path/to/backup
   ```

3. **Perform Restore**
   ```bash
   npm run restore:all -- --backup /path/to/backup --target staging
   ```

4. **Verify Restore**
   - Check service connectivity
   - Validate data integrity
   - Run smoke tests

## Best Practices

1. **Test Restores Regularly**
   - Monthly restore drills
   - Validate backup integrity
   - Document restore procedures

2. **Monitor Backup Jobs**
   - Set up alerts for failures
   - Track backup duration trends
   - Monitor storage usage

3. **Secure Backups**
   - Always encrypt sensitive data
   - Restrict access to backup storage
   - Rotate encryption keys annually

4. **Optimize Performance**
   - Use compression for large datasets
   - Schedule during off-peak hours
   - Implement parallel backups

5. **Document Everything**
   - Backup schedules
   - Restore procedures
   - Contact information
   - Escalation paths

## Troubleshooting

### Common Issues

1. **Backup Fails with "Connection refused"**
   - Check database connectivity
   - Verify connection strings
   - Check firewall rules

2. **"Insufficient space" errors**
   - Check available disk space
   - Review retention policies
   - Consider cloud storage

3. **Slow backup performance**
   - Enable compression
   - Use incremental backups
   - Check network bandwidth

4. **Restore fails with checksum mismatch**
   - Verify backup integrity
   - Check for corruption
   - Try alternative backup

### Debug Mode

Enable debug logging:
```typescript
BackupRestoreModule.forRoot({
  logLevel: 'debug',
  // ... other config
})
```

## Migration from Other Solutions

### From pg_dump/mongodump

1. Export existing backups
2. Convert to Verpa format
3. Import into Verpa backup system
4. Verify data integrity

### From Commercial Solutions

We provide migration scripts for:
- Veeam
- Commvault
- NetBackup
- Acronis

Contact support for migration assistance.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT