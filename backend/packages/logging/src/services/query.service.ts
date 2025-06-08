import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { LogEntry, QueryOptions } from '../interfaces/logger.interface';
import { LOGGING_CONFIG } from '../utils/constants';
import { LoggingConfig } from '../interfaces/log-config.interface';

@Injectable()
export class QueryService {
  private elasticsearchClient?: Client;

  constructor(@Inject(LOGGING_CONFIG) private readonly config: LoggingConfig) {
    this.initializeElasticsearch();
  }

  private initializeElasticsearch(): void {
    const esTransport = this.config.transports?.find(t => t.type === 'elasticsearch');
    if (esTransport?.enabled && esTransport.options) {
      this.elasticsearchClient = new Client({
        node: esTransport.options.node,
        auth: esTransport.options.auth,
      });
    }
  }

  async query(options: QueryOptions): Promise<LogEntry[]> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch transport not configured');
    }

    const must: any[] = [];
    const filter: any[] = [];

    // Time range filter
    if (options.from || options.to) {
      filter.push({
        range: {
          timestamp: {
            ...(options.from && { gte: options.from.toISOString() }),
            ...(options.to && { lte: options.to.toISOString() }),
          },
        },
      });
    }

    // Level filter
    if (options.level) {
      must.push({ term: { level: options.level } });
    }

    // Service filter
    if (options.service) {
      must.push({ term: { 'metadata.service': options.service } });
    }

    // User ID filter
    if (options.userId) {
      must.push({ term: { 'metadata.userId': options.userId } });
    }

    // Request ID filter
    if (options.requestId) {
      must.push({ term: { 'metadata.requestId': options.requestId } });
    }

    // Full-text search
    if (options.search) {
      must.push({
        multi_match: {
          query: options.search,
          fields: ['message', 'metadata.*'],
        },
      });
    }

    const esTransport = this.config.transports?.find(t => t.type === 'elasticsearch');
    const indexPattern = esTransport?.options?.indexPrefix || 'logs';

    try {
      const response = await this.elasticsearchClient.search({
        index: `${indexPattern}-*`,
        body: {
          query: {
            bool: {
              must,
              filter,
            },
          },
          sort: [{ timestamp: { order: 'desc' } }],
          size: options.limit || 100,
          from: options.offset || 0,
        },
      });

      return response.hits.hits.map((hit: any) => ({
        level: hit._source.level,
        message: hit._source.message,
        timestamp: new Date(hit._source.timestamp),
        metadata: hit._source.metadata || {},
      }));
    } catch (error) {
      throw new Error(`Failed to query logs: ${error.message}`);
    }
  }

  async getStats(timeRange: { from: Date; to: Date }): Promise<any> {
    if (!this.elasticsearchClient) {
      throw new Error('Elasticsearch transport not configured');
    }

    const esTransport = this.config.transports?.find(t => t.type === 'elasticsearch');
    const indexPattern = esTransport?.options?.indexPrefix || 'logs';

    try {
      const response = await this.elasticsearchClient.search({
        index: `${indexPattern}-*`,
        body: {
          query: {
            range: {
              timestamp: {
                gte: timeRange.from.toISOString(),
                lte: timeRange.to.toISOString(),
              },
            },
          },
          aggs: {
            levels: {
              terms: { field: 'level' },
            },
            services: {
              terms: { field: 'metadata.service' },
            },
            errors_over_time: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'hour',
              },
              aggs: {
                error_count: {
                  filter: { term: { level: 'error' } },
                },
              },
            },
            top_errors: {
              filter: { term: { level: 'error' } },
              aggs: {
                messages: {
                  terms: { field: 'message.keyword', size: 10 },
                },
              },
            },
          },
          size: 0,
        },
      });

      return response.aggregations;
    } catch (error) {
      throw new Error(`Failed to get log stats: ${error.message}`);
    }
  }
}