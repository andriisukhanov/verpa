export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export enum AggregationPeriod {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class Metric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
  aggregationPeriod?: AggregationPeriod;
  metadata?: Record<string, any>;

  constructor(partial: Partial<Metric>) {
    Object.assign(this, partial);
    this.timestamp = this.timestamp || new Date();
    this.tags = this.tags || {};
    this.metadata = this.metadata || {};
  }

  static counter(name: string, value: number = 1, tags?: Record<string, string>): Metric {
    return new Metric({
      name,
      type: MetricType.COUNTER,
      value,
      tags,
    });
  }

  static gauge(name: string, value: number, tags?: Record<string, string>): Metric {
    return new Metric({
      name,
      type: MetricType.GAUGE,
      value,
      tags,
    });
  }

  static histogram(name: string, value: number, tags?: Record<string, string>): Metric {
    return new Metric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      tags,
    });
  }
}