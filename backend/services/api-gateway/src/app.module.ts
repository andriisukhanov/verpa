import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiVersioningModule, VersioningType } from '@verpa/api-versioning';
import { RateLimitingModule, RateLimitStrategy } from '@verpa/rate-limiting';
import { LoggingModule, LogLevel, RequestLoggingMiddleware, MorganMiddleware } from '@verpa/logging';
import { configuration } from './config/configuration';
import { RedisModule } from './services/redis/redis.module';
import { ProxyModule } from './services/proxy/proxy.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AquariumsModule } from './modules/aquariums/aquariums.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule as LoggingDashboardModule } from './modules/logging/logging.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { MetricsModule } from './services/metrics/metrics.module';
import { CacheModule } from './services/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ApiVersioningModule.forRoot({
      type: [VersioningType.URI, VersioningType.HEADER],
      defaultVersion: '1',
      prefix: 'v',
      header: 'X-API-Version',
      supportedVersions: ['1', '2'],
      deprecatedVersions: [],
      fallbackToDefault: true,
    }),
    RateLimitingModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        strategy: RateLimitStrategy.SLIDING_WINDOW,
        storage: 'redis',
        redisClient: require('ioredis').createClient({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        }),
        defaultLimits: {
          anonymous: {
            name: 'anonymous',
            limits: {
              perSecond: 2,
              perMinute: 30,
              perHour: 500,
              perDay: 2000,
            },
            burst: 10,
          },
          authenticated: {
            name: 'authenticated',
            limits: {
              perSecond: 5,
              perMinute: 60,
              perHour: 1000,
              perDay: 5000,
            },
            burst: 20,
          },
          premium: {
            name: 'premium',
            limits: {
              perSecond: 10,
              perMinute: 300,
              perHour: 5000,
              perDay: 50000,
            },
            burst: 100,
          },
        },
        trustProxy: true,
        enableAnalytics: true,
        cascadeLimits: true,
        headers: {
          limit: 'X-RateLimit-Limit',
          remaining: 'X-RateLimit-Remaining',
          reset: 'X-RateLimit-Reset',
          retryAfter: 'Retry-After',
        },
      }),
    }),
    LoggingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        serviceName: 'api-gateway',
        level: config.get('LOG_LEVEL', LogLevel.INFO) as LogLevel,
        pretty: config.get('NODE_ENV') !== 'production',
        timestamp: true,
        colorize: config.get('NODE_ENV') !== 'production',
        contextStorage: true,
        transports: [
          {
            type: 'console',
            enabled: true,
            options: {
              colors: config.get('NODE_ENV') !== 'production',
              prettyPrint: config.get('NODE_ENV') !== 'production',
            },
          },
          {
            type: 'file',
            enabled: config.get('LOG_TO_FILE', true),
            options: {
              dirname: config.get('LOG_DIR', './logs'),
              filename: 'api-gateway-%DATE%.log',
              maxSize: '20m',
              maxFiles: '14d',
              zippedArchive: true,
            },
          },
          {
            type: 'elasticsearch',
            enabled: config.get('ELASTICSEARCH_ENABLED', false),
            options: {
              node: config.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
              auth: {
                username: config.get('ELASTICSEARCH_USER', 'elastic'),
                password: config.get('ELASTICSEARCH_PASSWORD', ''),
              },
              indexPrefix: 'logs-api-gateway',
            },
          },
        ],
        performance: {
          slowRequestThreshold: 1000,
          memoryThreshold: 500,
        },
        alerts: [
          {
            name: 'high-error-rate',
            condition: {
              type: 'error-rate',
              threshold: 10,
              window: 60,
              comparison: 'gt',
            },
            channels: [
              {
                type: 'webhook',
                config: {
                  url: config.get('ALERT_WEBHOOK_URL', ''),
                },
              },
            ],
            cooldown: 300,
          },
        ],
      }),
    }),
    RedisModule,
    ProxyModule,
    CacheModule,
    MetricsModule,
    AuthModule,
    UsersModule,
    AquariumsModule,
    EventsModule,
    NotificationsModule,
    MediaModule,
    HealthModule,
    LoggingDashboardModule,
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware, MorganMiddleware)
      .exclude('/health', '/metrics')
      .forRoutes('*');
  }
}