import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { MetricEntity } from '../entities/metric.entity';
import { IMetricRepository } from '../../../domain/repositories/metric.repository.interface';
import { Metric, AggregationPeriod } from '../../../domain/entities/metric.entity';

@Injectable()
export class MetricRepository implements IMetricRepository {
  constructor(
    @InjectRepository(MetricEntity)
    private metricRepository: Repository<MetricEntity>,
  ) {}

  async create(metric: Metric): Promise<Metric> {
    const entity = this.metricRepository.create({
      name: metric.name,
      type: metric.type,
      value: metric.value,
      tags: metric.tags,
      timestamp: metric.timestamp,
      aggregationPeriod: metric.aggregationPeriod,
      metadata: metric.metadata,
    });
    const saved = await this.metricRepository.save(entity);
    return this.toDomainEntity(saved);
  }

  async createBatch(metrics: Metric[]): Promise<void> {
    const entities = metrics.map(metric =>
      this.metricRepository.create({
        name: metric.name,
        type: metric.type,
        value: metric.value,
        tags: metric.tags,
        timestamp: metric.timestamp,
        aggregationPeriod: metric.aggregationPeriod,
        metadata: metric.metadata,
      }),
    );
    await this.metricRepository.save(entities);
  }

  async findByName(
    name: string,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>,
  ): Promise<Metric[]> {
    const query = this.metricRepository
      .createQueryBuilder('metric')
      .where('metric.name = :name', { name })
      .andWhere('metric.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });

    if (tags) {
      query.andWhere('metric.tags @> :tags', { tags });
    }

    query.orderBy('metric.timestamp', 'ASC');

    const entities = await query.getMany();
    return entities.map(e => this.toDomainEntity(e));
  }

  async findByTags(
    tags: Record<string, string>,
    startTime: Date,
    endTime: Date,
  ): Promise<Metric[]> {
    const entities = await this.metricRepository
      .createQueryBuilder('metric')
      .where('metric.tags @> :tags', { tags })
      .andWhere('metric.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .orderBy('metric.timestamp', 'ASC')
      .getMany();

    return entities.map(e => this.toDomainEntity(e));
  }

  async aggregate(
    name: string,
    period: AggregationPeriod,
    startTime: Date,
    endTime: Date,
    aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count',
    tags?: Record<string, string>,
  ): Promise<Array<{ period: string; value: number }>> {
    const periodFormat = {
      [AggregationPeriod.MINUTE]: 'YYYY-MM-DD HH24:MI',
      [AggregationPeriod.HOUR]: 'YYYY-MM-DD HH24',
      [AggregationPeriod.DAY]: 'YYYY-MM-DD',
      [AggregationPeriod.WEEK]: 'IYYY-IW',
      [AggregationPeriod.MONTH]: 'YYYY-MM',
    };

    let query = this.metricRepository
      .createQueryBuilder('metric')
      .select(`to_char(metric.timestamp, '${periodFormat[period]}')`, 'period')
      .addSelect(`${aggregationType.toUpperCase()}(metric.value)`, 'value')
      .where('metric.name = :name', { name })
      .andWhere('metric.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });

    if (tags) {
      query.andWhere('metric.tags @> :tags', { tags });
    }

    query
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await query.getRawMany();
    return results.map(r => ({
      period: r.period,
      value: parseFloat(r.value),
    }));
  }

  async getLatestValue(name: string, tags?: Record<string, string>): Promise<Metric | null> {
    const query = this.metricRepository
      .createQueryBuilder('metric')
      .where('metric.name = :name', { name });

    if (tags) {
      query.andWhere('metric.tags @> :tags', { tags });
    }

    query.orderBy('metric.timestamp', 'DESC').limit(1);

    const entity = await query.getOne();
    return entity ? this.toDomainEntity(entity) : null;
  }

  async deleteOldMetrics(beforeDate: Date): Promise<number> {
    const result = await this.metricRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :beforeDate', { beforeDate })
      .execute();

    return result.affected || 0;
  }

  async getPercentiles(
    name: string,
    percentiles: number[],
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>,
  ): Promise<Record<number, number>> {
    let query = this.metricRepository
      .createQueryBuilder('metric')
      .select('metric.value')
      .where('metric.name = :name', { name })
      .andWhere('metric.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });

    if (tags) {
      query.andWhere('metric.tags @> :tags', { tags });
    }

    query.orderBy('metric.value', 'ASC');

    const values = await query.getMany();
    const sortedValues = values.map(v => v.value).sort((a, b) => a - b);

    const result: Record<number, number> = {};
    for (const percentile of percentiles) {
      const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
      result[percentile] = sortedValues[Math.max(0, index)] || 0;
    }

    return result;
  }

  private toDomainEntity(entity: MetricEntity): Metric {
    return new Metric({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      value: Number(entity.value),
      tags: entity.tags,
      timestamp: entity.timestamp,
      aggregationPeriod: entity.aggregationPeriod as AggregationPeriod,
      metadata: entity.metadata,
    });
  }
}