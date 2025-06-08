export interface BackupConfiguration {
  // General settings
  enabled: boolean;
  basePath: string;
  tempPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Database connections
  databases: {
    mongodb: {
      uri: string;
      authSource?: string;
      replicaSet?: string;
    };
    postgresql: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl?: boolean;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
  };

  // Storage configuration
  storage: {
    default: 'local' | 's3' | 'gcs' | 'azure';
    local?: {
      path: string;
      maxSize?: number;
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
      prefix?: string;
    };
    gcs?: {
      projectId: string;
      bucket: string;
      keyFile: string;
      prefix?: string;
    };
    azure?: {
      accountName: string;
      accountKey: string;
      containerName: string;
      prefix?: string;
    };
  };

  // Scheduling
  scheduling: {
    enabled: boolean;
    timezone: string;
    jobs: {
      full: string; // Cron expression
      incremental: string;
      differential: string;
    };
  };

  // Security
  security: {
    encryption: {
      enabled: boolean;
      algorithm: string;
      keyPath: string;
    };
    compression: {
      enabled: boolean;
      algorithm: 'gzip' | 'bzip2' | 'lz4';
      level: number;
    };
  };

  // Retention
  retention: {
    enabled: boolean;
    policies: {
      full: {
        daily: number;
        weekly: number;
        monthly: number;
        yearly: number;
      };
      incremental: {
        count: number;
        maxAge: number;
      };
    };
  };

  // Notifications
  notifications: {
    enabled: boolean;
    channels: {
      email?: {
        smtp: {
          host: string;
          port: number;
          secure: boolean;
          auth: {
            user: string;
            pass: string;
          };
        };
        recipients: string[];
        subject: string;
      };
      slack?: {
        webhookUrl: string;
        channel: string;
        username: string;
      };
      webhook?: {
        url: string;
        method: 'GET' | 'POST';
        headers?: Record<string, string>;
      };
    };
  };

  // Performance
  performance: {
    parallel: boolean;
    maxConcurrency: number;
    chunkSize: number;
    timeout: number;
    retries: number;
    retryDelay: number;
  };
}

export const defaultBackupConfig: Partial<BackupConfiguration> = {
  enabled: true,
  basePath: '/var/backups/verpa',
  tempPath: '/tmp/verpa-backups',
  logLevel: 'info',

  storage: {
    default: 'local',
    local: {
      path: '/var/backups/verpa',
      maxSize: 100 * 1024 * 1024 * 1024, // 100GB
    },
  },

  scheduling: {
    enabled: true,
    timezone: 'UTC',
    jobs: {
      full: '0 2 * * 0', // Every Sunday at 2 AM
      incremental: '0 2 * * 1-6', // Monday to Saturday at 2 AM
      differential: '0 14 * * *', // Every day at 2 PM
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
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    },
  },

  performance: {
    parallel: true,
    maxConcurrency: 4,
    chunkSize: 64 * 1024 * 1024, // 64MB
    timeout: 3600000, // 1 hour
    retries: 3,
    retryDelay: 5000, // 5 seconds
  },
};