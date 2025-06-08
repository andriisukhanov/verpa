import { Metric, AggregationPeriod } from '../entities/metric.entity';

export interface IMetricRepository {
  create(metric: Metric): Promise<Metric>;
  createBatch(metrics: Metric[]): Promise<void>;
  
  // Time-series queries
  findByName(
    name: string,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>,
  ): Promise<Metric[]>;
  
  findByTags(
    tags: Record<string, string>,
    startTime: Date,
    endTime: Date,
  ): Promise<Metric[]>;
  
  // Aggregations
  aggregate(
    name: string,
    period: AggregationPeriod,
    startTime: Date,
    endTime: Date,
    aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count',
    tags?: Record<string, string>,
  ): Promise<Array<{ period: string; value: number }>>;
  
  // Latest values
  getLatestValue(name: string, tags?: Record<string, string>): Promise<Metric | null>;
  
  // Retention
  deleteOldMetrics(beforeDate: Date): Promise<number>;
  
  // Percentiles for histograms
  getPercentiles(
    name: string,
    percentiles: number[],
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>,
  ): Promise<Record<number, number>>;
}