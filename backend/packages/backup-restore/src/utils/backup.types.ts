export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  GCS = 'gcs',
  AZURE = 'azure',
}

export interface BackupOptions {
  type: BackupType;
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
  storage: StorageConfig;
  retention?: RetentionPolicy;
  notifications?: NotificationConfig;
}

export interface StorageConfig {
  provider: StorageProvider;
  path: string;
  bucket?: string;
  region?: string;
  credentials?: any;
}

export interface RetentionPolicy {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface NotificationConfig {
  email?: string[];
  slack?: string;
  webhook?: string;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: BackupType;
  status: BackupStatus;
  size: number;
  duration: number;
  services: string[];
  version: string;
  checksum?: string;
  encryptionMethod?: string;
  compressionMethod?: string;
  error?: string;
}

export interface BackupJob {
  id: string;
  name: string;
  schedule: string;
  services: ServiceBackupConfig[];
  options: BackupOptions;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

export interface ServiceBackupConfig {
  name: string;
  type: 'mongodb' | 'postgresql' | 'redis' | 'files';
  connectionString?: string;
  databases?: string[];
  collections?: string[];
  tables?: string[];
  paths?: string[];
  excludePatterns?: string[];
}

export interface RestoreOptions {
  targetEnvironment?: string;
  targetTimestamp?: Date;
  services?: string[];
  skipValidation?: boolean;
  dryRun?: boolean;
  parallel?: boolean;
  overwrite?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredServices: string[];
  failedServices: string[];
  duration: number;
  errors?: Error[];
  warnings?: string[];
}

export interface BackupValidation {
  isValid: boolean;
  checksum: string;
  size: number;
  completeness: boolean;
  errors?: string[];
}