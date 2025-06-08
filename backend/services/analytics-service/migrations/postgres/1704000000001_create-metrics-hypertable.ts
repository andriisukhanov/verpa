import { PostgresMigration } from '@verpa/database-migrations';

export class CreateMetricsHypertable1704000000001 extends PostgresMigration {
  constructor() {
    super('create-metrics-hypertable', 1704000000001, 'Create TimescaleDB hypertable for metrics');
  }

  async up(): Promise<void> {
    // Enable TimescaleDB extension
    await this.createExtension('timescaledb');

    // Create metrics table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id UUID DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        value NUMERIC(20, 6) NOT NULL,
        tags JSONB DEFAULT '{}',
        timestamp TIMESTAMPTZ NOT NULL,
        aggregation_period VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, timestamp)
      )
    `);

    // Convert to hypertable for time-series optimization
    await this.query(`
      SELECT create_hypertable('metrics', 'timestamp', 
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      )
    `);

    // Create indexes for common queries
    await this.createIndex('idx_metrics_name_timestamp', 'metrics', ['name', 'timestamp']);
    await this.createIndex('idx_metrics_tags', 'metrics', ['tags'], false);
    await this.query('CREATE INDEX idx_metrics_tags_gin ON metrics USING GIN (tags)');

    // Create continuous aggregate for hourly metrics
    await this.query(`
      CREATE MATERIALIZED VIEW metrics_hourly
      WITH (timescaledb.continuous) AS
      SELECT
        name,
        tags,
        time_bucket('1 hour', timestamp) AS bucket,
        COUNT(*) as count,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        SUM(value) as sum_value
      FROM metrics
      GROUP BY name, tags, bucket
      WITH NO DATA
    `);

    // Create refresh policy for continuous aggregate
    await this.query(`
      SELECT add_continuous_aggregate_policy('metrics_hourly',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour'
      )
    `);

    // Create data retention policy (keep raw data for 30 days)
    await this.query(`
      SELECT add_retention_policy('metrics', INTERVAL '30 days')
    `);
  }

  async down(): Promise<void> {
    // Drop continuous aggregate
    await this.query('DROP MATERIALIZED VIEW IF EXISTS metrics_hourly');

    // Drop hypertable (this will also drop the table)
    await this.dropTable('metrics');

    // Note: We don't drop the extension as other tables might be using it
  }
}