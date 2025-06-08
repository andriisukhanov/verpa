import { QueryRunner } from 'typeorm';
import { BaseMigration } from '../common/base-migration';

export abstract class PostgresMigration extends BaseMigration {
  protected queryRunner!: QueryRunner;

  setQueryRunner(queryRunner: QueryRunner): void {
    this.queryRunner = queryRunner;
  }

  protected async query(query: string, parameters?: any[]): Promise<any> {
    if (!this.queryRunner) {
      throw new Error('QueryRunner not set. Call setQueryRunner() first.');
    }
    return this.queryRunner.query(query, parameters);
  }

  protected async createTable(
    tableName: string,
    tableDefinition: string,
  ): Promise<void> {
    await this.query(`CREATE TABLE ${tableName} (${tableDefinition})`);
  }

  protected async dropTable(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS ${tableName}`);
  }

  protected async addColumn(
    tableName: string,
    columnName: string,
    columnDefinition: string,
  ): Promise<void> {
    await this.query(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
    );
  }

  protected async dropColumn(
    tableName: string,
    columnName: string,
  ): Promise<void> {
    await this.query(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
  }

  protected async renameColumn(
    tableName: string,
    oldColumnName: string,
    newColumnName: string,
  ): Promise<void> {
    await this.query(
      `ALTER TABLE ${tableName} RENAME COLUMN ${oldColumnName} TO ${newColumnName}`,
    );
  }

  protected async createIndex(
    indexName: string,
    tableName: string,
    columns: string[],
    unique: boolean = false,
  ): Promise<void> {
    const uniqueKeyword = unique ? 'UNIQUE' : '';
    await this.query(
      `CREATE ${uniqueKeyword} INDEX ${indexName} ON ${tableName} (${columns.join(', ')})`,
    );
  }

  protected async dropIndex(indexName: string): Promise<void> {
    await this.query(`DROP INDEX IF EXISTS ${indexName}`);
  }

  protected async createForeignKey(
    constraintName: string,
    tableName: string,
    columnName: string,
    referencedTableName: string,
    referencedColumnName: string,
    onDelete: string = 'CASCADE',
    onUpdate: string = 'CASCADE',
  ): Promise<void> {
    await this.query(
      `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} 
       FOREIGN KEY (${columnName}) REFERENCES ${referencedTableName} (${referencedColumnName})
       ON DELETE ${onDelete} ON UPDATE ${onUpdate}`,
    );
  }

  protected async dropForeignKey(
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    await this.query(
      `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName}`,
    );
  }

  protected async createEnum(
    enumName: string,
    values: string[],
  ): Promise<void> {
    const valuesList = values.map(v => `'${v}'`).join(', ');
    await this.query(`CREATE TYPE ${enumName} AS ENUM (${valuesList})`);
  }

  protected async dropEnum(enumName: string): Promise<void> {
    await this.query(`DROP TYPE IF EXISTS ${enumName}`);
  }

  protected async createExtension(extensionName: string): Promise<void> {
    await this.query(`CREATE EXTENSION IF NOT EXISTS "${extensionName}"`);
  }

  protected async dropExtension(extensionName: string): Promise<void> {
    await this.query(`DROP EXTENSION IF EXISTS "${extensionName}"`);
  }
}