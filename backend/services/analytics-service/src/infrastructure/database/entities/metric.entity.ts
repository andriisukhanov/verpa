import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';
import { MetricType } from '../../../domain/entities/metric.entity';

@Entity('metrics')
@Index(['name', 'timestamp'])
@Index(['timestamp'])
@Index(['tags'])
export class MetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({
    type: 'enum',
    enum: MetricType,
    default: MetricType.GAUGE,
  })
  type: MetricType;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  value: number;

  @Column({ type: 'jsonb', default: {} })
  tags: Record<string, string>;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column({ nullable: true })
  aggregationPeriod: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}