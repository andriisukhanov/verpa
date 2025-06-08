# Verpa Error Handling

A comprehensive error handling package for all Verpa microservices, providing consistent error responses, logging, monitoring, and resilience patterns.

## Features

- **Consistent Error Format**: Standardized error responses across all services
- **Custom Exception Classes**: Domain-specific exceptions for better error clarity
- **Global Exception Filter**: Catches and formats all unhandled exceptions
- **Validation Error Handling**: Beautiful formatting for validation errors
- **Error Logging**: Comprehensive error logging with Winston
- **Sentry Integration**: Automatic error reporting to Sentry
- **Resilience Patterns**: Retry, Circuit Breaker, and Timeout decorators
- **Correlation ID Support**: Track errors across microservices
- **Security**: Automatic sanitization of sensitive data in logs

## Installation

```bash
npm install @verpa/error-handling
```

## Quick Start

### 1. Import the module in your service

```typescript
import { ErrorHandlingModule } from '@verpa/error-handling';

@Module({
  imports: [
    ErrorHandlingModule.forRoot({
      logErrors: true,
      includeStackTrace: process.env.NODE_ENV === 'development',
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        serviceName: 'user-service',
      },
      defaultTimeout: 30000,
    }),
  ],
})
export class AppModule {}
```

### 2. Use custom exceptions

```typescript
import {
  ResourceNotFoundException,
  BusinessRuleViolationException,
  ValidationException,
} from '@verpa/error-handling';

@Injectable()
export class UserService {
  async findUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    // Check business rules
    if (await this.userExists(dto.email)) {
      throw new DuplicateResourceException('User', 'email', dto.email);
    }

    // Validate age
    if (dto.age < 18) {
      throw new BusinessRuleViolationException(
        'Users must be at least 18 years old',
        { age: dto.age },
      );
    }

    return this.userRepository.create(dto);
  }
}
```

## Exception Types

### Business Exceptions

```typescript
// Resource not found
throw new ResourceNotFoundException('User', userId);

// Duplicate resource
throw new DuplicateResourceException('User', 'email', email);

// Business rule violation
throw new BusinessRuleViolationException('Insufficient balance', { required: 100, current: 50 });

// Invalid operation
throw new InvalidOperationException('withdraw', 'Account is frozen');

// Validation errors
throw new ValidationException([
  { field: 'email', messages: ['Invalid email format'] },
  { field: 'age', messages: ['Must be at least 18'] },
]);
```

### System Exceptions

```typescript
// Database errors
throw new DatabaseException('insert', error);

// External service errors
throw new ExternalServiceException('PaymentGateway', 'processPayment', error);

// Configuration errors
throw new ConfigurationException('DATABASE_URL', 'Missing required configuration');

// Service unavailable
throw new ServiceUnavailableException('email-service', 'Service is down for maintenance');
```

### Authorization Exceptions

```typescript
// Unauthorized
throw new UnauthorizedException('Invalid credentials');

// Forbidden
throw new ForbiddenException('Article', 'delete');

// Insufficient permissions
throw new InsufficientPermissionsException(['admin', 'moderator']);
```

## Decorators

### @CatchErrors

Automatically catch and format errors from methods:

```typescript
@Injectable()
export class PaymentService {
  @CatchErrors({
    logErrors: true,
    rethrow: true,
    defaultMessage: 'Payment processing failed',
  })
  async processPayment(amount: number): Promise<Payment> {
    // Method implementation
  }
}
```

### @Retry

Retry failed operations with configurable backoff:

```typescript
@Injectable()
export class EmailService {
  @Retry({
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    retryIf: (error) => error.code === 'NETWORK_ERROR',
  })
  async sendEmail(to: string, subject: string): Promise<void> {
    // Method implementation
  }
}
```

### @CircuitBreaker

Prevent cascading failures with circuit breaker pattern:

```typescript
@Injectable()
export class ExternalAPIService {
  @CircuitBreakerDecorator({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    minimumRequests: 10,
  })
  async callExternalAPI(): Promise<any> {
    // Method implementation
  }
}
```

## Interceptors

### TimeoutInterceptor

Automatically timeout long-running requests:

```typescript
@Controller('users')
@UseInterceptors(new TimeoutInterceptor(5000)) // 5 seconds
export class UserController {
  // Controller methods
}
```

### ErrorLoggingInterceptor

Log all errors with context:

```typescript
@UseInterceptors(ErrorLoggingInterceptor)
export class AppController {
  // Controller methods
}
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "User with id '123' not found",
  "details": {
    "resource": "User",
    "id": "123"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users/123",
  "method": "GET",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Correlation ID Support

Track requests across microservices:

```typescript
// Add correlation ID middleware
app.use((req, res, next) => {
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuid();
  next();
});

// Correlation ID is automatically included in error responses
```

## Sentry Integration

Errors are automatically sent to Sentry with:
- Service name tagging
- Environment information
- User context (if available)
- Request details (sanitized)
- Custom breadcrumbs

Configure Sentry in the module options:

```typescript
ErrorHandlingModule.forRoot({
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    serviceName: 'user-service',
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
  },
})
```

## Security Features

### Automatic Sanitization

Sensitive data is automatically removed from logs:
- Authorization headers
- Passwords
- API keys
- Credit card numbers
- Cookies

### Custom Sanitization

Add custom sanitization rules:

```typescript
const logger = new ErrorLogger({
  sanitizeFields: ['ssn', 'bankAccount'],
});
```

## Best Practices

1. **Use specific exceptions**: Choose the most specific exception type
2. **Include context**: Always provide relevant details in exceptions
3. **Use correlation IDs**: Track errors across services
4. **Don't expose internals**: Use user-friendly messages in production
5. **Log appropriately**: Use proper log levels for different scenarios
6. **Monitor errors**: Set up alerts for critical errors
7. **Test error scenarios**: Include error cases in your tests

## Configuration Options

```typescript
interface ErrorHandlingModuleOptions {
  // Logging
  logErrors?: boolean;              // Enable error logging (default: true)
  logFile?: string;                 // Log file path
  includeStackTrace?: boolean;      // Include stack traces (default: dev only)

  // Sentry
  sentry?: {
    dsn: string;
    environment: string;
    serviceName: string;
    release?: string;
  };

  // Timeouts
  defaultTimeout?: number;          // Default timeout in ms (default: 30000)

  // Filters and interceptors
  useGlobalFilter?: boolean;        // Use global exception filter (default: true)
  useValidationFilter?: boolean;    // Use validation filter (default: true)
  useErrorLoggingInterceptor?: boolean; // Use error logging (default: true)
  useTimeoutInterceptor?: boolean;  // Use timeout interceptor (default: true)
}
```

## Testing

Test error scenarios in your services:

```typescript
describe('UserService', () => {
  it('should throw ResourceNotFoundException when user not found', async () => {
    await expect(service.findUser('invalid-id'))
      .rejects
      .toThrow(ResourceNotFoundException);
  });

  it('should throw DuplicateResourceException for duplicate email', async () => {
    await expect(service.createUser({ email: 'existing@email.com' }))
      .rejects
      .toThrow(DuplicateResourceException);
  });
});
```

## Migration Guide

To migrate existing error handling:

1. Replace generic exceptions with specific ones
2. Add correlation ID support
3. Configure the error handling module
4. Update error handling in controllers
5. Add resilience decorators where needed

## Performance Considerations

- Circuit breakers prevent cascading failures
- Retries include exponential backoff
- Timeouts prevent resource exhaustion
- Error logging is asynchronous
- Sentry sampling reduces overhead

## Troubleshooting

### Errors not being caught
- Ensure ErrorHandlingModule is imported
- Check filter order (validation filter should be first)
- Verify async errors are properly awaited

### Sentry not receiving errors
- Check DSN configuration
- Verify network connectivity
- Check Sentry project settings

### Correlation IDs not working
- Ensure middleware is added before routes
- Check header propagation in HTTP clients