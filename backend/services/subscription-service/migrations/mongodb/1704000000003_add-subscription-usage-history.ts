import { MongoDBMigration } from '@verpa/database-migrations';

export class AddSubscriptionUsageHistory1704000000003 extends MongoDBMigration {
  constructor() {
    super('add-subscription-usage-history', 1704000000003, 'Add usage history tracking for subscriptions');
  }

  async up(): Promise<void> {
    // Create usage history collection
    await this.createCollection('subscription_usage_history', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['subscriptionId', 'userId', 'date', 'usage'],
          properties: {
            subscriptionId: { bsonType: 'string' },
            userId: { bsonType: 'string' },
            date: { bsonType: 'date' },
            usage: {
              bsonType: 'object',
              properties: {
                aquariumsCount: { bsonType: 'int' },
                photosCount: { bsonType: 'int' },
                apiCallsCount: { bsonType: 'int' },
                storageUsedMB: { bsonType: 'double' },
              },
            },
          },
        },
      },
    });

    // Create indexes for usage history
    await this.createIndex('subscription_usage_history', 
      { subscriptionId: 1, date: -1 }, 
      { unique: true }
    );
    await this.createIndex('subscription_usage_history', { userId: 1, date: -1 });
    await this.createIndex('subscription_usage_history', { date: -1 });

    // Add usage alerts to subscriptions
    await this.addField('subscriptions', 'usageAlerts', {
      aquariumsThreshold: 80, // percentage
      photosThreshold: 80,
      lastAlertSent: null,
      alertsEnabled: true,
    });

    // Add billing history reference
    await this.addField('subscriptions', 'billingHistory', []);
  }

  async down(): Promise<void> {
    // Drop usage history collection
    await this.dropCollection('subscription_usage_history');

    // Remove added fields
    await this.removeField('subscriptions', 'usageAlerts');
    await this.removeField('subscriptions', 'billingHistory');
  }
}