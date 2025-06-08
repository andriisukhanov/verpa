import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { LoggingConfig } from './interfaces/log-config.interface';
import { LoggerService } from './services/logger.service';
import { ContextService } from './services/context.service';
import { QueryService } from './services/query.service';
import { AlertService } from './services/alert.service';
import { PerformanceService } from './services/performance.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { MorganMiddleware } from './middleware/morgan.middleware';
import { LOGGING_CONFIG, DEFAULT_LOG_LEVELS, DEFAULT_REDACT_FIELDS } from './utils/constants';
import { createConsoleTransport } from './transports/console.transport';
import { createFileTransport, createErrorFileTransport } from './transports/file.transport';
import { createElasticsearchTransport } from './transports/elasticsearch.transport';

@Global()
@Module({})
export class LoggingModule {
  static forRoot(config: LoggingConfig): DynamicModule {
    const configProvider: Provider = {
      provide: LOGGING_CONFIG,
      useValue: {
        ...config,
        redactFields: config.redactFields || DEFAULT_REDACT_FIELDS,
      },
    };

    const winstonModule = WinstonModule.forRoot({
      levels: DEFAULT_LOG_LEVELS,
      level: config.level || 'info',
      transports: this.createTransports(config),
    });

    return {
      module: LoggingModule,
      imports: [winstonModule],
      providers: [
        configProvider,
        LoggerService,
        ContextService,
        QueryService,
        AlertService,
        PerformanceService,
        LoggingInterceptor,
        PerformanceInterceptor,
        ErrorLoggingInterceptor,
        RequestLoggingMiddleware,
        MorganMiddleware,
      ],
      exports: [
        LoggerService,
        ContextService,
        QueryService,
        AlertService,
        PerformanceService,
        LoggingInterceptor,
        PerformanceInterceptor,
        ErrorLoggingInterceptor,
        RequestLoggingMiddleware,
        MorganMiddleware,
      ],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<LoggingConfig> | LoggingConfig;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    const configProvider: Provider = {
      provide: LOGGING_CONFIG,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return {
          ...config,
          redactFields: config.redactFields || DEFAULT_REDACT_FIELDS,
        };
      },
      inject: options.inject || [],
    };

    return {
      module: LoggingModule,
      imports: [
        ...(options.imports || []),
        WinstonModule.forRootAsync({
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return {
              levels: DEFAULT_LOG_LEVELS,
              level: config.level || 'info',
              transports: this.createTransports(config),
            };
          },
          inject: options.inject || [],
        }),
      ],
      providers: [
        configProvider,
        LoggerService,
        ContextService,
        QueryService,
        AlertService,
        PerformanceService,
        LoggingInterceptor,
        PerformanceInterceptor,
        ErrorLoggingInterceptor,
        RequestLoggingMiddleware,
        MorganMiddleware,
      ],
      exports: [
        LoggerService,
        ContextService,
        QueryService,
        AlertService,
        PerformanceService,
        LoggingInterceptor,
        PerformanceInterceptor,
        ErrorLoggingInterceptor,
        RequestLoggingMiddleware,
        MorganMiddleware,
      ],
    };
  }

  private static createTransports(config: LoggingConfig): winston.transport[] {
    const transports: winston.transport[] = [];

    if (!config.transports || config.transports.length === 0) {
      // Default to console transport
      transports.push(createConsoleTransport({
        colors: config.colorize,
        prettyPrint: config.pretty,
        timestamps: config.timestamp,
      }));
      return transports;
    }

    for (const transportConfig of config.transports) {
      if (!transportConfig.enabled) continue;

      switch (transportConfig.type) {
        case 'console':
          transports.push(createConsoleTransport(transportConfig.options));
          break;

        case 'file':
          transports.push(createFileTransport(transportConfig.options));
          transports.push(createErrorFileTransport(transportConfig.options));
          break;

        case 'elasticsearch':
          transports.push(createElasticsearchTransport(transportConfig.options));
          break;

        case 'custom':
          if (transportConfig.options?.transport) {
            transports.push(transportConfig.options.transport);
          }
          break;
      }
    }

    return transports;
  }
}