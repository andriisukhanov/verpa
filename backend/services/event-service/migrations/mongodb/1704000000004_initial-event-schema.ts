import { MongoDBMigration } from '@verpa/database-migrations';

export default class InitialEventSchema extends MongoDBMigration {
  name = 'InitialEventSchema';
  version = '1704000000004';

  async up(): Promise<void> {
    // Create events collection with indexes
    await this.createCollection('events');
    
    // Create indexes for better query performance
    await this.createIndex('events', { userId: 1 }, { background: true });
    await this.createIndex('events', { aquariumId: 1 }, { background: true });
    await this.createIndex('events', { scheduledAt: 1 }, { background: true });
    await this.createIndex('events', { type: 1 }, { background: true });
    await this.createIndex('events', { status: 1 }, { background: true });
    await this.createIndex('events', { recurring: 1 }, { background: true });
    await this.createIndex('events', { createdAt: -1 }, { background: true });
    
    // Compound indexes for common query patterns
    await this.createIndex('events', { 
      userId: 1, 
      aquariumId: 1, 
      scheduledAt: 1 
    }, { background: true });
    
    await this.createIndex('events', { 
      status: 1, 
      scheduledAt: 1 
    }, { background: true });

    // Create reminders collection with indexes
    await this.createCollection('reminders');
    
    await this.createIndex('reminders', { eventId: 1 }, { background: true });
    await this.createIndex('reminders', { userId: 1 }, { background: true });
    await this.createIndex('reminders', { reminderAt: 1 }, { background: true });
    await this.createIndex('reminders', { type: 1 }, { background: true });
    await this.createIndex('reminders', { sent: 1 }, { background: true });
    
    // Compound index for reminder processing
    await this.createIndex('reminders', { 
      sent: 1, 
      reminderAt: 1 
    }, { background: true });

    console.log('Event Service: Initial schema migration completed');
  }

  async down(): Promise<void> {
    // Drop collections in reverse order
    await this.dropCollection('reminders');
    await this.dropCollection('events');
    
    console.log('Event Service: Initial schema migration rolled back');
  }
}