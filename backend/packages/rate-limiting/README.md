# Verpa Rate Limiting

Advanced rate limiting package for Verpa microservices with support for multiple strategies, user-based limits, and comprehensive analytics.

## Features

- **Multiple Strategies**: Fixed window, sliding window, token bucket, and leaky bucket
- **User & IP Based**: Different limits for authenticated users, tiers, and IPs
- **Redis & Memory**: Support for both Redis and in-memory storage
- **Analytics**: Track violations and detect suspicious patterns
- **Flexible Configuration**: Per-endpoint, per-user, and global limits
- **Auto-blocking**: Automatic blocking for repeat offenders
- **Bot Detection**: Special handling for bots and crawlers
- **Distributed Attack Detection**: Identify and block distributed attacks

## Installation

```bash
npm install @verpa/rate-limiting
```

## Quick Start

### Basic Usage

```typescript
import { RateLimitingModule } from '@verpa/rate-limiting';

@Module({
  imports: [
    RateLimitingModule.forRoot({
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      storage: 'redis',
      defaultLimits: {
        anonymous: {
          name: 'anonymous',
          limits: {
            perMinute: 30,
            perHour: 500,
          },
        },
        authenticated: {
          name: 'authenticated',
          limits: {
            perMinute: 60,
            perHour: 1000,
          },
        },
      },
      enableAnalytics: true,
    }),
  ],
})
export class AppModule {}
```

### Controller-Level Rate Limiting

```typescript
import { RateLimit, RateLimitPerMinute } from '@verpa/rate-limiting';

@Controller('users')
@RateLimitPerMinute(100) // 100 requests per minute for all endpoints
export class UsersController {
  @Get()
  @RateLimitPerMinute(30) // Override for specific endpoint
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  @RateLimit({
    points: 10,
    duration: 60,
    blockDuration: 300, // Block for 5 minutes after limit exceeded
  })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get('premium')
  @SkipRateLimit() // No rate limiting for this endpoint
  premiumContent() {
    return this.premiumService.getContent();
  }
}
```

## Strategies

### Fixed Window
Counts requests in fixed time windows. Simple but can allow bursts at window boundaries.

```typescript
RateLimitingModule.forRoot({
  strategy: RateLimitStrategy.FIXED_WINDOW,
  // ... other options
})
```

### Sliding Window (Recommended)
Counts requests in a sliding time window. More accurate than fixed window.

```typescript
RateLimitingModule.forRoot({
  strategy: RateLimitStrategy.SLIDING_WINDOW,
  // ... other options
})
```

### Token Bucket
Allows burst traffic while maintaining average rate. Tokens refill at constant rate.

```typescript
RateLimitingModule.forRoot({
  strategy: RateLimitStrategy.TOKEN_BUCKET,
  // ... other options
})
```

### Leaky Bucket
Smooths out bursts by processing requests at constant rate.

```typescript
RateLimitingModule.forRoot({
  strategy: RateLimitStrategy.LEAKY_BUCKET,
  // ... other options
})
```

## User Tiers

Define different rate limits for user subscription tiers:

```typescript
RateLimitingModule.forRoot({
  defaultLimits: {
    anonymous: {
      name: 'anonymous',
      limits: { perMinute: 30, perHour: 500, perDay: 2000 },
      burst: 10,
    },
    free: {
      name: 'free',
      limits: { perMinute: 60, perHour: 1000, perDay: 5000 },
      burst: 20,
    },
    basic: {
      name: 'basic',
      limits: { perMinute: 120, perHour: 2000, perDay: 10000 },
      burst: 40,
    },
    premium: {
      name: 'premium',
      limits: { perMinute: 300, perHour: 5000, perDay: 50000 },
      burst: 100,
    },
  },
})
```

## Dynamic Rate Limiting

Implement custom logic for rate limits:

```typescript
const dynamicConfig: DynamicRateLimit = {
  async getUserTier(userId: string): Promise<string> {
    const user = await userService.findOne(userId);
    return user.subscription.tier;
  },

  async getCustomLimits(userId: string, endpoint: string): Promise<RateLimitTier | null> {
    // Custom limits for specific users or endpoints
    if (endpoint.includes('/api/v1/heavy-operation')) {
      return {
        name: 'heavy-operation',
        limits: { perMinute: 5, perHour: 20 },
      };
    }
    return null;
  },

  async onLimitExceeded(userId: string, endpoint: string): Promise<void> {
    // Log, notify, or take action when limit exceeded
    await notificationService.notifyAdmin({
      type: 'rate-limit-exceeded',
      userId,
      endpoint,
    });
  },
};

@Module({
  imports: [
    RateLimitingModule.forRoot({ /* options */ }),
    RateLimitingModule.withDynamicConfig(dynamicConfig),
  ],
})
export class AppModule {}
```

## Per-Endpoint Configuration

```typescript
@Controller('api')
export class ApiController {
  @Get('search')
  @RateLimit({
    points: 10,
    duration: 60,
    keyGenerator: (req) => `search:${req.ip}:${req.query.q}`,
    errorMessage: 'Too many search requests. Please try again later.',
  })
  search(@Query('q') query: string) {
    return this.searchService.search(query);
  }

  @Post('upload')
  @RateLimit({
    points: 5,
    duration: 3600, // 5 uploads per hour
    skipIf: (req) => req.user?.role === 'admin',
  })
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.process(file);
  }
}
```

## Analytics

### Enable Analytics

```typescript
RateLimitingModule.forRoot({
  enableAnalytics: true,
  analyticsInterval: 3600000, // 1 hour
})
```

### Access Analytics

```typescript
@Injectable()
export class RateLimitController {
  constructor(
    private rateLimitService: RateLimitService,
    private analyticsService: RateLimitAnalyticsService,
  ) {}

  @Get('metrics')
  async getMetrics() {
    return this.rateLimitService.getMetrics();
  }

  @Get('suspicious-ips')
  async getSuspiciousIps() {
    return this.analyticsService.getSuspiciousIps();
  }

  @Get('abusive-users')
  async getAbusiveUsers() {
    return this.analyticsService.getAbusiveUsers();
  }
}
```

## Blocking & Whitelisting

### Block IP or User

```typescript
// Block IP for 1 hour
await rateLimitService.blockIp('192.168.1.100', 3600, 'Suspicious activity');

// Block user for 24 hours
await rateLimitService.blockUser('user-123', 86400, 'TOS violation');
```

### Whitelist Configuration

```typescript
RateLimitingModule.forRoot({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'], // IP ranges
  skipPaths: [/^\/health/, /^\/metrics/], // Regex patterns
  ignoreUserAgents: [/googlebot/i, /bingbot/i], // Allowed bots
})
```

## Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 30
```

## Error Response

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30,
  "limit": 60,
  "remaining": 0,
  "reset": "2024-01-15T10:30:00.000Z"
}
```

## Advanced Usage

### Custom Storage

```typescript
class CustomStorage implements RateLimitStorage {
  async get(key: string): Promise<any> {
    // Custom implementation
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Custom implementation
  }
}

RateLimitingModule.forRoot({
  storage: 'custom',
  customStorage: new CustomStorage(),
})
```

### Distributed Rate Limiting

For microservices, share rate limit state:

```typescript
RateLimitingModule.forRoot({
  storage: 'redis',
  redisClient: new Redis.Cluster([
    { host: 'redis-1', port: 6379 },
    { host: 'redis-2', port: 6379 },
    { host: 'redis-3', port: 6379 },
  ]),
  distributeLoad: true,
})
```

### Cascading Limits

Apply multiple time-window limits simultaneously:

```typescript
RateLimitingModule.forRoot({
  cascadeLimits: true,
  defaultLimits: {
    authenticated: {
      name: 'authenticated',
      limits: {
        perSecond: 2,    // Burst protection
        perMinute: 60,   // Standard limit
        perHour: 1000,   // Hourly cap
        perDay: 5000,    // Daily maximum
      },
    },
  },
})
```

## Testing

```typescript
describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: RateLimitService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        RateLimitingModule.forRoot({
          storage: 'memory',
          defaultLimits: {
            anonymous: {
              name: 'anonymous',
              limits: { perMinute: 10 },
            },
          },
        }),
      ],
    }).compile();

    guard = module.get(RateLimitGuard);
    rateLimitService = module.get(RateLimitService);
  });

  it('should allow requests within limit', async () => {
    const context = createMockExecutionContext();
    
    for (let i = 0; i < 10; i++) {
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const context = createMockExecutionContext();
    
    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      await guard.canActivate(context);
    }
    
    // Next request should be blocked
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });
});
```

## Performance Considerations

1. **Use Redis for production**: In-memory storage doesn't scale across instances
2. **Set appropriate key expiration**: Prevent memory bloat
3. **Use efficient key patterns**: Minimize key length
4. **Consider strategy overhead**: Token bucket and leaky bucket have more overhead
5. **Monitor Redis memory**: Set maxmemory policy

## Security Best Practices

1. **Protect against bypass attempts**: Validate X-Forwarded-For headers
2. **Rate limit by API key**: For better accountability
3. **Implement CAPTCHA**: For repeat offenders
4. **Log violations**: For security analysis
5. **Use progressive penalties**: Increase block duration for repeat violations

## Troubleshooting

### Rate limits not working
- Check Redis connection
- Verify strategy configuration
- Check if guard is registered globally

### Inconsistent limits across instances
- Ensure all instances use same Redis
- Check time synchronization
- Verify key generation logic

### Performance issues
- Monitor Redis latency
- Consider local caching for read-heavy operations
- Optimize key patterns

## Migration Guide

### From @nestjs/throttler

```typescript
// Before
@Throttle(10, 60)
class Controller {}

// After
@RateLimitPerMinute(10)
class Controller {}
```

### From express-rate-limit

```typescript
// Before
app.use(rateLimit({
  windowMs: 60000,
  max: 100,
}));

// After
RateLimitingModule.forRoot({
  defaultLimits: {
    anonymous: {
      limits: { perMinute: 100 },
    },
  },
})
```

## License

MIT