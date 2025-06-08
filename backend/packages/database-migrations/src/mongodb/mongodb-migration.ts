import { Db, Collection, Document } from 'mongodb';
import { BaseMigration } from '../common/base-migration';

export abstract class MongoDBMigration extends BaseMigration {
  protected db!: Db;

  setDatabase(db: Db): void {
    this.db = db;
  }

  protected getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not set. Call setDatabase() first.');
    }
    return this.db.collection<T>(name);
  }

  protected async createIndex(
    collectionName: string,
    index: any,
    options?: any,
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.createIndex(index, options);
  }

  protected async dropIndex(
    collectionName: string,
    indexName: string,
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.dropIndex(indexName);
  }

  protected async addField(
    collectionName: string,
    field: string,
    defaultValue: any,
    filter: any = {},
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.updateMany(filter, {
      $set: { [field]: defaultValue },
    });
  }

  protected async removeField(
    collectionName: string,
    field: string,
    filter: any = {},
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.updateMany(filter, {
      $unset: { [field]: '' },
    });
  }

  protected async renameField(
    collectionName: string,
    oldField: string,
    newField: string,
    filter: any = {},
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.updateMany(filter, {
      $rename: { [oldField]: newField },
    });
  }

  protected async createCollection(
    name: string,
    options?: any,
  ): Promise<void> {
    await this.db.createCollection(name, options);
  }

  protected async dropCollection(name: string): Promise<void> {
    try {
      await this.db.dropCollection(name);
    } catch (error: any) {
      // Ignore error if collection doesn't exist
      if (error.code !== 26) {
        throw error;
      }
    }
  }
}