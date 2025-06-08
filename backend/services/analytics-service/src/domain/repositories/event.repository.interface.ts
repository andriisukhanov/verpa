import { AnalyticsEvent } from '../entities/event.entity';

export interface IEventRepository {
  create(event: AnalyticsEvent): Promise<AnalyticsEvent>;
  createBatch(events: AnalyticsEvent[]): Promise<void>;
  findById(id: string): Promise<AnalyticsEvent | null>;
  findByUserId(userId: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AnalyticsEvent[]>;
  findByEntityId(entityType: string, entityId: string): Promise<AnalyticsEvent[]>;
  findUnprocessed(limit: number): Promise<AnalyticsEvent[]>;
  markAsProcessed(ids: string[]): Promise<void>;
  deleteOldEvents(beforeDate: Date): Promise<number>;
  
  // Aggregation queries
  countEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;
  
  getEventsByCategory(
    category: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<AnalyticsEvent[]>;
  
  getUserEventCounts(
    userId: string,
    groupBy: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ period: string; count: number }>>;
}