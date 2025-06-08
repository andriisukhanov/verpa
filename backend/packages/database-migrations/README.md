# Verpa Database Migrations

A comprehensive database migration system for Verpa microservices, supporting both MongoDB and PostgreSQL databases.

## Overview

This package provides a unified migration framework that allows you to:
- Run database migrations across multiple services
- Support both MongoDB and PostgreSQL
- Track migration status and history
- Create new migrations with templates
- Rollback migrations when needed

## Project Structure

```
backend/packages/database-migrations/
├── src/
│   ├── common/          # Base migration classes and interfaces
│   ├── mongodb/         # MongoDB-specific migration utilities
│   ├── postgres/        # PostgreSQL-specific migration utilities
│   └── scripts/         # CLI tools for migration management
├── dist/               # Compiled TypeScript output
└── README.md           # This file
```

## Installation

```bash
cd backend/packages/database-migrations
npm install
npm run build
```

## Usage

### Running Migrations

Use the provided shell script to run migrations across all services:

```bash
# Run all migrations for all services
./backend/scripts/run-migrations.sh up all

# Run migrations for a specific service
./backend/scripts/run-migrations.sh up user-service

# Check migration status
./backend/scripts/run-migrations.sh status all

# Check status for specific service
./backend/scripts/run-migrations.sh status user-service
```

### Creating New Migrations

```bash
# Create a new MongoDB migration
./backend/scripts/run-migrations.sh create user-service add-email-indexes mongodb

# Create a new PostgreSQL migration
./backend/scripts/run-migrations.sh create analytics-service add-metrics-table postgres
```

### Direct CLI Usage

You can also use the migration CLI directly:

```bash
# From a service directory
npx @verpa/database-migrations migrate up \
  --database mongodb \
  --url "mongodb://localhost:27017/verpa" \
  --path "./migrations/mongodb"

# Check status
npx @verpa/database-migrations migrate status \
  --database mongodb \
  --url "mongodb://localhost:27017/verpa" \
  --path "./migrations/mongodb"
```

## Writing Migrations

### MongoDB Migrations

```typescript
import { MongoDBMigration } from '@verpa/database-migrations';

export default class AddUserIndexes extends MongoDBMigration {
  name = 'AddUserIndexes';
  version = '1704000000001';

  async up(): Promise<void> {
    // Create indexes
    await this.createIndex('users', { email: 1 }, { unique: true });
    await this.createIndex('users', { createdAt: -1 });
    
    // Add fields
    await this.addField('users', 'emailVerified', false);
    
    console.log('User indexes migration completed');
  }

  async down(): Promise<void> {
    // Rollback changes
    await this.dropIndex('users', 'email_1');
    await this.removeField('users', 'emailVerified');
    
    console.log('User indexes migration rolled back');
  }
}
```

### PostgreSQL Migrations

```typescript
import { PostgresMigration } from '@verpa/database-migrations';

export default class CreateMetricsTable extends PostgresMigration {
  name = 'CreateMetricsTable';
  version = '1704000000001';

  async up(): Promise<void> {
    await this.createTable('metrics', [
      { name: 'id', type: 'SERIAL', primaryKey: true },
      { name: 'user_id', type: 'INTEGER', notNull: true },
      { name: 'event_name', type: 'VARCHAR(255)', notNull: true },
      { name: 'timestamp', type: 'TIMESTAMPTZ', notNull: true },
      { name: 'properties', type: 'JSONB' },
    ]);
    
    await this.createIndex('metrics', ['user_id']);
    await this.createIndex('metrics', ['timestamp']);
    
    console.log('Metrics table created');
  }

  async down(): Promise<void> {
    await this.dropTable('metrics');
    console.log('Metrics table dropped');
  }
}
```

## Available Helper Methods

### MongoDB Migration Helpers

- `createCollection(name, options?)` - Create a new collection
- `dropCollection(name)` - Drop a collection
- `createIndex(collection, index, options?)` - Create an index
- `dropIndex(collection, indexName)` - Drop an index
- `addField(collection, field, defaultValue, filter?)` - Add field to documents
- `removeField(collection, field, filter?)` - Remove field from documents
- `renameField(collection, oldField, newField, filter?)` - Rename a field

### PostgreSQL Migration Helpers

- `createTable(name, columns)` - Create a new table
- `dropTable(name)` - Drop a table
- `addColumn(table, column)` - Add a column
- `dropColumn(table, columnName)` - Drop a column
- `createIndex(table, columns, options?)` - Create an index
- `dropIndex(indexName)` - Drop an index
- `addForeignKey(table, column, references)` - Add foreign key constraint

## Migration Naming Convention

Migration files should follow this naming pattern:
```
<timestamp>_<descriptive-name>.ts
```

Examples:
- `1704000000001_initial-user-schema.ts`
- `1704067200002_add-email-verification.ts`
- `1704153600003_create-analytics-tables.ts`

The timestamp should be in Unix timestamp format and should be unique across all migrations in the service.

## Environment Variables

The migration system uses these environment variables:

```bash
# MongoDB connection
MONGODB_URI="mongodb://verpa_admin:password@localhost:27017/verpa?authSource=admin"

# PostgreSQL connection  
DATABASE_URL="postgres://verpa_pg_user:password@localhost:5432/verpa_analytics"
```

## Database Configuration by Service

| Service | MongoDB | PostgreSQL | Notes |
|---------|---------|------------|-------|
| user-service | ✓ | | User data, sessions |
| aquarium-service | ✓ | | Aquarium data |
| event-service | ✓ | | Events, reminders |
| notification-service | ✓ | | Notification logs |
| media-service | ✓ | | File metadata |
| subscription-service | ✓ | | Billing data |
| analytics-service | ✓ | ✓ | Analytics + TimescaleDB |
| api-gateway | ✓ | | Request logs, rate limits |
| mobile-bff | ✓ | | Mobile sessions, cache |

## Troubleshooting

### Common Issues

1. **Migration package not found**
   ```bash
   cd backend/packages/database-migrations
   npm run build
   ```

2. **Database connection failed**
   - Check your database URLs in environment variables
   - Ensure databases are running (Docker Compose)
   - Verify authentication credentials

3. **Migration already exists**
   - Check existing migrations in the service directory
   - Ensure timestamp is unique
   - Verify migration wasn't already applied

4. **Rollback failed**
   - Some operations cannot be automatically rolled back
   - Manual intervention may be required
   - Check migration logs for specific errors

### Debugging

Enable debug mode by setting:
```bash
DEBUG=verpa:migrations ./backend/scripts/run-migrations.sh up all
```

### Manual Migration Recovery

If migrations get into an inconsistent state:

1. Check migration status:
   ```bash
   ./backend/scripts/run-migrations.sh status user-service
   ```

2. Manually inspect the `_migrations` collection/table:
   ```javascript
   // MongoDB
   db._migrations.find().sort({timestamp: -1})
   ```
   
   ```sql
   -- PostgreSQL
   SELECT * FROM _migrations ORDER BY timestamp DESC;
   ```

3. If needed, manually mark a migration as applied:
   ```javascript
   // MongoDB - ONLY if you're sure the migration was applied manually
   db._migrations.insertOne({
     version: "1704000000001",
     name: "MigrationName",
     timestamp: new Date(),
     executionTime: 0,
     checksum: "manual"
   })
   ```

## Best Practices

1. **Always test migrations in development first**
2. **Make migrations idempotent** - they should be safe to run multiple times
3. **Use transactions for complex PostgreSQL migrations**
4. **Keep migrations small and focused** - one logical change per migration
5. **Include proper error handling and logging**
6. **Test both up and down migrations**
7. **Document complex migrations with comments**
8. **Backup databases before running migrations in production**

## Production Deployment

1. **Run migrations before deploying new code:**
   ```bash
   ./backend/scripts/run-migrations.sh up all
   ```

2. **Verify migration status:**
   ```bash
   ./backend/scripts/run-migrations.sh status all
   ```

3. **Deploy application code only after migrations succeed**

4. **Monitor application logs** for any migration-related issues

## Contributing

When adding new migration functionality:

1. Update the base classes in `src/common/`
2. Add helper methods to database-specific classes
3. Update this README with new features
4. Add tests for new functionality
5. Update the CLI tools if needed