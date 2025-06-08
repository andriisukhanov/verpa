# Analytics Service

The Analytics Service provides comprehensive tracking, metrics collection, and insights generation for the Verpa aquarium management system.

## Features

### Event Tracking
- Real-time event tracking from all microservices
- Batch processing for optimal performance
- Event categorization and tagging
- User activity tracking
- Entity-based event correlation

### Metrics Collection
- Time-series metrics storage using PostgreSQL
- Support for counters, gauges, histograms, and summaries
- Tag-based metric filtering
- Automatic metric aggregation

### User Analytics
- User profiles with activity tracking
- Engagement metrics
- Cohort analysis
- User segmentation
- Session tracking

### Reporting & Insights
- Activity statistics
- Retention analysis
- Custom dashboards
- Real-time metrics
- Historical data analysis

## Architecture

The service uses a hybrid database approach:
- **MongoDB**: For event storage and user analytics
- **PostgreSQL with TimescaleDB**: For time-series metrics
- **Redis**: For real-time counters and caching

## API Endpoints

### Event Tracking
- `POST /api/analytics/track` - Track a custom event
- `GET /api/analytics/users/:userId/events` - Get user event history

### User Analytics
- `GET /api/analytics/users/:userId` - Get user analytics profile
- `GET /api/analytics/segments` - Get user segments
- `GET /api/analytics/cohort-retention` - Get cohort retention data

### Metrics
- `GET /api/analytics/metrics` - Query metrics
- `GET /api/analytics/activity-stats` - Get platform activity statistics

### Health
- `GET /api/health` - Service health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Event Types

### User Events
- `user.created` - New user registration
- `user.login` - User login
- `user.logout` - User logout
- `user.updated` - Profile update

### Aquarium Events
- `aquarium.created` - New aquarium created
- `aquarium.viewed` - Aquarium viewed
- `aquarium.updated` - Aquarium updated
- `aquarium.deleted` - Aquarium deleted
- `aquarium.parameter_recorded` - Water parameters recorded

### System Events
- `system.error` - System error occurred
- `system.performance` - Performance metric
- `system.health` - Health check event

## Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3006
SERVICE_NAME=analytics-service

# MongoDB
MONGODB_URI=mongodb://localhost:27017/verpa_analytics

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=verpa_pg_user
POSTGRES_PASSWORD=verpa_pg_password_2024
POSTGRES_DB=verpa_analytics

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=analytics-service
KAFKA_GROUP_ID=analytics-service-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Analytics Settings
RAW_EVENTS_RETENTION_DAYS=30
AGGREGATED_DATA_RETENTION_DAYS=365
USER_SESSIONS_RETENTION_DAYS=90
BATCH_SIZE=1000
BATCH_FLUSH_INTERVAL_MS=5000
```

## Development

### Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up databases:
```bash
# MongoDB should be running
# PostgreSQL should be running
# Create analytics database
createdb verpa_analytics
```

3. Run the service:
```bash
yarn start:dev
```

### Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## Metrics

### System Metrics
- `events.total` - Total events processed
- `users.active` - Active users
- `api.requests` - API request count
- `api.latency` - API response time

### Business Metrics
- `aquariums.created` - New aquariums
- `parameters.recorded` - Water parameters recorded
- `photos.uploaded` - Photos uploaded
- `tasks.completed` - Tasks completed

## Data Retention

- **Raw Events**: 30 days (configurable)
- **Aggregated Data**: 1 year (configurable)
- **User Sessions**: 90 days (configurable)
- **Metrics**: Based on aggregation level

## Performance Optimization

1. **Batch Processing**: Events are batched before writing to database
2. **Async Processing**: All event processing is asynchronous
3. **Indexed Queries**: Proper database indexes for common queries
4. **Data Aggregation**: Pre-computed aggregations for faster queries
5. **Caching**: Redis caching for frequently accessed data

## Security

- JWT authentication for API endpoints
- Event validation and sanitization
- Rate limiting per user
- Data anonymization options
- GDPR compliance features

## Monitoring

- Health check endpoints
- Prometheus metrics export (coming soon)
- Error tracking and alerting
- Performance monitoring
- Resource usage tracking

## Future Enhancements

1. **Advanced Analytics**
   - Machine learning predictions
   - Anomaly detection
   - Trend analysis

2. **Real-time Dashboards**
   - WebSocket support
   - Live metric streaming
   - Custom dashboard builder

3. **Export Features**
   - CSV/Excel export
   - Scheduled reports
   - Email reports

4. **Integration**
   - Google Analytics integration
   - Third-party analytics tools
   - Webhook support