export const configuration = () => ({
  service: {
    name: process.env.SERVICE_NAME || 'analytics-service',
    port: parseInt(process.env.PORT, 10) || 3006,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    // MongoDB for event storage
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://verpa_admin:verpa_secure_password_2024@localhost:27017/verpa_analytics?authSource=admin',
    },
    // PostgreSQL for time-series data
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      username: process.env.POSTGRES_USER || 'verpa_pg_user',
      password: process.env.POSTGRES_PASSWORD || 'verpa_pg_password_2024',
      database: process.env.POSTGRES_DB || 'verpa_analytics',
    },
  },
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'analytics-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'analytics-service-group',
    topics: {
      userEvents: 'user.events',
      aquariumEvents: 'aquarium.events',
      eventEvents: 'event.events',
      systemEvents: 'system.events',
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  analytics: {
    // Data retention policies
    retention: {
      rawEvents: parseInt(process.env.RAW_EVENTS_RETENTION_DAYS, 10) || 30,
      aggregatedData: parseInt(process.env.AGGREGATED_DATA_RETENTION_DAYS, 10) || 365,
      userSessions: parseInt(process.env.USER_SESSIONS_RETENTION_DAYS, 10) || 90,
    },
    // Aggregation intervals
    aggregation: {
      realtime: parseInt(process.env.REALTIME_AGGREGATION_INTERVAL_MS, 10) || 60000, // 1 minute
      hourly: parseInt(process.env.HOURLY_AGGREGATION_INTERVAL_MS, 10) || 3600000, // 1 hour
      daily: parseInt(process.env.DAILY_AGGREGATION_INTERVAL_MS, 10) || 86400000, // 24 hours
    },
    // Batch processing
    batch: {
      size: parseInt(process.env.BATCH_SIZE, 10) || 1000,
      flushInterval: parseInt(process.env.BATCH_FLUSH_INTERVAL_MS, 10) || 5000,
    },
  },
  security: {
    apiKey: process.env.INTERNAL_API_KEY || 'internal-api-key',
  },
});