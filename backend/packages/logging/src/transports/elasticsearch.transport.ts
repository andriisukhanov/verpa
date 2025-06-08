import * as winston from 'winston';
import { ElasticsearchTransport as WinstonElasticsearch } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchTransportConfig } from '../interfaces/log-config.interface';

export function createElasticsearchTransport(config: ElasticsearchTransportConfig['options']): winston.transport {
  const client = new Client({
    node: config.node,
    auth: config.auth,
  });

  const indexPrefix = config.indexPrefix || 'logs';
  const indexSuffixPattern = config.indexSuffixPattern || 'YYYY.MM.DD';

  return new WinstonElasticsearch({
    client,
    index: config.index,
    indexPrefix,
    indexSuffixPattern,
    pipeline: config.pipeline,
    flushInterval: config.flushInterval || 2000,
    buffering: true,
    bufferLimit: config.bulkSize || 100,
    transformer: (logData) => {
      const transformed = {
        '@timestamp': logData.timestamp || new Date().toISOString(),
        severity: logData.level,
        message: logData.message,
        fields: {
          ...logData.meta,
          service: logData.meta?.service,
          module: logData.meta?.module,
          requestId: logData.meta?.requestId,
          correlationId: logData.meta?.correlationId,
          userId: logData.meta?.userId,
          duration: logData.meta?.duration,
          error: logData.meta?.error,
        },
      };

      // Add error details if present
      if (logData.meta?.error) {
        transformed.fields.error = {
          message: logData.meta.error.message,
          stack: logData.meta.error.stack,
          code: logData.meta.error.code,
          type: logData.meta.error.name,
        };
      }

      return transformed;
    },
    ensureIndexTemplate: true,
    indexTemplate: {
      index_patterns: [`${indexPrefix}-*`],
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        'index.refresh_interval': '5s',
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          severity: { type: 'keyword' },
          message: { type: 'text' },
          fields: {
            properties: {
              service: { type: 'keyword' },
              module: { type: 'keyword' },
              requestId: { type: 'keyword' },
              correlationId: { type: 'keyword' },
              userId: { type: 'keyword' },
              duration: { type: 'long' },
              error: {
                properties: {
                  message: { type: 'text' },
                  stack: { type: 'text' },
                  code: { type: 'keyword' },
                  type: { type: 'keyword' },
                },
              },
            },
          },
        },
      },
    },
  });
}