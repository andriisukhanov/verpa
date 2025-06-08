import { Injectable, Inject, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
  Logger,
  LoggerService as ILoggerService,
  LogLevel,
  LogMetadata,
  LogEntry,
  QueryOptions,
} from '../interfaces/logger.interface';
import { ContextService } from './context.service';
import { QueryService } from './query.service';
import { LOGGING_CONFIG } from '../utils/constants';
import { LoggingConfig } from '../interfaces/log-config.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements ILoggerService {
  private context: string = 'Application';
  private metadata: LogMetadata = {};

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winston: winston.Logger,
    @Inject(LOGGING_CONFIG) private readonly config: LoggingConfig,
    private readonly contextService: ContextService,
    private readonly queryService: QueryService,
  ) {}

  setContext(context: string): void {
    this.context = context;
  }

  setMetadata(metadata: LogMetadata): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  error(message: string, errorOrMetadata?: Error | LogMetadata, metadata?: LogMetadata): void {
    if (errorOrMetadata instanceof Error) {
      this.log(LogLevel.ERROR, message, {
        ...metadata,
        error: {
          message: errorOrMetadata.message,
          stack: errorOrMetadata.stack,
          name: errorOrMetadata.name,
        },
      });
    } else {
      this.log(LogLevel.ERROR, message, errorOrMetadata);
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  http(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.HTTP, message, metadata);
  }

  verbose(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.VERBOSE, message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  silly(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.SILLY, message, metadata);
  }

  log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const contextMetadata = this.contextService.getContext();
    const finalMetadata: LogMetadata = {
      service: this.config.serviceName,
      module: this.context,
      timestamp: new Date().toISOString(),
      ...contextMetadata,
      ...this.metadata,
      ...metadata,
    };

    // Redact sensitive fields
    if (this.config.redactFields) {
      this.redactFields(finalMetadata, this.config.redactFields);
    }

    this.winston.log(level, message, finalMetadata);
  }

  startTimer(): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug('Timer ended', { duration });
    };
  }

  profile(id: string, metadata?: LogMetadata): void {
    this.winston.profile(id, metadata);
  }

  child(metadata: LogMetadata): Logger {
    const child = new LoggerService(
      this.winston,
      this.config,
      this.contextService,
      this.queryService,
    );
    child.setContext(this.context);
    child.setMetadata({ ...this.metadata, ...metadata });
    return child;
  }

  async query(options: QueryOptions): Promise<LogEntry[]> {
    return this.queryService.query(options);
  }

  private redactFields(obj: any, fields: string[]): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (fields.includes(key)) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.redactFields(obj[key], fields);
        }
      }
    }
  }
}