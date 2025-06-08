import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BackupMetadata, BackupType, ServiceBackupConfig } from '../utils/backup.types';
import { CompressionUtils } from '../utils/compression.utils';
import { EncryptionUtils } from '../utils/encryption.utils';

const execAsync = promisify(exec);

@Injectable()
export class PostgresBackupService {
  private readonly logger = new Logger(PostgresBackupService.name);
  private client: Client;

  async connect(config: any): Promise<void> {
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
    });
    await this.client.connect();
    this.logger.log('Connected to PostgreSQL for backup operations');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.logger.log('Disconnected from PostgreSQL');
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
    const backupId = `postgres-${Date.now()}`;
    const tempDir = path.join(outputDir, 'temp', backupId);

    try {
      // Create temp directory
      await fs.promises.mkdir(tempDir, { recursive: true });

      let backupPath: string;
      let size: number;

      if (options.type === BackupType.FULL) {
        backupPath = await this.performFullBackup(config, tempDir);
      } else if (options.type === BackupType.INCREMENTAL) {
        backupPath = await this.performIncrementalBackup(config, tempDir);
      } else {
        backupPath = await this.performDifferentialBackup(config, tempDir);
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
        type: options.type,
        status: 'completed' as any,
        size,
        duration: Date.now() - startTime,
        services: ['postgresql'],
        version: '1.0',
        checksum,
        encryptionMethod: options.encrypt ? 'aes-256-gcm' : undefined,
        compressionMethod: options.compress ? 'gzip' : undefined,
      };
    } catch (error) {
      this.logger.error(`PostgreSQL backup failed: ${error.message}`, error.stack);
      
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
    const outputPath = path.join(outputDir, `postgres-full-${Date.now()}.sql`);

    // Use pg_dump for full backup
    const command = this.buildPgDumpCommand(config, outputPath, {
      format: 'plain', // SQL format for better compatibility
      verbose: true,
      schema: config.tables ? undefined : 'public',
    });

    this.logger.log(`Executing pg_dump: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('dump complete')) {
      this.logger.warn(`pg_dump warnings: ${stderr}`);
    }

    this.logger.log(`PostgreSQL full backup completed: ${outputPath}`);
    return outputPath;
  }

  private async performIncrementalBackup(
    config: ServiceBackupConfig,
    outputDir: string,
  ): Promise<string> {
    // PostgreSQL incremental backup using WAL archiving
    const outputPath = path.join(outputDir, `postgres-incremental-${Date.now()}.wal`);

    // Check if WAL archiving is enabled
    const walResult = await this.client.query('SHOW wal_level');
    if (walResult.rows[0].wal_level !== 'replica' && walResult.rows[0].wal_level !== 'logical') {
      throw new Error('WAL archiving not enabled. Set wal_level to replica or logical.');
    }

    // Get current WAL location
    const lsnResult = await this.client.query('SELECT pg_current_wal_lsn()');
    const currentLSN = lsnResult.rows[0].pg_current_wal_lsn;

    // Get last backup LSN from metadata
    const lastLSN = await this.getLastBackupLSN();

    // Archive WAL files between last backup and current
    if (lastLSN) {
      const command = `pg_waldump -s ${lastLSN} -e ${currentLSN} > ${outputPath}`;
      await execAsync(command);
    } else {
      // If no previous backup, create a base backup
      const command = `pg_basebackup -D ${outputPath} -Ft -z -P`;
      await execAsync(command);
    }

    // Store current LSN for next incremental
    await this.saveBackupLSN(currentLSN);

    this.logger.log(`PostgreSQL incremental backup completed: ${outputPath}`);
    return outputPath;
  }

  private async performDifferentialBackup(
    config: ServiceBackupConfig,
    outputDir: string,
  ): Promise<string> {
    // PostgreSQL differential backup - backup changes since last full backup
    const outputPath = path.join(outputDir, `postgres-differential-${Date.now()}.sql`);

    const lastFullBackupTime = await this.getLastFullBackupTime();
    
    if (!lastFullBackupTime) {
      // No previous full backup, perform full backup instead
      return this.performFullBackup(config, outputDir);
    }

    // Export only tables that have changed
    const changedTables = await this.getChangedTables(lastFullBackupTime);
    
    if (changedTables.length === 0) {
      // No changes, create empty backup file
      await fs.promises.writeFile(outputPath, '-- No changes since last full backup\n');
      return outputPath;
    }

    // Dump only changed tables
    const command = this.buildPgDumpCommand(config, outputPath, {
      format: 'plain',
      tables: changedTables,
    });

    await execAsync(command);

    this.logger.log(`PostgreSQL differential backup completed: ${outputPath}`);
    return outputPath;
  }

  private buildPgDumpCommand(
    config: ServiceBackupConfig,
    outputPath: string,
    options: any,
  ): string {
    const parts = ['pg_dump'];

    // Connection parameters
    if (config.connectionString) {
      parts.push(`"${config.connectionString}"`);
    } else {
      // Build connection string from config
      const connStr = this.buildConnectionString(config);
      parts.push(`"${connStr}"`);
    }

    // Output file
    parts.push(`-f "${outputPath}"`);

    // Format
    if (options.format) {
      parts.push(`--format=${options.format}`);
    }

    // Verbose
    if (options.verbose) {
      parts.push('--verbose');
    }

    // Schema
    if (options.schema) {
      parts.push(`--schema=${options.schema}`);
    }

    // Specific tables
    if (options.tables && options.tables.length > 0) {
      options.tables.forEach((table: string) => {
        parts.push(`--table=${table}`);
      });
    }

    // Additional options
    parts.push('--no-owner'); // Don't output ownership commands
    parts.push('--no-acl'); // Don't output access privileges
    parts.push('--if-exists'); // Add IF EXISTS to DROP commands
    parts.push('--clean'); // Include DROP commands

    return parts.join(' ');
  }

  private buildConnectionString(config: any): string {
    const params = [];
    
    if (config.host) params.push(`host=${config.host}`);
    if (config.port) params.push(`port=${config.port}`);
    if (config.database) params.push(`dbname=${config.database}`);
    if (config.username) params.push(`user=${config.username}`);
    if (config.password) params.push(`password=${config.password}`);
    if (config.ssl) params.push('sslmode=require');

    return `postgresql://${params.join('&')}`;
  }

  async restore(
    backupPath: string,
    config: ServiceBackupConfig,
    options: {
      decrypt?: boolean;
      decryptionKey?: string;
      decompress?: boolean;
      targetDatabase?: string;
      dropExisting?: boolean;
      createDatabase?: boolean;
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

      // Create database if needed
      if (options.createDatabase && options.targetDatabase) {
        await this.createDatabaseIfNotExists(options.targetDatabase);
      }

      // Perform restore
      if (processedPath.endsWith('.sql')) {
        await this.restoreFromSQL(processedPath, config, options);
      } else if (processedPath.endsWith('.wal')) {
        await this.restoreFromWAL(processedPath, config);
      }

      // Clean up temporary files
      if (processedPath !== backupPath) {
        await fs.promises.unlink(processedPath);
      }

      this.logger.log('PostgreSQL restore completed successfully');
    } catch (error) {
      this.logger.error(`PostgreSQL restore failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async restoreFromSQL(
    sqlPath: string,
    config: ServiceBackupConfig,
    options: any,
  ): Promise<void> {
    const command = this.buildPsqlCommand(config, sqlPath, {
      database: options.targetDatabase || config.databases?.[0],
    });

    this.logger.log(`Executing psql: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      this.logger.warn(`psql warnings: ${stderr}`);
    }
  }

  private async restoreFromWAL(
    walPath: string,
    config: ServiceBackupConfig,
  ): Promise<void> {
    // WAL restore requires recovery mode
    // This is a simplified example - actual implementation would be more complex
    throw new Error('WAL restore not implemented in this example');
  }

  private buildPsqlCommand(
    config: ServiceBackupConfig,
    inputPath: string,
    options: any,
  ): string {
    const parts = ['psql'];

    // Connection parameters
    if (config.connectionString) {
      parts.push(`"${config.connectionString}"`);
    } else {
      const connStr = this.buildConnectionString({
        ...config,
        database: options.database,
      });
      parts.push(`"${connStr}"`);
    }

    // Input file
    parts.push(`-f "${inputPath}"`);

    // Additional options
    parts.push('--set ON_ERROR_STOP=1'); // Stop on first error
    parts.push('--echo-errors'); // Echo failed SQL commands

    return parts.join(' ');
  }

  private async createDatabaseIfNotExists(dbName: string): Promise<void> {
    try {
      await this.client.query(`CREATE DATABASE "${dbName}"`);
      this.logger.log(`Created database: ${dbName}`);
    } catch (error) {
      if (error.code === '42P04') {
        // Database already exists
        this.logger.log(`Database already exists: ${dbName}`);
      } else {
        throw error;
      }
    }
  }

  private async getChangedTables(since: Date): Promise<string[]> {
    // Query system catalogs to find tables modified since date
    const query = `
      SELECT schemaname || '.' || tablename as table_name
      FROM pg_stat_user_tables
      WHERE n_tup_ins > 0 OR n_tup_upd > 0 OR n_tup_del > 0
      AND (last_vacuum > $1 OR last_autovacuum > $1 OR last_analyze > $1 OR last_autoanalyze > $1)
    `;

    const result = await this.client.query(query, [since]);
    return result.rows.map(row => row.table_name);
  }

  private async getLastBackupLSN(): Promise<string | null> {
    // In production, store this in a metadata table
    try {
      const result = await this.client.query(
        'SELECT lsn FROM backup_metadata ORDER BY created_at DESC LIMIT 1'
      );
      return result.rows[0]?.lsn || null;
    } catch (error) {
      return null;
    }
  }

  private async saveBackupLSN(lsn: string): Promise<void> {
    // In production, store this in a metadata table
    try {
      await this.client.query(
        'INSERT INTO backup_metadata (lsn, created_at) VALUES ($1, NOW())',
        [lsn]
      );
    } catch (error) {
      this.logger.warn(`Failed to save backup LSN: ${error.message}`);
    }
  }

  private async getLastFullBackupTime(): Promise<Date | null> {
    // In production, store this in a metadata table
    return null;
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

      // For SQL backups, check syntax
      if (backupPath.endsWith('.sql')) {
        const command = `psql --dry-run -f "${backupPath}"`;
        try {
          await execAsync(command);
        } catch (error) {
          this.logger.error('SQL syntax validation failed');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Backup validation failed: ${error.message}`);
      return false;
    }
  }
}