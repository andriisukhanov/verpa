import { Migration } from './interfaces/migration.interface';
import * as crypto from 'crypto';

export abstract class BaseMigration implements Migration {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;
  public readonly description?: string;

  constructor(name: string, timestamp: number, description?: string) {
    this.name = name;
    this.timestamp = timestamp;
    this.description = description;
    this.id = `${timestamp}_${name}`;
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  getChecksum(): string {
    const content = `${this.id}${this.up.toString()}${this.down.toString()}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }
}