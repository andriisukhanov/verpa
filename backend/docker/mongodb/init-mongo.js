// MongoDB initialization script for Verpa
// This script runs when MongoDB container is first created

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create application user with readWrite permissions
db.createUser({
  user: 'verpa_app',
  pwd: 'verpa_app_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'verpa'
    },
    {
      role: 'readWrite',
      db: 'verpa_test'
    }
  ]
});

// Switch to main application database
db = db.getSiblingDB('verpa');

// Create collections with validation schemas
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'role', 'subscriptionType', 'createdAt', 'updatedAt'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        role: {
          enum: ['USER', 'ADMIN', 'MODERATOR']
        },
        subscriptionType: {
          enum: ['FREE', 'PREMIUM', 'ENTERPRISE']
        },
        emailVerified: {
          bsonType: 'bool'
        },
        phoneVerified: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ 'authProviders.provider': 1, 'authProviders.providerId': 1 });

// Create aquariums collection
db.createCollection('aquariums', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'name', 'waterType', 'volume', 'volumeUnit', 'createdAt', 'updatedAt'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100
        },
        waterType: {
          enum: ['FRESHWATER', 'SALTWATER', 'BRACKISH']
        },
        volume: {
          bsonType: 'number',
          minimum: 1
        },
        volumeUnit: {
          enum: ['liters', 'gallons']
        },
        isActive: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create indexes for aquariums collection
db.aquariums.createIndex({ userId: 1, isActive: 1 });
db.aquariums.createIndex({ createdAt: -1 });
db.aquariums.createIndex({ name: 'text' });

// Create events collection
db.createCollection('events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'aquariumId', 'type', 'title', 'scheduledFor', 'createdAt', 'updatedAt'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        aquariumId: {
          bsonType: 'objectId'
        },
        type: {
          enum: ['WATER_CHANGE', 'FEEDING', 'MAINTENANCE', 'TESTING', 'MEDICATION', 'OTHER']
        },
        completed: {
          bsonType: 'bool'
        },
        isRecurring: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create indexes for events collection
db.events.createIndex({ userId: 1, scheduledFor: 1 });
db.events.createIndex({ aquariumId: 1, type: 1 });
db.events.createIndex({ completed: 1, scheduledFor: 1 });
db.events.createIndex({ createdAt: -1 });

// Create notifications collection
db.createCollection('notifications');

// Create indexes for notifications collection
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, type: 1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Create water_parameters collection for time-series data
db.createCollection('water_parameters', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
});

// Create sessions collection for user sessions
db.createCollection('sessions');
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create audit_logs collection
db.createCollection('audit_logs');
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1, timestamp: -1 });
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

print('MongoDB initialization completed successfully!');