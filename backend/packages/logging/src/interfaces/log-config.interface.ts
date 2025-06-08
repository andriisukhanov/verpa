import { LogLevel } from './logger.interface';

export interface LoggingConfig {
  level?: LogLevel;
  serviceName: string;
  pretty?: boolean;
  timestamp?: boolean;
  colorize?: boolean;
  transports?: TransportConfig[];
  contextStorage?: boolean;
  redactFields?: string[];
  sampling?: SamplingConfig;
  performance?: PerformanceConfig;
  alerts?: AlertConfig[];
}

export interface TransportConfig {
  type: 'console' | 'file' | 'elasticsearch' | 'custom';
  level?: LogLevel;
  enabled?: boolean;
  options?: any;
}

export interface ConsoleTransportConfig extends TransportConfig {
  type: 'console';
  options?: {
    colors?: boolean;
    prettyPrint?: boolean;
    timestamps?: boolean;
  };
}

export interface FileTransportConfig extends TransportConfig {
  type: 'file';
  options: {
    filename: string;
    dirname?: string;
    maxSize?: string;
    maxFiles?: number;
    datePattern?: string;
    zippedArchive?: boolean;
  };
}

export interface ElasticsearchTransportConfig extends TransportConfig {
  type: 'elasticsearch';
  options: {
    node: string | string[];
    index?: string;
    indexPrefix?: string;
    indexSuffixPattern?: string;
    auth?: {
      username: string;
      password: string;
    };
    pipeline?: string;
    flushInterval?: number;
    bulkSize?: number;
  };
}

export interface SamplingConfig {
  enabled: boolean;
  rate: number; // 0.0 to 1.0
  rules?: SamplingRule[];
}

export interface SamplingRule {
  condition: 'level' | 'path' | 'userId' | 'custom';
  value: any;
  rate: number;
}

export interface PerformanceConfig {
  slowRequestThreshold?: number; // ms
  memoryThreshold?: number; // MB
  cpuThreshold?: number; // percentage
  captureStackTrace?: boolean;
}

export interface AlertConfig {
  name: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  cooldown?: number; // seconds
}

export interface AlertCondition {
  type: 'error-rate' | 'response-time' | 'custom';
  threshold: number;
  window: number; // seconds
  comparison: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  config: any;
}