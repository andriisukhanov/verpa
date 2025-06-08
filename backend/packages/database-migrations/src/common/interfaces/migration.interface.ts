export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  description?: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

export interface MigrationMetadata {
  id: string;
  name: string;
  timestamp: number;
  appliedAt?: Date;
  executionTime?: number;
  checksum?: string;
}

export interface MigrationOptions {
  databaseUrl?: string;
  migrationsPath?: string;
  migrationsTableName?: string;
  logger?: MigrationLogger;
}

export interface MigrationLogger {
  info(message: string): void;
  error(message: string, error?: Error): void;
  warn(message: string): void;
  debug(message: string): void;
}

export interface MigrationRunner {
  up(target?: string): Promise<MigrationResult[]>;
  down(target?: string): Promise<MigrationResult[]>;
  latest(): Promise<MigrationResult[]>;
  rollback(): Promise<MigrationResult[]>;
  status(): Promise<MigrationStatus[]>;
  create(name: string): Promise<string>;
}

export interface MigrationResult {
  migration: string;
  status: 'success' | 'failed' | 'skipped';
  executionTime?: number;
  error?: Error;
}

export interface MigrationStatus {
  name: string;
  timestamp: number;
  applied: boolean;
  appliedAt?: Date;
  pending: boolean;
}