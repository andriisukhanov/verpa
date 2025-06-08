import { MongoDBMigration } from '@verpa/database-migrations';

export class AddAquariumAnalyticsFields1704000000002 extends MongoDBMigration {
  constructor() {
    super('add-aquarium-analytics-fields', 1704000000002, 'Add analytics tracking fields to aquarium collection');
  }

  async up(): Promise<void> {
    // Add analytics fields to all aquarium documents
    await this.addField('aquariums', 'analytics', {
      viewCount: 0,
      lastViewedAt: null,
      shareCount: 0,
      favoriteCount: 0,
    });

    // Add field for tracking parameter trends
    await this.addField('aquariums', 'parameterTrends', {
      temperature: { trend: 'stable', lastValue: null },
      ph: { trend: 'stable', lastValue: null },
      ammonia: { trend: 'stable', lastValue: null },
      nitrite: { trend: 'stable', lastValue: null },
      nitrate: { trend: 'stable', lastValue: null },
    });

    // Create indexes for analytics queries
    await this.createIndex('aquariums', { 'analytics.viewCount': -1 });
    await this.createIndex('aquariums', { 'analytics.lastViewedAt': -1 });
    await this.createIndex('aquariums', { 'analytics.favoriteCount': -1 });
    
    // Add index for featured aquariums
    await this.createIndex('aquariums', { 
      isPublic: 1, 
      'analytics.viewCount': -1,
      'analytics.favoriteCount': -1 
    });
  }

  async down(): Promise<void> {
    // Remove analytics fields
    await this.removeField('aquariums', 'analytics');
    await this.removeField('aquariums', 'parameterTrends');

    // Drop analytics indexes
    await this.dropIndex('aquariums', 'analytics.viewCount_-1');
    await this.dropIndex('aquariums', 'analytics.lastViewedAt_-1');
    await this.dropIndex('aquariums', 'analytics.favoriteCount_-1');
    await this.dropIndex('aquariums', 'isPublic_1_analytics.viewCount_-1_analytics.favoriteCount_-1');
  }
}