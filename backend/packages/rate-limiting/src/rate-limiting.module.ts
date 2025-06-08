import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitStorageService } from './services/rate-limit-storage.service';
import { RateLimitAnalyticsService } from './services/rate-limit-analytics.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AdvancedRateLimitGuard } from './guards/advanced-rate-limit.guard';
import { RateLimitModuleOptions, DynamicRateLimit } from './interfaces/rate-limit-options.interface';

@Global()
@Module({})
export class RateLimitingModule {
  static forRoot(options: RateLimitModuleOptions = {}): DynamicModule {
    const providers = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useValue: options,
      },
      {
        provide: RateLimitStorageService,
        useFactory: () => {
          let redisClient: Redis | undefined;
          
          if (options.storage === 'redis') {
            if (options.redisClient) {
              redisClient = options.redisClient;
            } else {
              // Create default Redis client
              redisClient = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
              });
            }
          }

          return new RateLimitStorageService({
            storage: options.storage || 'memory',
            redisClient,
          });
        },
      },
      RateLimitService,
      RateLimitAnalyticsService,
      {
        provide: APP_GUARD,
        useClass: RateLimitGuard,
      },
    ];

    // Add schedule module if analytics is enabled
    const imports = [];
    if (options.enableAnalytics) {
      imports.push(ScheduleModule.forRoot());
    }

    return {
      module: RateLimitingModule,
      imports,
      providers,
      exports: [RateLimitService, RateLimitStorageService, RateLimitAnalyticsService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<RateLimitModuleOptions> | RateLimitModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: RateLimitStorageService,
        useFactory: (moduleOptions: RateLimitModuleOptions) => {
          let redisClient: Redis | undefined;
          
          if (moduleOptions.storage === 'redis') {
            if (moduleOptions.redisClient) {
              redisClient = moduleOptions.redisClient;
            } else {
              redisClient = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
              });
            }
          }

          return new RateLimitStorageService({
            storage: moduleOptions.storage || 'memory',
            redisClient,
          });
        },
        inject: ['RATE_LIMIT_OPTIONS'],
      },
      RateLimitService,
      RateLimitAnalyticsService,
      {
        provide: APP_GUARD,
        useClass: RateLimitGuard,
      },
    ];

    return {
      module: RateLimitingModule,
      imports: [ScheduleModule.forRoot(), ...(options.imports || [])],
      providers,
      exports: [RateLimitService, RateLimitStorageService, RateLimitAnalyticsService],
    };
  }

  static withDynamicConfig(config: DynamicRateLimit): DynamicModule {
    return {
      module: RateLimitingModule,
      providers: [
        {
          provide: 'DYNAMIC_RATE_LIMIT',
          useValue: config,
        },
        {
          provide: APP_GUARD,
          useClass: AdvancedRateLimitGuard,
        },
      ],
    };
  }
}