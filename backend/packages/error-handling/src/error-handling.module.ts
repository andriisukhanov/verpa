import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { initializeSentry, setupSentryErrorHandler, SentryConfig } from './utils/sentry.config';

export interface ErrorHandlingModuleOptions {
  // Error logging options
  logErrors?: boolean;
  logFile?: string;
  includeStackTrace?: boolean;

  // Sentry integration
  sentry?: SentryConfig;

  // Timeout configuration
  defaultTimeout?: number;

  // Custom error filters
  useGlobalFilter?: boolean;
  useValidationFilter?: boolean;
  useErrorLoggingInterceptor?: boolean;
  useTimeoutInterceptor?: boolean;
}

@Global()
@Module({})
export class ErrorHandlingModule {
  static forRoot(options: ErrorHandlingModuleOptions = {}): DynamicModule {
    const providers = [];

    // Initialize Sentry if configured
    if (options.sentry) {
      initializeSentry(options.sentry);
      setupSentryErrorHandler();
    }

    // Global exception filter
    if (options.useGlobalFilter !== false) {
      providers.push({
        provide: APP_FILTER,
        useValue: new GlobalExceptionFilter({
          logErrors: options.logErrors ?? true,
          sendToSentry: !!options.sentry,
          includeStackTrace: options.includeStackTrace ?? process.env.NODE_ENV === 'development',
        }),
      });
    }

    // Validation exception filter
    if (options.useValidationFilter !== false) {
      providers.push({
        provide: APP_FILTER,
        useClass: ValidationExceptionFilter,
      });
    }

    // Error logging interceptor
    if (options.useErrorLoggingInterceptor !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: ErrorLoggingInterceptor,
      });
    }

    // Timeout interceptor
    if (options.useTimeoutInterceptor !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useValue: new TimeoutInterceptor(options.defaultTimeout),
      });
    }

    return {
      module: ErrorHandlingModule,
      providers,
      exports: [],
    };
  }
}