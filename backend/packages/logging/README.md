# Verpa Logging

Comprehensive logging system for Verpa microservices with structured logging, performance monitoring, and distributed tracing.

## Features

- **Multiple Transports**: Console, file, and Elasticsearch
- **Structured Logging**: JSON format with metadata
- **Request Context**: Automatic request ID and correlation ID tracking
- **Performance Monitoring**: Track slow operations and resource usage
- **Error Tracking**: Detailed error logging with stack traces
- **Log Aggregation**: Query and analyze logs from Elasticsearch
- **Security**: Automatic redaction of sensitive data
- **Alerts**: Real-time alerts for errors and performance issues

## Installation

```bash
npm install @verpa/logging
```

## Quick Start

### Basic Setup

```typescript
import { LoggingModule } from '@verpa/logging';

@Module({
  imports: [
    LoggingModule.forRoot({
      serviceName: 'user-service',
      level: LogLevel.INFO,
      transports: [
        {
          type: 'console',
          enabled: true,
          options: {
            colors: true,
            prettyPrint: true,
          },
        },
        {
          type: 'file',
          enabled: true,
          options: {
            dirname: './logs',
            filename: 'app-%DATE%.log',
            maxSize: '20m',
            maxFiles: '14d',
          },
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### Using the Logger

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@verpa/logging';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(dto: CreateUserDto) {
    this.logger.info('Creating new user', { email: dto.email });

    try {
      const user = await this.userRepository.create(dto);
      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error, { email: dto.email });
      throw error;
    }
  }
}
```

## Configuration

### Complete Configuration

```typescript
LoggingModule.forRoot({
  serviceName: 'api-gateway',
  level: LogLevel.DEBUG,
  pretty: true,
  timestamp: true,
  colorize: true,
  contextStorage: true,
  redactFields: ['password', 'token', 'apiKey'],
  
  transports: [
    {
      type: 'console',
      enabled: true,
      level: LogLevel.DEBUG,
    },
    {
      type: 'file',
      enabled: true,
      options: {
        dirname: './logs',
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      },
    },
    {
      type: 'elasticsearch',
      enabled: true,
      options: {
        node: 'http://localhost:9200',
        auth: {
          username: 'elastic',
          password: 'password',
        },
        indexPrefix: 'logs',
        flushInterval: 2000,
        bulkSize: 100,
      },
    },
  ],
  
  performance: {
    slowRequestThreshold: 1000, // 1 second
    memoryThreshold: 500, // 500MB
    cpuThreshold: 80, // 80%
  },
  
  alerts: [
    {
      name: 'high-error-rate',
      condition: {
        type: 'error-rate',
        threshold: 10, // 10 errors per second
        window: 60, // 60 seconds
        comparison: 'gt',
      },
      channels: [
        { type: 'email', config: { to: 'ops@example.com' } },
        { type: 'slack', config: { webhook: 'https://...' } },
      ],
      cooldown: 300, // 5 minutes
    },
  ],
});
```

## Decorators

### Method Logging

```typescript
import { Log, LogAsync, LogPerformance, LogError } from '@verpa/logging';

export class ProductService {
  @Log('Fetching product')
  getProduct(id: string) {
    return this.productRepo.findOne(id);
  }

  @LogAsync({
    message: 'Creating product',
    level: 'info',
    includeArgs: true,
    includeResult: true,
  })
  async createProduct(dto: CreateProductDto) {
    return this.productRepo.create(dto);
  }

  @LogPerformance({
    warningThreshold: 500, // Warn if > 500ms
    errorThreshold: 2000, // Error if > 2s
    includeMemory: true,
    includeCpu: true,
  })
  async processLargeDataset(data: any[]) {
    // Complex processing
  }

  @LogError({
    rethrow: true,
    level: 'error',
    includeStack: true,
  })
  async riskyOperation() {
    // May throw error
  }
}
```

## Interceptors

### Global Logging

```typescript
import { LoggingInterceptor, PerformanceInterceptor } from '@verpa/logging';

const app = await NestFactory.create(AppModule);

// Add logging to all requests
app.useGlobalInterceptors(
  app.get(LoggingInterceptor),
  app.get(PerformanceInterceptor),
);
```

### Controller-Specific

```typescript
@Controller('users')
@UseInterceptors(LoggingInterceptor, PerformanceInterceptor)
export class UsersController {
  // All methods will be logged
}
```

## Middleware

### Request Logging

```typescript
import { RequestLoggingMiddleware, MorganMiddleware } from '@verpa/logging';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware, MorganMiddleware)
      .forRoutes('*');
  }
}
```

## Querying Logs

### Search Logs

```typescript
@Injectable()
export class LogController {
  constructor(private readonly logger: LoggerService) {}

  @Get('logs')
  async searchLogs(@Query() query: QueryLogsDto) {
    return this.logger.query({
      from: new Date(query.from),
      to: new Date(query.to),
      level: query.level,
      service: query.service,
      userId: query.userId,
      search: query.search,
      limit: query.limit || 100,
      offset: query.offset || 0,
    });
  }
}
```

### Get Statistics

```typescript
const stats = await this.queryService.getStats({
  from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  to: new Date(),
});

// Returns:
// {
//   levels: { error: 45, warn: 123, info: 5678 },
//   services: { 'user-service': 2345, 'api-gateway': 3456 },
//   errorsOverTime: [...],
//   topErrors: [...]
// }
```

## Performance Tracking

### Manual Performance Tracking

```typescript
const timer = this.performanceService.startTimer();

// Do some work
await heavyOperation();

timer.end('heavy-operation', { 
  itemsProcessed: 1000,
  source: 'batch-job',
});
```

### Async Operations

```typescript
const result = await this.performanceService.measureAsync(
  'database-query',
  async () => {
    return this.db.query('SELECT * FROM large_table');
  },
  { query: 'large_table' }
);
```

## Context Management

### Setting Request Context

```typescript
this.contextService.setRequestContext({
  requestId: req.id,
  correlationId: req.headers['x-correlation-id'],
  userId: req.user?.id,
  ip: req.ip,
});
```

### Adding Custom Metadata

```typescript
this.contextService.setMetadata('tenant', tenantId);
this.contextService.setMetadata('feature', 'bulk-import');

// All subsequent logs will include this metadata
this.logger.info('Processing bulk import');
```

## Child Loggers

Create specialized loggers with inherited context:

```typescript
const importLogger = this.logger.child({
  module: 'BulkImport',
  batchId: batch.id,
});

importLogger.info('Starting import');
// Logs will include both parent and child metadata
```

## Security

### Automatic Redaction

Sensitive fields are automatically redacted:

```typescript
this.logger.info('User login', {
  email: 'user@example.com',
  password: 'secret123', // Will be logged as '[REDACTED]'
  token: 'jwt-token', // Will be logged as '[REDACTED]'
});
```

### Custom Redaction

```typescript
LoggingModule.forRoot({
  redactFields: [
    'password',
    'token',
    'creditCard',
    'ssn',
    'apiKey',
    'secretKey',
    'privateKey',
  ],
});
```

## Alerts and Monitoring

### Error Rate Alerts

```typescript
{
  alerts: [
    {
      name: 'high-error-rate',
      condition: {
        type: 'error-rate',
        threshold: 10, // errors per second
        window: 60, // seconds
        comparison: 'gt',
      },
      channels: [
        {
          type: 'email',
          config: {
            to: ['ops@example.com', 'dev@example.com'],
            subject: 'High Error Rate Alert',
          },
        },
      ],
    },
  ],
}
```

### Response Time Alerts

```typescript
{
  alerts: [
    {
      name: 'slow-response-time',
      condition: {
        type: 'response-time',
        threshold: 2000, // 2 seconds
        window: 300, // 5 minutes
        comparison: 'gt',
      },
      channels: [
        {
          type: 'slack',
          config: {
            webhook: process.env.SLACK_WEBHOOK_URL,
            channel: '#alerts',
          },
        },
      ],
    },
  ],
}
```

## Best Practices

1. **Use Structured Logging**: Always include relevant metadata
   ```typescript
   // Good
   this.logger.info('Order processed', { orderId, userId, amount });
   
   // Bad
   this.logger.info(`Order ${orderId} processed`);
   ```

2. **Set Context Early**: Set context at the beginning of operations
   ```typescript
   async processOrder(orderId: string) {
     this.logger.setMetadata({ orderId });
     // All logs will include orderId
   }
   ```

3. **Use Appropriate Log Levels**:
   - `error`: Application errors that need immediate attention
   - `warn`: Warnings about potential issues
   - `info`: Important business events
   - `http`: HTTP request/response (automatic)
   - `debug`: Detailed debugging information
   - `verbose`: Very detailed debugging
   - `silly`: Extremely verbose logging

4. **Include Error Context**: When logging errors, include relevant context
   ```typescript
   catch (error) {
     this.logger.error('Failed to process payment', error, {
       orderId,
       userId,
       amount,
       paymentMethod,
     });
   }
   ```

5. **Monitor Performance**: Use performance decorators for critical operations
   ```typescript
   @LogPerformance({ warningThreshold: 1000 })
   async generateReport() {
     // Complex operation
   }
   ```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify transport is enabled
3. Check file permissions for file transport
4. Verify Elasticsearch connection

### High Memory Usage

1. Reduce `bulkSize` for Elasticsearch transport
2. Enable log rotation for file transport
3. Implement sampling for high-volume logs

### Performance Impact

1. Use async transports
2. Enable buffering for Elasticsearch
3. Consider sampling for debug logs in production

## License

MIT