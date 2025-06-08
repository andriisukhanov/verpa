import { IsDateString, IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupByPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for the query' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for the query' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Maximum number of results', default: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class EventQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Filter by event category' })
  @IsString()
  @IsOptional()
  eventCategory?: string;

  @ApiPropertyOptional({ description: 'Filter by entity type' })
  @IsString()
  @IsOptional()
  entityType?: string;
}

export class MetricQueryDto extends AnalyticsQueryDto {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  metricName: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  tags?: Record<string, string>;
}

export class AggregationQueryDto extends MetricQueryDto {
  @ApiProperty({ 
    description: 'Group by period',
    enum: GroupByPeriod,
  })
  @IsEnum(GroupByPeriod)
  groupBy: GroupByPeriod;

  @ApiPropertyOptional({ 
    description: 'Aggregation type',
    default: 'sum',
    enum: ['sum', 'avg', 'min', 'max', 'count'],
  })
  @IsOptional()
  aggregationType?: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum';
}