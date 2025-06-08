import { MongoDBMigration } from '@verpa/database-migrations';

export default class InitialNotificationSchema extends MongoDBMigration {
  name = 'InitialNotificationSchema';
  version = '1704000000005';

  async up(): Promise<void> {
    // Note: BullMQ creates its own collections for queues automatically
    // We'll create collections for notification logs and templates if needed
    
    // Create notification_logs collection for tracking sent notifications
    await this.createCollection('notification_logs');
    
    await this.createIndex('notification_logs', { userId: 1 }, { background: true });
    await this.createIndex('notification_logs', { type: 1 }, { background: true });
    await this.createIndex('notification_logs', { status: 1 }, { background: true });
    await this.createIndex('notification_logs', { sentAt: -1 }, { background: true });
    await this.createIndex('notification_logs', { template: 1 }, { background: true });
    await this.createIndex('notification_logs', { channel: 1 }, { background: true });
    
    // Compound indexes for common queries
    await this.createIndex('notification_logs', { 
      userId: 1, 
      type: 1, 
      sentAt: -1 
    }, { background: true });
    
    await this.createIndex('notification_logs', { 
      status: 1, 
      sentAt: -1 
    }, { background: true });

    // Create templates collection for custom templates
    await this.createCollection('templates');
    
    await this.createIndex('templates', { name: 1 }, { unique: true, background: true });
    await this.createIndex('templates', { type: 1 }, { background: true });
    await this.createIndex('templates', { active: 1 }, { background: true });
    await this.createIndex('templates', { category: 1 }, { background: true });

    // Create notification_preferences collection for user preferences
    await this.createCollection('notification_preferences');
    
    await this.createIndex('notification_preferences', { userId: 1 }, { unique: true, background: true });
    
    console.log('Notification Service: Initial schema migration completed');
  }

  async down(): Promise<void> {
    await this.dropCollection('notification_preferences');
    await this.dropCollection('templates');
    await this.dropCollection('notification_logs');
    
    console.log('Notification Service: Initial schema migration rolled back');
  }
}