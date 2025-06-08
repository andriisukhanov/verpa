export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export interface LogMetadata {
  service?: string;
  module?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: any;
  stack?: string;
  tags?: string[];
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata: LogMetadata;
}

export interface Logger {
  error(message: string, metadata?: LogMetadata): void;
  error(message: string, error: Error, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  http(message: string, metadata?: LogMetadata): void;
  verbose(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  silly(message: string, metadata?: LogMetadata): void;
  log(level: LogLevel, message: string, metadata?: LogMetadata): void;
  startTimer(): () => void;
  profile(id: string, metadata?: LogMetadata): void;
}

export interface LoggerService extends Logger {
  setContext(context: string): void;
  setMetadata(metadata: LogMetadata): void;
  child(metadata: LogMetadata): Logger;
  query(options: QueryOptions): Promise<LogEntry[]>;
}

export interface QueryOptions {
  from?: Date;
  to?: Date;
  level?: LogLevel;
  service?: string;
  userId?: string;
  requestId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogTransport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
  query?(options: QueryOptions): Promise<LogEntry[]>;
  close?(): void | Promise<void>;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogFilter {
  filter(entry: LogEntry): boolean;
}