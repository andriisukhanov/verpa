import { LogLevel } from '../interfaces/logger.interface';
import { LoggingConfig } from '../interfaces/log-config.interface';

export const createLoggingConfig = (serviceName: string, options?: Partial<LoggingConfig>): LoggingConfig => {
  const isProd = process.env.NODE_ENV === 'production';
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || (isProd ? LogLevel.INFO : LogLevel.DEBUG);

  return {
    serviceName,
    level: logLevel,
    pretty: !isProd,
    timestamp: true,
    colorize: !isProd,
    contextStorage: true,
    redactFields: [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'cookie',
      'creditCard',
      'credit_card',
      'ssn',
      'socialSecurityNumber',
      'social_security_number',
      'privateKey',
      'private_key',
      'secretKey',
      'secret_key',
    ],
    transports: [
      {
        type: 'console',
        enabled: true,
        options: {
          colors: !isProd,
          prettyPrint: !isProd,
          timestamps: true,
        },
      },
      {
        type: 'file',
        enabled: process.env.LOG_TO_FILE !== 'false',
        options: {
          dirname: process.env.LOG_DIR || './logs',
          filename: `${serviceName}-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        },
      },
      {
        type: 'elasticsearch',
        enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
        options: {
          node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
          auth: process.env.ELASTICSEARCH_USER ? {
            username: process.env.ELASTICSEARCH_USER,
            password: process.env.ELASTICSEARCH_PASSWORD || '',
          } : undefined,
          indexPrefix: `logs-${serviceName}`,
          indexSuffixPattern: 'YYYY.MM.DD',
          flushInterval: 2000,
          bulkSize: 100,
        },
      },
    ],
    performance: {
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '500'),
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),
      captureStackTrace: !isProd,
    },
    sampling: isProd ? {
      enabled: true,
      rate: 1.0, // 100% for errors and warnings
      rules: [
        { condition: 'level', value: LogLevel.DEBUG, rate: 0.1 }, // 10% of debug logs
        { condition: 'level', value: LogLevel.VERBOSE, rate: 0.05 }, // 5% of verbose logs
        { condition: 'level', value: LogLevel.SILLY, rate: 0.01 }, // 1% of silly logs
      ],
    } : undefined,
    alerts: process.env.ALERT_WEBHOOK_URL ? [
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
              url: process.env.ALERT_WEBHOOK_URL,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.ALERT_WEBHOOK_TOKEN || '',
              },
            },
          },
        ],
        cooldown: 300,
      },
      {
        name: 'slow-response-time',
        condition: {
          type: 'response-time',
          threshold: 5000, // 5 seconds
          window: 300, // 5 minutes
          comparison: 'gt',
        },
        channels: [
          {
            type: 'webhook',
            config: {
              url: process.env.ALERT_WEBHOOK_URL,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.ALERT_WEBHOOK_TOKEN || '',
              },
            },
          },
        ],
        cooldown: 600,
      },
    ] : [],
    ...options,
  };
};