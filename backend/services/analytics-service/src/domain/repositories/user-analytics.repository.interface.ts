import { UserAnalytics } from '../entities/user-analytics.entity';

export interface IUserAnalyticsRepository {
  create(analytics: UserAnalytics): Promise<UserAnalytics>;
  update(userId: string, analytics: Partial<UserAnalytics>): Promise<UserAnalytics>;
  findByUserId(userId: string): Promise<UserAnalytics | null>;
  findBySegment(segment: string, limit?: number, offset?: number): Promise<UserAnalytics[]>;
  
  // Batch operations
  findInactive(daysInactive: number, limit: number): Promise<UserAnalytics[]>;
  findActive(daysActive: number, limit: number): Promise<UserAnalytics[]>;
  
  // Aggregations
  getSegmentCounts(): Promise<Array<{ segment: string; count: number }>>;
  getActivityStats(startDate: Date, endDate: Date): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  }>;
  
  // Cohort analysis
  getCohortRetention(
    cohortDate: Date,
    periods: number,
  ): Promise<Array<{ period: number; retained: number; total: number }>>;
}