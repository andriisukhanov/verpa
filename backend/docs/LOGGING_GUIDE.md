# Verpa Logging Guide

## Overview

The Verpa logging system provides comprehensive logging capabilities for all microservices, including structured logging, performance monitoring, distributed tracing, and log aggregation.

## Key Features

- **Structured Logging**: JSON format with rich metadata
- **Multiple Transports**: Console, file, and Elasticsearch
- **Request Context**: Automatic request ID and correlation tracking
- **Performance Monitoring**: Track slow operations and resource usage
- **Security**: Automatic redaction of sensitive data
- **Distributed Tracing**: Correlate logs across services
- **Real-time Alerts**: Get notified of errors and performance issues

## Configuration

### Environment Variables

```bash
# Log level (error, warn, info, http, verbose, debug, silly)
LOG_LEVEL=info

# Enable file logging
LOG_TO_FILE=true
LOG_DIR=./logs

# Elasticsearch configuration
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme

# Performance thresholds
SLOW_REQUEST_THRESHOLD=1000  # milliseconds
MEMORY_THRESHOLD=500         # MB
CPU_THRESHOLD=80            # percentage

# Alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_WEBHOOK_TOKEN=your-token
```

### Service Configuration

Each service should configure logging in its module:

```typescript
import { LoggingModule } from '@verpa/logging';
import { createLoggingConfig } from '@verpa/logging/dist/config/logging.config';

@Module({
  imports: [
    LoggingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => 
        createLoggingConfig('your-service-name'),
    }),
  ],
})
export class AppModule {}
```

## Usage Patterns

### Basic Logging

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(dto: CreateUserDto) {
    this.logger.info('Creating user', { email: dto.email });
    
    try {
      const user = await this.userRepository.create(dto);
      this.logger.info('User created', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error, { email: dto.email });
      throw error;
    }
  }
}
```

### Using Decorators

```typescript
export class OrderService {
  @LogAsync({ 
    message: 'Processing order',
    level: 'info',
    includeArgs: true 
  })
  async processOrder(orderId: string) {
    // Method automatically logged
  }

  @LogPerformance({ 
    warningThreshold: 1000,
    includeMemory: true 
  })
  async generateReport(data: any[]) {
    // Performance automatically tracked
  }

  @LogError({ 
    rethrow: true,
    message: 'Payment processing failed' 
  })
  async processPayment(amount: number) {
    // Errors automatically logged
  }
}
```

### Request Context

The logging system automatically tracks request context:

```typescript
// In middleware or interceptor
this.contextService.setRequestContext({
  requestId: req.id,
  userId: req.user?.id,
  ip: req.ip,
});

// Context is automatically included in all logs
this.logger.info('Processing request'); // Includes requestId, userId, etc.
```

### Performance Tracking

```typescript
// Manual performance tracking
const timer = this.performanceService.startTimer();
await this.processData();
timer.end('data-processing', { recordCount: 1000 });

// Measure specific operations
await this.performanceService.measureAsync(
  'database-query',
  async () => await this.db.query(sql),
  { query: 'user-stats' }
);
```

## Log Levels

Use appropriate log levels for different scenarios:

- **error**: Application errors requiring immediate attention
- **warn**: Warnings about potential issues or unusual behavior
- **info**: Important business events (user actions, transactions)
- **http**: HTTP request/response (automatically logged)
- **verbose**: Detailed operational information
- **debug**: Debugging information for development
- **silly**: Very detailed trace information

## Best Practices

### 1. Use Structured Logging

```typescript
// Good - structured with metadata
this.logger.info('Order processed', {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  items: order.items.length,
});

// Bad - unstructured string
this.logger.info(`Order ${order.id} processed for user ${user.id}`);
```

### 2. Include Relevant Context

```typescript
// Include all relevant information for debugging
this.logger.error('Payment failed', error, {
  orderId: order.id,
  userId: user.id,
  amount: payment.amount,
  paymentMethod: payment.method,
  gateway: payment.gateway,
  attemptNumber: retryCount,
});
```

### 3. Use Child Loggers

```typescript
// Create child logger for specific operations
const importLogger = this.logger.child({
  operation: 'bulk-import',
  batchId: batch.id,
  totalRecords: records.length,
});

importLogger.info('Starting import');
// All logs include the batch context
```

### 4. Log Business Events

```typescript
// Log important business events with consistent structure
this.logger.info('Subscription upgraded', {
  event: 'subscription.upgraded',
  userId: user.id,
  fromTier: 'basic',
  toTier: 'premium',
  amount: 29.99,
  billingCycle: 'monthly',
});
```

### 5. Handle Sensitive Data

```typescript
// Sensitive fields are automatically redacted
this.logger.info('User authenticated', {
  email: user.email,
  password: user.password, // Automatically logged as '[REDACTED]'
  token: authToken,       // Automatically logged as '[REDACTED]'
});
```

## Monitoring and Alerts

### Elasticsearch Dashboard

Access Kibana at http://localhost:5601 to:
- Search and filter logs
- Create visualizations
- Set up alerts
- Monitor error rates
- Track performance metrics

### Programmatic Queries

```typescript
// Search for recent errors
const errors = await this.logger.query({
  from: new Date(Date.now() - 60 * 60 * 1000),
  level: LogLevel.ERROR,
  service: 'user-service',
  limit: 100,
});

// Get statistics
const stats = await this.queryService.getStats({
  from: new Date('2024-01-01'),
  to: new Date(),
});
```

### Alerts Configuration

Configure alerts for critical events:

```typescript
alerts: [
  {
    name: 'high-error-rate',
    condition: {
      type: 'error-rate',
      threshold: 10, // errors per second
      window: 60,    // seconds
      comparison: 'gt',
    },
    channels: [
      { type: 'slack', config: { webhook: 'https://...' } },
      { type: 'email', config: { to: 'ops@example.com' } },
    ],
  },
]
```

## Performance Optimization

### 1. Use Sampling in Production

```typescript
sampling: {
  enabled: true,
  rate: 1.0, // 100% for errors
  rules: [
    { condition: 'level', value: LogLevel.DEBUG, rate: 0.1 },
    { condition: 'level', value: LogLevel.VERBOSE, rate: 0.05 },
  ],
}
```

### 2. Batch Elasticsearch Writes

```typescript
elasticsearch: {
  flushInterval: 2000, // 2 seconds
  bulkSize: 100,      // 100 logs per batch
}
```

### 3. Rotate Log Files

```typescript
file: {
  maxSize: '20m',    // 20MB per file
  maxFiles: '14d',   // Keep 14 days
  zippedArchive: true, // Compress old logs
}
```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify transport is enabled
3. Check Elasticsearch connection
4. Verify file permissions

### High Memory Usage

1. Reduce Elasticsearch bulk size
2. Enable log rotation
3. Implement sampling for verbose logs

### Missing Context

1. Ensure middleware is applied
2. Check context service configuration
3. Verify request ID generation

## Security Considerations

1. **Never log passwords or tokens directly**
2. **Use redaction for sensitive fields**
3. **Restrict access to log files and Elasticsearch**
4. **Rotate logs regularly**
5. **Monitor for suspicious patterns**

## Integration with Other Services

### API Gateway

The API Gateway automatically logs all requests and responses:

```typescript
// Automatic logging in API Gateway
- Request ID generation
- User context injection
- Response time tracking
- Error logging
```

### Microservices

Each microservice should:
1. Use consistent service names
2. Propagate correlation IDs
3. Log service-specific events
4. Monitor performance

### Database Operations

```typescript
@LogPerformance({ warningThreshold: 100 })
async executeQuery(sql: string, params: any[]) {
  this.logger.debug('Executing query', { sql, params });
  const result = await this.db.query(sql, params);
  this.logger.debug('Query completed', { rowCount: result.rowCount });
  return result;
}
```

## Examples

See `/backend/packages/logging/examples/` for comprehensive examples of:
- Basic logging patterns
- Performance tracking
- Error handling
- Business event logging
- Query and analysis