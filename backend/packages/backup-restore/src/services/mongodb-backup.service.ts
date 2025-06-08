import { Injectable, Logger } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BackupMetadata, BackupType, ServiceBackupConfig } from '../utils/backup.types';
import { CompressionUtils } from '../utils/compression.utils';
import { EncryptionUtils } from '../utils/encryption.utils';

const execAsync = promisify(exec);

@Injectable()
export class MongoDBBackupService {
  private readonly logger = new Logger(MongoDBBackupService.name);
  private client: MongoClient;

  async connect(connectionString: string): Promise<void> {
    this.client = new MongoClient(connectionString);
    await this.client.connect();
    this.logger.log('Connected to MongoDB for backup operations');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.logger.log('Disconnected from MongoDB');
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
    const backupId = `mongodb-${Date.now()}`;
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
        services: ['mongodb'],
        version: '1.0',
        checksum,
        encryptionMethod: options.encrypt ? 'aes-256-gcm' : undefined,
        compressionMethod: options.compress ? 'gzip' : undefined,
      };
    } catch (error) {
      this.logger.error(`MongoDB backup failed: ${error.message}`, error.stack);
      
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
    const outputPath = path.join(outputDir, `mongodb-full-${Date.now()}.archive`);

    // Use mongodump for full backup
    const command = this.buildMongodumpCommand(config, outputPath, {
      archive: true,
      gzip: false, // We'll compress separately for consistency
    });

    this.logger.log(`Executing mongodump: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('writing')) {
      throw new Error(`Mongodump error: ${stderr}`);
    }

    this.logger.log(`MongoDB full backup completed: ${outputPath}`);
    return outputPath;
  }

  private async performIncrementalBackup(
    config: ServiceBackupConfig,
    outputDir: string,
  ): Promise<string> {
    // MongoDB doesn't have true incremental backups
    // We'll use oplog-based backup for this
    const outputPath = path.join(outputDir, `mongodb-incremental-${Date.now()}.bson`);

    // Get oplog entries since last backup
    const db = this.client.db('local');
    const oplog = db.collection('oplog.rs');

    const lastBackupTime = await this.getLastBackupTime();
    const query = lastBackupTime
      ? { ts: { $gt: lastBackupTime } }
      : {};

    const cursor = oplog.find(query);
    const docs = await cursor.toArray();

    // Write oplog entries to file
    await fs.promises.writeFile(outputPath, JSON.stringify(docs));

    this.logger.log(`MongoDB incremental backup completed: ${outputPath}`);
    return outputPath;
  }

  private async performDifferentialBackup(
    config: ServiceBackupConfig,
    outputDir: string,
  ): Promise<string> {
    // For differential, we'll backup only modified documents
    // This is a simplified implementation
    const outputPath = path.join(outputDir, `mongodb-differential-${Date.now()}.json`);

    const lastFullBackupTime = await this.getLastFullBackupTime();
    const modifiedDocs: any[] = [];

    if (config.databases) {
      for (const dbName of config.databases) {
        const db = this.client.db(dbName);
        const collections = config.collections || await db.listCollections().toArray();

        for (const collName of collections) {
          const collection = db.collection(
            typeof collName === 'string' ? collName : collName.name,
          );

          // Find documents modified since last full backup
          const query = lastFullBackupTime
            ? { _updatedAt: { $gt: lastFullBackupTime } }
            : {};

          const docs = await collection.find(query).toArray();
          modifiedDocs.push({
            database: dbName,
            collection: typeof collName === 'string' ? collName : collName.name,
            documents: docs,
          });
        }
      }
    }

    await fs.promises.writeFile(outputPath, JSON.stringify(modifiedDocs, null, 2));

    this.logger.log(`MongoDB differential backup completed: ${outputPath}`);
    return outputPath;
  }

  private buildMongodumpCommand(
    config: ServiceBackupConfig,
    outputPath: string,
    options: any,
  ): string {
    const parts = ['mongodump'];

    if (config.connectionString) {
      parts.push(`--uri="${config.connectionString}"`);
    }

    if (options.archive) {
      parts.push(`--archive="${outputPath}"`);
    } else {
      parts.push(`--out="${outputPath}"`);
    }

    if (options.gzip) {
      parts.push('--gzip');
    }

    if (config.databases && config.databases.length === 1) {
      parts.push(`--db="${config.databases[0]}"`);
    }

    if (config.collections && config.collections.length === 1) {
      parts.push(`--collection="${config.collections[0]}"`);
    }

    // Add additional options
    parts.push('--oplog'); // Include oplog for point-in-time restore
    parts.push('--forceTableScan'); // Ensure consistent backup

    return parts.join(' ');
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

      // Perform restore based on backup type
      if (processedPath.endsWith('.archive')) {
        await this.restoreFromArchive(processedPath, config, options);
      } else if (processedPath.endsWith('.bson')) {
        await this.restoreFromOplog(processedPath, config);
      } else if (processedPath.endsWith('.json')) {
        await this.restoreFromJson(processedPath, config, options);
      }

      // Clean up temporary files
      if (processedPath !== backupPath) {
        await fs.promises.unlink(processedPath);
      }

      this.logger.log('MongoDB restore completed successfully');
    } catch (error) {
      this.logger.error(`MongoDB restore failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async restoreFromArchive(
    archivePath: string,
    config: ServiceBackupConfig,
    options: any,
  ): Promise<void> {
    const command = this.buildMongorestoreCommand(config, archivePath, {
      archive: true,
      drop: options.dropExisting,
      nsFrom: options.targetDatabase ? '*' : undefined,
      nsTo: options.targetDatabase ? `${options.targetDatabase}.*` : undefined,
    });

    this.logger.log(`Executing mongorestore: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('done')) {
      throw new Error(`Mongorestore error: ${stderr}`);
    }
  }

  private async restoreFromOplog(
    oplogPath: string,
    config: ServiceBackupConfig,
  ): Promise<void> {
    const oplogData = await fs.promises.readFile(oplogPath, 'utf-8');
    const oplogEntries = JSON.parse(oplogData);

    // Replay oplog entries
    for (const entry of oplogEntries) {
      await this.replayOplogEntry(entry);
    }
  }

  private async restoreFromJson(
    jsonPath: string,
    config: ServiceBackupConfig,
    options: any,
  ): Promise<void> {
    const data = await fs.promises.readFile(jsonPath, 'utf-8');
    const backupData = JSON.parse(data);

    for (const collectionData of backupData) {
      const dbName = options.targetDatabase || collectionData.database;
      const db = this.client.db(dbName);
      const collection = db.collection(collectionData.collection);

      if (options.dropExisting) {
        await collection.drop().catch(() => {}); // Ignore if doesn't exist
      }

      if (collectionData.documents.length > 0) {
        await collection.insertMany(collectionData.documents);
      }
    }
  }

  private buildMongorestoreCommand(
    config: ServiceBackupConfig,
    inputPath: string,
    options: any,
  ): string {
    const parts = ['mongorestore'];

    if (config.connectionString) {
      parts.push(`--uri="${config.connectionString}"`);
    }

    if (options.archive) {
      parts.push(`--archive="${inputPath}"`);
    } else {
      parts.push(inputPath);
    }

    if (options.drop) {
      parts.push('--drop');
    }

    if (options.nsFrom && options.nsTo) {
      parts.push(`--nsFrom="${options.nsFrom}"`);
      parts.push(`--nsTo="${options.nsTo}"`);
    }

    parts.push('--oplogReplay'); // Replay oplog for consistency

    return parts.join(' ');
  }

  private async replayOplogEntry(entry: any): Promise<void> {
    // Simplified oplog replay - in production use proper oplog replay logic
    const namespace = entry.ns.split('.');
    const db = this.client.db(namespace[0]);
    const collection = db.collection(namespace.slice(1).join('.'));

    switch (entry.op) {
      case 'i': // Insert
        await collection.insertOne(entry.o);
        break;
      case 'u': // Update
        await collection.updateOne(entry.o2, entry.o);
        break;
      case 'd': // Delete
        await collection.deleteOne(entry.o);
        break;
    }
  }

  private async getLastBackupTime(): Promise<Date | null> {
    // In production, store this in a metadata collection or file
    return null;
  }

  private async getLastFullBackupTime(): Promise<Date | null> {
    // In production, store this in a metadata collection or file
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

      // Additional validation could include:
      // - Checking backup metadata
      // - Verifying backup structure
      // - Testing restore to temporary instance

      return true;
    } catch (error) {
      this.logger.error(`Backup validation failed: ${error.message}`);
      return false;
    }
  }
}