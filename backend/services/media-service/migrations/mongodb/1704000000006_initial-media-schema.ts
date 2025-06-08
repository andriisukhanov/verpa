import { MongoDBMigration } from '@verpa/database-migrations';

export default class InitialMediaSchema extends MongoDBMigration {
  name = 'InitialMediaSchema';
  version = '1704000000006';

  async up(): Promise<void> {
    // Create media_files collection
    await this.createCollection('media_files');
    
    await this.createIndex('media_files', { userId: 1 }, { background: true });
    await this.createIndex('media_files', { aquariumId: 1 }, { background: true });
    await this.createIndex('media_files', { filename: 1 }, { background: true });
    await this.createIndex('media_files', { mimeType: 1 }, { background: true });
    await this.createIndex('media_files', { status: 1 }, { background: true });
    await this.createIndex('media_files', { uploadedAt: -1 }, { background: true });
    await this.createIndex('media_files', { size: 1 }, { background: true });
    await this.createIndex('media_files', { tags: 1 }, { background: true });
    
    // Compound indexes for common queries
    await this.createIndex('media_files', { 
      userId: 1, 
      aquariumId: 1, 
      uploadedAt: -1 
    }, { background: true });
    
    await this.createIndex('media_files', { 
      userId: 1, 
      mimeType: 1 
    }, { background: true });
    
    await this.createIndex('media_files', { 
      status: 1, 
      uploadedAt: -1 
    }, { background: true });

    // Create media_processing_jobs collection for async processing
    await this.createCollection('media_processing_jobs');
    
    await this.createIndex('media_processing_jobs', { mediaFileId: 1 }, { background: true });
    await this.createIndex('media_processing_jobs', { status: 1 }, { background: true });
    await this.createIndex('media_processing_jobs', { type: 1 }, { background: true });
    await this.createIndex('media_processing_jobs', { createdAt: -1 }, { background: true });
    await this.createIndex('media_processing_jobs', { updatedAt: -1 }, { background: true });
    
    // Compound index for job processing
    await this.createIndex('media_processing_jobs', { 
      status: 1, 
      createdAt: 1 
    }, { background: true });

    // Create media_thumbnails collection for generated thumbnails
    await this.createCollection('media_thumbnails');
    
    await this.createIndex('media_thumbnails', { originalFileId: 1 }, { background: true });
    await this.createIndex('media_thumbnails', { size: 1 }, { background: true });
    await this.createIndex('media_thumbnails', { format: 1 }, { background: true });
    
    // Compound index for thumbnail retrieval
    await this.createIndex('media_thumbnails', { 
      originalFileId: 1, 
      size: 1 
    }, { background: true });

    console.log('Media Service: Initial schema migration completed');
  }

  async down(): Promise<void> {
    await this.dropCollection('media_thumbnails');
    await this.dropCollection('media_processing_jobs');
    await this.dropCollection('media_files');
    
    console.log('Media Service: Initial schema migration rolled back');
  }
}