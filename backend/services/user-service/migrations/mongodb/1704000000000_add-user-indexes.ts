import { MongoDBMigration } from '@verpa/database-migrations';

export class AddUserIndexes1704000000000 extends MongoDBMigration {
  constructor() {
    super('add-user-indexes', 1704000000000, 'Add indexes for user collection performance optimization');
  }

  async up(): Promise<void> {
    // Create indexes for better query performance
    await this.createIndex('users', { email: 1 }, { unique: true });
    await this.createIndex('users', { username: 1 }, { unique: true });
    await this.createIndex('users', { createdAt: -1 });
    await this.createIndex('users', { lastLoginAt: -1 });
    await this.createIndex('users', { 'subscription.status': 1 });
    
    // Compound index for login queries
    await this.createIndex('users', { email: 1, isActive: 1 });
    
    // Text index for user search
    await this.createIndex('users', { 
      firstName: 'text', 
      lastName: 'text', 
      email: 'text' 
    });
  }

  async down(): Promise<void> {
    // Remove indexes
    await this.dropIndex('users', 'email_1');
    await this.dropIndex('users', 'username_1');
    await this.dropIndex('users', 'createdAt_-1');
    await this.dropIndex('users', 'lastLoginAt_-1');
    await this.dropIndex('users', 'subscription.status_1');
    await this.dropIndex('users', 'email_1_isActive_1');
    await this.dropIndex('users', 'firstName_text_lastName_text_email_text');
  }
}