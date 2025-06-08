import { MongoDBMigration } from '@verpa/database-migrations';

export default class InitialGatewaySchema extends MongoDBMigration {
  name = 'InitialGatewaySchema';
  version = '1704000000007';

  async up(): Promise<void> {
    // Create request_logs collection for API request logging
    await this.createCollection('request_logs');
    
    await this.createIndex('request_logs', { timestamp: -1 }, { background: true });
    await this.createIndex('request_logs', { userId: 1 }, { background: true });
    await this.createIndex('request_logs', { method: 1 }, { background: true });
    await this.createIndex('request_logs', { statusCode: 1 }, { background: true });
    await this.createIndex('request_logs', { path: 1 }, { background: true });
    await this.createIndex('request_logs', { service: 1 }, { background: true });
    await this.createIndex('request_logs', { ip: 1 }, { background: true });
    
    // Compound indexes for analytics
    await this.createIndex('request_logs', { 
      timestamp: -1, 
      service: 1 
    }, { background: true });
    
    await this.createIndex('request_logs', { 
      userId: 1, 
      timestamp: -1 
    }, { background: true });
    
    await this.createIndex('request_logs', { 
      statusCode: 1, 
      timestamp: -1 
    }, { background: true });

    // Create rate_limit_tracking collection
    await this.createCollection('rate_limit_tracking');
    
    await this.createIndex('rate_limit_tracking', { key: 1 }, { background: true });
    await this.createIndex('rate_limit_tracking', { expiresAt: 1 }, { 
      background: true, 
      expireAfterSeconds: 0 
    });
    await this.createIndex('rate_limit_tracking', { userId: 1 }, { background: true });
    await this.createIndex('rate_limit_tracking', { ip: 1 }, { background: true });

    // Create api_keys collection for API key management
    await this.createCollection('api_keys');
    
    await this.createIndex('api_keys', { keyHash: 1 }, { unique: true, background: true });
    await this.createIndex('api_keys', { userId: 1 }, { background: true });
    await this.createIndex('api_keys', { name: 1 }, { background: true });
    await this.createIndex('api_keys', { active: 1 }, { background: true });
    await this.createIndex('api_keys', { expiresAt: 1 }, { background: true });
    await this.createIndex('api_keys', { createdAt: -1 }, { background: true });
    
    // Compound index for active keys
    await this.createIndex('api_keys', { 
      active: 1, 
      expiresAt: 1 
    }, { background: true });

    // Create service_health_status collection
    await this.createCollection('service_health_status');
    
    await this.createIndex('service_health_status', { serviceName: 1 }, { unique: true, background: true });
    await this.createIndex('service_health_status', { status: 1 }, { background: true });
    await this.createIndex('service_health_status', { lastCheck: -1 }, { background: true });

    console.log('API Gateway: Initial schema migration completed');
  }

  async down(): Promise<void> {
    await this.dropCollection('service_health_status');
    await this.dropCollection('api_keys');
    await this.dropCollection('rate_limit_tracking');
    await this.dropCollection('request_logs');
    
    console.log('API Gateway: Initial schema migration rolled back');
  }
}