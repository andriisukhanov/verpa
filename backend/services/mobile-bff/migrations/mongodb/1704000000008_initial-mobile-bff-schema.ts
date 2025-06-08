import { MongoDBMigration } from '@verpa/database-migrations';

export default class InitialMobileBffSchema extends MongoDBMigration {
  name = 'InitialMobileBffSchema';
  version = '1704000000008';

  async up(): Promise<void> {
    // Create mobile_sessions collection for mobile-specific session tracking
    await this.createCollection('mobile_sessions');
    
    await this.createIndex('mobile_sessions', { userId: 1 }, { background: true });
    await this.createIndex('mobile_sessions', { deviceId: 1 }, { background: true });
    await this.createIndex('mobile_sessions', { sessionToken: 1 }, { unique: true, background: true });
    await this.createIndex('mobile_sessions', { platform: 1 }, { background: true });
    await this.createIndex('mobile_sessions', { appVersion: 1 }, { background: true });
    await this.createIndex('mobile_sessions', { lastActivity: -1 }, { background: true });
    await this.createIndex('mobile_sessions', { createdAt: -1 }, { background: true });
    await this.createIndex('mobile_sessions', { active: 1 }, { background: true });
    
    // Compound indexes for common queries
    await this.createIndex('mobile_sessions', { 
      userId: 1, 
      active: 1, 
      lastActivity: -1 
    }, { background: true });
    
    await this.createIndex('mobile_sessions', { 
      deviceId: 1, 
      active: 1 
    }, { background: true });

    // Create device_info collection for device registration and push notifications
    await this.createCollection('device_info');
    
    await this.createIndex('device_info', { userId: 1 }, { background: true });
    await this.createIndex('device_info', { deviceId: 1 }, { unique: true, background: true });
    await this.createIndex('device_info', { pushToken: 1 }, { background: true });
    await this.createIndex('device_info', { platform: 1 }, { background: true });
    await this.createIndex('device_info', { active: 1 }, { background: true });
    await this.createIndex('device_info', { lastSeen: -1 }, { background: true });
    
    // Compound index for push notifications
    await this.createIndex('device_info', { 
      active: 1, 
      pushToken: 1 
    }, { background: true });

    // Create mobile_cache collection for mobile-specific caching
    await this.createCollection('mobile_cache');
    
    await this.createIndex('mobile_cache', { key: 1 }, { unique: true, background: true });
    await this.createIndex('mobile_cache', { userId: 1 }, { background: true });
    await this.createIndex('mobile_cache', { expiresAt: 1 }, { 
      background: true, 
      expireAfterSeconds: 0 
    });
    await this.createIndex('mobile_cache', { category: 1 }, { background: true });
    await this.createIndex('mobile_cache', { createdAt: -1 }, { background: true });

    // Create mobile_analytics collection for mobile-specific analytics
    await this.createCollection('mobile_analytics');
    
    await this.createIndex('mobile_analytics', { userId: 1 }, { background: true });
    await this.createIndex('mobile_analytics', { deviceId: 1 }, { background: true });
    await this.createIndex('mobile_analytics', { event: 1 }, { background: true });
    await this.createIndex('mobile_analytics', { timestamp: -1 }, { background: true });
    await this.createIndex('mobile_analytics', { platform: 1 }, { background: true });
    await this.createIndex('mobile_analytics', { appVersion: 1 }, { background: true });
    
    // Compound indexes for analytics queries
    await this.createIndex('mobile_analytics', { 
      event: 1, 
      timestamp: -1 
    }, { background: true });
    
    await this.createIndex('mobile_analytics', { 
      userId: 1, 
      timestamp: -1 
    }, { background: true });

    console.log('Mobile BFF: Initial schema migration completed');
  }

  async down(): Promise<void> {
    await this.dropCollection('mobile_analytics');
    await this.dropCollection('mobile_cache');
    await this.dropCollection('device_info');
    await this.dropCollection('mobile_sessions');
    
    console.log('Mobile BFF: Initial schema migration rolled back');
  }
}