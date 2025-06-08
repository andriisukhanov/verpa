import { MongoClient, Db, Collection } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import {
  MigrationRunner,
  MigrationResult,
  MigrationStatus,
  MigrationOptions,
  MigrationMetadata,
  MigrationLogger,
} from '../common/interfaces/migration.interface';
import { ConsoleLogger } from '../common/logger';
import { MongoDBMigration } from './mongodb-migration';

interface MigrationRecord {
  _id: string;
  name: string;
  timestamp: number;
  appliedAt: Date;
  executionTime: number;
  checksum: string;
}

export class MongoDBMigrationRunner implements MigrationRunner {
  private client: MongoClient;
  private db: Db;
  private migrationsCollection: Collection<MigrationRecord>;
  private options: Required<MigrationOptions>;
  private logger: MigrationLogger;

  constructor(options: MigrationOptions) {
    this.options = {
      databaseUrl: options.databaseUrl || process.env.MONGODB_URI || 'mongodb://localhost:27017/verpa',
      migrationsPath: options.migrationsPath || './migrations/mongodb',
      migrationsTableName: options.migrationsTableName || '_migrations',
      logger: options.logger || new ConsoleLogger(),
    };
    this.logger = this.options.logger;
    this.client = new MongoClient(this.options.databaseUrl);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const dbName = this.extractDbName(this.options.databaseUrl);
    this.db = this.client.db(dbName);
    this.migrationsCollection = this.db.collection<MigrationRecord>(
      this.options.migrationsTableName,
    );
    await this.ensureMigrationsTable();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async up(target?: string): Promise<MigrationResult[]> {
    await this.connect();
    try {
      const migrations = await this.loadMigrations();
      const applied = await this.getAppliedMigrations();
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

        results.push(await this.runMigration(migration, 'up'));
      }

      return results;
    } finally {
      await this.disconnect();
    }
  }

  async down(target?: string): Promise<MigrationResult[]> {
    await this.connect();
    try {
      const migrations = await this.loadMigrations();
      const applied = Array.from(await this.getAppliedMigrations()).sort().reverse();
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

        results.push(await this.runMigration(migration, 'down'));
      }

      return results;
    } finally {
      await this.disconnect();
    }
  }

  async latest(): Promise<MigrationResult[]> {
    return this.up();
  }

  async rollback(): Promise<MigrationResult[]> {
    await this.connect();
    try {
      const lastApplied = await this.migrationsCollection.findOne(
        {},
        { sort: { timestamp: -1 } },
      );

      if (!lastApplied) {
        this.logger.info('No migrations to rollback');
        return [];
      }

      return this.down(lastApplied._id);
    } finally {
      await this.disconnect();
    }
  }

  async status(): Promise<MigrationStatus[]> {
    await this.connect();
    try {
      const migrations = await this.loadMigrations();
      const applied = await this.getAppliedMigrations();
      const appliedRecords = await this.getAppliedMigrationRecords();

      return migrations.map(migration => {
        const isApplied = applied.has(migration.id);
        const record = appliedRecords.get(migration.id);

        return {
          name: migration.name,
          timestamp: migration.timestamp,
          applied: isApplied,
          appliedAt: record?.appliedAt,
          pending: !isApplied,
        };
      });
    } finally {
      await this.disconnect();
    }
  }

  async create(name: string): Promise<string> {
    const timestamp = Date.now();
    const className = this.toPascalCase(name);
    const fileName = `${timestamp}_${name}.ts`;
    const filePath = path.join(this.options.migrationsPath, fileName);

    const template = `import { MongoDBMigration } from '@verpa/database-migrations';

export class ${className}${timestamp} extends MongoDBMigration {
  constructor() {
    super('${name}', ${timestamp}, 'Description of ${name} migration');
  }

  async up(): Promise<void> {
    // TODO: Implement migration up logic
    // Example: await this.createIndex('users', { email: 1 }, { unique: true });
  }

  async down(): Promise<void> {
    // TODO: Implement migration down logic
    // Example: await this.dropIndex('users', 'email_1');
  }
}
`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, template);
    this.logger.info(`Created migration: ${filePath}`);
    return filePath;
  }

  private async loadMigrations(): Promise<MongoDBMigration[]> {
    const pattern = path.join(this.options.migrationsPath, '*.ts');
    const files = await glob(pattern);
    const migrations: MongoDBMigration[] = [];

    for (const file of files.sort()) {
      try {
        const module = await import(file);
        const MigrationClass = Object.values(module).find(
          (exported: any) => 
            typeof exported === 'function' && 
            exported.prototype instanceof MongoDBMigration,
        ) as any;

        if (MigrationClass) {
          const migration = new MigrationClass();
          migration.setDatabase(this.db);
          migrations.push(migration);
        }
      } catch (error) {
        this.logger.error(`Failed to load migration ${file}:`, error as Error);
      }
    }

    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async runMigration(
    migration: MongoDBMigration,
    direction: 'up' | 'down',
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    this.logger.info(`Running migration ${direction}: ${migration.id}`);

    try {
      await migration[direction]();
      const executionTime = Date.now() - startTime;

      if (direction === 'up') {
        await this.migrationsCollection.insertOne({
          _id: migration.id,
          name: migration.name,
          timestamp: migration.timestamp,
          appliedAt: new Date(),
          executionTime,
          checksum: migration.getChecksum(),
        });
      } else {
        await this.migrationsCollection.deleteOne({ _id: migration.id });
      }

      this.logger.info(
        `✓ Migration ${migration.id} ${direction} completed in ${executionTime}ms`,
      );

      return {
        migration: migration.id,
        status: 'success',
        executionTime,
      };
    } catch (error) {
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

  private async getAppliedMigrations(): Promise<Set<string>> {
    const records = await this.migrationsCollection.find({}).toArray();
    return new Set(records.map(r => r._id));
  }

  private async getAppliedMigrationRecords(): Promise<Map<string, MigrationRecord>> {
    const records = await this.migrationsCollection.find({}).toArray();
    return new Map(records.map(r => [r._id, r]));
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.migrationsCollection.createIndex({ timestamp: 1 });
  }

  private extractDbName(url: string): string {
    const match = url.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'verpa';
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}