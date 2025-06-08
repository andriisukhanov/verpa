import { Injectable, Logger } from '@nestjs/common';
import { IEventRepository } from '../../domain/repositories/event.repository.interface';
import { IMetricRepository } from '../../domain/repositories/metric.repository.interface';
import { IUserAnalyticsRepository } from '../../domain/repositories/user-analytics.repository.interface';
import { AnalyticsEvent } from '../../domain/entities/event.entity';
import { Metric, MetricType } from '../../domain/entities/metric.entity';
import { UserAnalytics } from '../../domain/entities/user-analytics.entity';
import { TrackEventDto } from '../dto/track-event.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private eventBatch: AnalyticsEvent[] = [];
  private metricBatch: Metric[] = [];
  private batchInterval: NodeJS.Timeout;

  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly metricRepository: IMetricRepository,
    private readonly userAnalyticsRepository: IUserAnalyticsRepository,
    private readonly configService: ConfigService,
  ) {
    this.startBatchProcessor();
  }

  private startBatchProcessor() {
    const flushInterval = this.configService.get<number>('analytics.batch.flushInterval');
    this.batchInterval = setInterval(() => {
      this.flushBatches();
    }, flushInterval);
  }

  async trackEvent(dto: TrackEventDto): Promise<void> {
    const event = AnalyticsEvent.create({
      eventType: dto.eventType,
      eventCategory: dto.eventCategory,
      entityType: dto.entityType,
      entityId: dto.entityId,
      userId: dto.userId,
      properties: dto.properties,
      metadata: dto.metadata,
    });

    this.eventBatch.push(event);

    // Update user analytics
    await this.updateUserAnalytics(dto.userId, event);

    // Track metrics
    this.trackEventMetrics(event);

    // Flush if batch is full
    const batchSize = this.configService.get<number>('analytics.batch.size');
    if (this.eventBatch.length >= batchSize) {
      await this.flushBatches();
    }
  }

  private async updateUserAnalytics(userId: string, event: AnalyticsEvent): Promise<void> {
    try {
      let userAnalytics = await this.userAnalyticsRepository.findByUserId(userId);
      
      if (!userAnalytics) {
        userAnalytics = new UserAnalytics({
          userId,
          firstSeen: new Date(),
          lastSeen: new Date(),
          activity: {
            lastActive: new Date(),
            totalSessions: 1,
            totalEvents: 1,
            averageSessionDuration: 0,
            deviceTypes: event.metadata.platform ? [event.metadata.platform] : [],
            preferredFeatures: [],
          },
          engagement: {
            dailyActiveStreak: 1,
            weeklyActiveStreak: 1,
            totalAquariums: 0,
            totalEvents: 0,
            totalPhotosUploaded: 0,
            lastEngagementDate: new Date(),
          },
          segments: [],
        });
        await this.userAnalyticsRepository.create(userAnalytics);
      } else {
        userAnalytics.updateActivity(event.eventType);
        
        // Update device types
        if (event.metadata.platform && !userAnalytics.activity.deviceTypes.includes(event.metadata.platform)) {
          userAnalytics.activity.deviceTypes.push(event.metadata.platform);
        }

        // Update engagement based on event type
        if (event.entityType === 'aquarium' && event.eventType === 'created') {
          userAnalytics.engagement.totalAquariums++;
        }
        if (event.entityType === 'media' && event.eventType === 'uploaded') {
          userAnalytics.engagement.totalPhotosUploaded++;
        }

        await this.userAnalyticsRepository.update(userId, userAnalytics);
      }
    } catch (error) {
      this.logger.error(`Failed to update user analytics for ${userId}:`, error);
    }
  }

  private trackEventMetrics(event: AnalyticsEvent): void {
    // Track event count metric
    this.metricBatch.push(
      Metric.counter(
        'events.total',
        1,
        {
          event_type: event.eventType,
          category: event.eventCategory,
          entity_type: event.entityType,
        },
      ),
    );

    // Track user activity metric
    this.metricBatch.push(
      Metric.gauge(
        'users.active',
        1,
        {
          user_id: event.userId,
          platform: event.metadata.platform || 'unknown',
        },
      ),
    );
  }

  private async flushBatches(): Promise<void> {
    const eventsToFlush = [...this.eventBatch];
    const metricsToFlush = [...this.metricBatch];
    
    this.eventBatch = [];
    this.metricBatch = [];

    try {
      if (eventsToFlush.length > 0) {
        await this.eventRepository.createBatch(eventsToFlush);
        this.logger.debug(`Flushed ${eventsToFlush.length} events`);
      }

      if (metricsToFlush.length > 0) {
        await this.metricRepository.createBatch(metricsToFlush);
        this.logger.debug(`Flushed ${metricsToFlush.length} metrics`);
      }
    } catch (error) {
      this.logger.error('Failed to flush batches:', error);
      // Re-add failed items to batch
      this.eventBatch.unshift(...eventsToFlush);
      this.metricBatch.unshift(...metricsToFlush);
    }
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    return this.userAnalyticsRepository.findByUserId(userId);
  }

  async getEventHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<AnalyticsEvent[]> {
    return this.eventRepository.findByUserId(userId, {
      startDate,
      endDate,
      limit,
    });
  }

  async getSystemMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>,
  ): Promise<Metric[]> {
    return this.metricRepository.findByName(metricName, startTime, endTime, tags);
  }

  async getActivityStats(startDate: Date, endDate: Date) {
    return this.userAnalyticsRepository.getActivityStats(startDate, endDate);
  }

  async getUserSegments(): Promise<Array<{ segment: string; count: number }>> {
    return this.userAnalyticsRepository.getSegmentCounts();
  }

  async getCohortRetention(cohortDate: Date, periods: number = 12) {
    return this.userAnalyticsRepository.getCohortRetention(cohortDate, periods);
  }

  onModuleDestroy() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.flushBatches(); // Final flush
    }
  }
}