import { DataSource, QueryRunner } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import {
  MigrationRunner,
  MigrationResult,
  MigrationStatus,
  MigrationOptions,
  MigrationLogger,
} from '../common/interfaces/migration.interface';
import { ConsoleLogger } from '../common/logger';
import { PostgresMigration } from './postgres-migration';

interface MigrationRecord {
  id: string;
  name: string;
  timestamp: number;
  applied_at: Date;
  execution_time: number;
  checksum: string;
}

export class PostgresMigrationRunner implements MigrationRunner {
  private dataSource: DataSource;
  private options: Required<MigrationOptions>;
  private logger: MigrationLogger;

  constructor(options: MigrationOptions) {
    this.options = {
      databaseUrl: options.databaseUrl || process.env.DATABASE_URL || 'postgres://localhost:5432/verpa',
      migrationsPath: options.migrationsPath || './migrations/postgres',
      migrationsTableName: options.migrationsTableName || '_migrations',
      logger: options.logger || new ConsoleLogger(),
    };
    this.logger = this.options.logger;

    const connectionOptions = this.parseConnectionUrl(this.options.databaseUrl);
    this.dataSource = new DataSource({
      type: 'postgres',
      host: connectionOptions.host,
      port: connectionOptions.port,
      username: connectionOptions.username,
      password: connectionOptions.password,
      database: connectionOptions.database,
      logging: false,
    });
  }

  async connect(): Promise<void> {
    await this.dataSource.initialize();
    await this.ensureMigrationsTable();
  }

  async disconnect(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async up(target?: string): Promise<MigrationResult[]> {
    await this.connect();
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const migrations = await this.loadMigrations();
      const applied = await this.getAppliedMigrations(queryRunner);
      const results: MigrationResult[] = [];

      for (const migration of migrations) {
        if (applied.has(migration.id)) {
          this.logger.debug(`Skipping already applied migration: ${migration.id}`);
          results.push({
            migration: migration.id,
            status: 'skipped',
          });
          continue;
        }

        if (target && migration.id > target) {
          this.logger.debug(`Stopping at target migration: ${target}`);
          break;
        }

        results.push(await this.runMigration(migration, 'up', queryRunner));
      }

      return results;
    } finally {
      await queryRunner.release();
      await this.disconnect();
    }
  }

  async down(target?: string): Promise<MigrationResult[]> {
    await this.connect();
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const migrations = await this.loadMigrations();
      const applied = Array.from(await this.getAppliedMigrations(queryRunner)).sort().reverse();
      const results: MigrationResult[] = [];

      for (const migrationId of applied) {
        if (target && migrationId < target) {
          this.logger.debug(`Stopping at target migration: ${target}`);
          break;
        }

        const migration = migrations.find(m => m.id === migrationId);
        if (!migration) {
          this.logger.warn(`Migration ${migrationId} not found in filesystem`);
          continue;
        }

        results.push(await this.runMigration(migration, 'down', queryRunner));
      }

      return results;
    } finally {
      await queryRunner.release();
      await this.disconnect();
    }
  }

  async latest(): Promise<MigrationResult[]> {
    return this.up();
  }

  async rollback(): Promise<MigrationResult[]> {
    await this.connect();
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const lastApplied = await queryRunner.query(
        `SELECT id FROM ${this.options.migrationsTableName} ORDER BY timestamp DESC LIMIT 1`,
      );

      if (!lastApplied || lastApplied.length === 0) {
        this.logger.info('No migrations to rollback');
        return [];
      }

      return this.down(lastApplied[0].id);
    } finally {
      await queryRunner.release();
      await this.disconnect();
    }
  }

  async status(): Promise<MigrationStatus[]> {
    await this.connect();
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const migrations = await this.loadMigrations();
      const applied = await this.getAppliedMigrations(queryRunner);
      const appliedRecords = await this.getAppliedMigrationRecords(queryRunner);

      return migrations.map(migration => {
        const isApplied = applied.has(migration.id);
        const record = appliedRecords.get(migration.id);

        return {
          name: migration.name,
          timestamp: migration.timestamp,
          applied: isApplied,
          appliedAt: record?.applied_at,
          pending: !isApplied,
        };
      });
    } finally {
      await queryRunner.release();
      await this.disconnect();
    }
  }

  async create(name: string): Promise<string> {
    const timestamp = Date.now();
    const className = this.toPascalCase(name);
    const fileName = `${timestamp}_${name}.ts`;
    const filePath = path.join(this.options.migrationsPath, fileName);

    const template = `import { PostgresMigration } from '@verpa/database-migrations';

export class ${className}${timestamp} extends PostgresMigration {
  constructor() {
    super('${name}', ${timestamp}, 'Description of ${name} migration');
  }

  async up(): Promise<void> {
    // TODO: Implement migration up logic
    // Example:
    // await this.createTable('example', \`
    //   id SERIAL PRIMARY KEY,
    //   name VARCHAR(255) NOT NULL,
    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    // \`);
  }

  async down(): Promise<void> {
    // TODO: Implement migration down logic
    // Example:
    // await this.dropTable('example');
  }
}
`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, template);
    this.logger.info(`Created migration: ${filePath}`);
    return filePath;
  }

  private async loadMigrations(): Promise<PostgresMigration[]> {
    const pattern = path.join(this.options.migrationsPath, '*.ts');
    const files = await glob(pattern);
    const migrations: PostgresMigration[] = [];

    for (const file of files.sort()) {
      try {
        const module = await import(file);
        const MigrationClass = Object.values(module).find(
          (exported: any) => 
            typeof exported === 'function' && 
            exported.prototype instanceof PostgresMigration,
        ) as any;

        if (MigrationClass) {
          const migration = new MigrationClass();
          migrations.push(migration);
        }
      } catch (error) {
        this.logger.error(`Failed to load migration ${file}:`, error as Error);
      }
    }

    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async runMigration(
    migration: PostgresMigration,
    direction: 'up' | 'down',
    queryRunner: QueryRunner,
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    this.logger.info(`Running migration ${direction}: ${migration.id}`);

    await queryRunner.startTransaction();
    migration.setQueryRunner(queryRunner);

    try {
      await migration[direction]();
      const executionTime = Date.now() - startTime;

      if (direction === 'up') {
        await queryRunner.query(
          `INSERT INTO ${this.options.migrationsTableName} 
           (id, name, timestamp, applied_at, execution_time, checksum) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            migration.id,
            migration.name,
            migration.timestamp,
            new Date(),
            executionTime,
            migration.getChecksum(),
          ],
        );
      } else {
        await queryRunner.query(
          `DELETE FROM ${this.options.migrationsTableName} WHERE id = $1`,
          [migration.id],
        );
      }

      await queryRunner.commitTransaction();
      this.logger.info(
        `✓ Migration ${migration.id} ${direction} completed in ${executionTime}ms`,
      );

      return {
        migration: migration.id,
        status: 'success',
        executionTime,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `✗ Migration ${migration.id} ${direction} failed:`,
        error as Error,
      );

      return {
        migration: migration.id,
        status: 'failed',
        error: error as Error,
      };
    }
  }

  private async getAppliedMigrations(queryRunner: QueryRunner): Promise<Set<string>> {
    const records = await queryRunner.query(
      `SELECT id FROM ${this.options.migrationsTableName}`,
    );
    return new Set(records.map((r: any) => r.id));
  }

  private async getAppliedMigrationRecords(
    queryRunner: QueryRunner,
  ): Promise<Map<string, MigrationRecord>> {
    const records = await queryRunner.query(
      `SELECT * FROM ${this.options.migrationsTableName}`,
    );
    return new Map(records.map((r: any) => [r.id, r]));
  }

  private async ensureMigrationsTable(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.migrationsTableName} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          applied_at TIMESTAMP NOT NULL,
          execution_time INTEGER NOT NULL,
          checksum VARCHAR(32) NOT NULL
        )
      `);

      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_${this.options.migrationsTableName}_timestamp 
         ON ${this.options.migrationsTableName} (timestamp)`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private parseConnectionUrl(url: string): any {
    const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);

    if (!match) {
      throw new Error('Invalid PostgreSQL connection URL');
    }

    return {
      username: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5],
    };
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}