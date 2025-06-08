import * as fs from 'fs';
import * as path from 'path';
import { BackupValidation } from './backup.types';
import { EncryptionUtils } from './encryption.utils';

export class ValidationUtils {
  static async validateBackupFile(
    filePath: string,
    expectedChecksum?: string,
    expectedSize?: number,
  ): Promise<BackupValidation> {
    const errors: string[] = [];

    try {
      // Check file exists
      await fs.promises.access(filePath);
    } catch (error) {
      errors.push(`File not found: ${filePath}`);
      return {
        isValid: false,
        checksum: '',
        size: 0,
        completeness: false,
        errors,
      };
    }

    // Get file stats
    const stats = await fs.promises.stat(filePath);
    const size = stats.size;

    // Validate size
    if (expectedSize && size !== expectedSize) {
      errors.push(`Size mismatch: expected ${expectedSize}, got ${size}`);
    }

    // Calculate checksum
    const checksum = await EncryptionUtils.calculateChecksum(filePath);

    // Validate checksum
    if (expectedChecksum && checksum !== expectedChecksum) {
      errors.push(`Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
    }

    // Check completeness based on file type
    const completeness = await this.checkFileCompleteness(filePath);
    if (!completeness) {
      errors.push('File appears to be incomplete or corrupted');
    }

    return {
      isValid: errors.length === 0,
      checksum,
      size,
      completeness,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  static async checkFileCompleteness(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.gz':
          return await this.validateGzipFile(filePath);
        case '.json':
          return await this.validateJsonFile(filePath);
        case '.sql':
          return await this.validateSqlFile(filePath);
        case '.rdb':
          return await this.validateRdbFile(filePath);
        case '.tar':
          return await this.validateTarFile(filePath);
        default:
          // For unknown types, just check if file is not empty
          const stats = await fs.promises.stat(filePath);
          return stats.size > 0;
      }
    } catch (error) {
      return false;
    }
  }

  private static async validateGzipFile(filePath: string): Promise<boolean> {
    // Check gzip header and footer
    const fd = await fs.promises.open(filePath, 'r');
    
    try {
      // Check header (should start with 1f 8b)
      const header = Buffer.alloc(2);
      await fd.read(header, 0, 2, 0);
      if (header[0] !== 0x1f || header[1] !== 0x8b) {
        return false;
      }

      // Check footer exists (last 8 bytes contain CRC32 and size)
      const stats = await fd.stat();
      if (stats.size < 18) { // Minimum gzip file size
        return false;
      }

      return true;
    } finally {
      await fd.close();
    }
  }

  private static async validateJsonFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      JSON.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  private static async validateSqlFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Basic SQL validation - check for common patterns
      const hasSqlContent = 
        content.includes('CREATE') ||
        content.includes('INSERT') ||
        content.includes('UPDATE') ||
        content.includes('DELETE') ||
        content.includes('--'); // SQL comment

      // Check if file ends properly (not truncated)
      const lastLine = content.trim().split('\n').pop() || '';
      const endsProper = 
        lastLine.endsWith(';') || 
        lastLine.startsWith('--') ||
        lastLine === '';

      return hasSqlContent && endsProper;
    } catch (error) {
      return false;
    }
  }

  private static async validateRdbFile(filePath: string): Promise<boolean> {
    // Redis RDB file validation
    const fd = await fs.promises.open(filePath, 'r');
    
    try {
      // Check magic string "REDIS"
      const magic = Buffer.alloc(5);
      await fd.read(magic, 0, 5, 0);
      if (magic.toString() !== 'REDIS') {
        return false;
      }

      // Check version (4 bytes)
      const version = Buffer.alloc(4);
      await fd.read(version, 0, 4, 5);
      const versionNum = parseInt(version.toString());
      if (versionNum < 1 || versionNum > 12) { // Valid RDB versions
        return false;
      }

      return true;
    } finally {
      await fd.close();
    }
  }

  private static async validateTarFile(filePath: string): Promise<boolean> {
    // Basic TAR validation - check header
    const fd = await fs.promises.open(filePath, 'r');
    
    try {
      const stats = await fd.stat();
      if (stats.size < 512) { // Minimum TAR file size
        return false;
      }

      // TAR files have 512-byte blocks
      return stats.size % 512 === 0;
    } finally {
      await fd.close();
    }
  }

  static async validateBackupManifest(manifestPath: string): Promise<{
    isValid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    try {
      const content = await fs.promises.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      // Validate required fields
      if (!manifest.id) errors.push('Missing backup ID');
      if (!manifest.timestamp) errors.push('Missing timestamp');
      if (!manifest.services || !Array.isArray(manifest.services)) {
        errors.push('Missing or invalid services array');
      }

      // Validate service entries
      if (manifest.services) {
        manifest.services.forEach((service: any, index: number) => {
          if (!service.id) errors.push(`Service ${index}: missing ID`);
          if (!service.timestamp) errors.push(`Service ${index}: missing timestamp`);
          if (!service.type) errors.push(`Service ${index}: missing type`);
          if (!service.status) errors.push(`Service ${index}: missing status`);
          if (typeof service.size !== 'number') {
            errors.push(`Service ${index}: invalid size`);
          }
        });
      }

      // Validate timestamps
      if (manifest.timestamp && isNaN(Date.parse(manifest.timestamp))) {
        errors.push('Invalid timestamp format');
      }

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to parse manifest: ${error.message}`],
      };
    }
  }

  static async validateBackupIntegrity(backupPath: string): Promise<{
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    const manifestValidation = await this.validateBackupManifest(manifestPath);
    
    if (!manifestValidation.isValid) {
      errors.push(...(manifestValidation.errors || []));
      return { isValid: false, errors };
    }

    // Read manifest
    const manifest = JSON.parse(
      await fs.promises.readFile(manifestPath, 'utf-8')
    );

    // Validate each service backup
    for (const service of manifest.services) {
      const serviceName = service.services[0];
      const servicePath = path.join(backupPath, serviceName);

      // Check service directory exists
      try {
        await fs.promises.access(servicePath);
      } catch (error) {
        errors.push(`Service directory missing: ${serviceName}`);
        continue;
      }

      // Find backup files
      const files = await fs.promises.readdir(servicePath);
      const backupFiles = files.filter(f => 
        !f.endsWith('.meta') && !f.endsWith('.log')
      );

      if (backupFiles.length === 0) {
        errors.push(`No backup files found for service: ${serviceName}`);
        continue;
      }

      // Validate each backup file
      for (const file of backupFiles) {
        const filePath = path.join(servicePath, file);
        const validation = await this.validateBackupFile(
          filePath,
          service.checksum,
          service.size,
        );

        if (!validation.isValid) {
          errors.push(
            `${serviceName}/${file}: ${validation.errors?.join(', ')}`
          );
        }
      }
    }

    // Check for orphaned files
    const topLevelFiles = await fs.promises.readdir(backupPath);
    const expectedDirs = new Set([
      'manifest.json',
      ...manifest.services.map((s: any) => s.services[0]),
    ]);

    for (const file of topLevelFiles) {
      if (!expectedDirs.has(file)) {
        warnings.push(`Unexpected file/directory: ${file}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}