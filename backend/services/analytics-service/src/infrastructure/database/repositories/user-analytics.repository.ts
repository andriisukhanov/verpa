import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAnalytics as UserAnalyticsSchema, UserAnalyticsDocument } from '../schemas/user-analytics.schema';
import { IUserAnalyticsRepository } from '../../../domain/repositories/user-analytics.repository.interface';
import { UserAnalytics } from '../../../domain/entities/user-analytics.entity';

@Injectable()
export class UserAnalyticsRepository implements IUserAnalyticsRepository {
  constructor(
    @InjectModel(UserAnalyticsSchema.name)
    private userAnalyticsModel: Model<UserAnalyticsDocument>,
  ) {}

  async create(analytics: UserAnalytics): Promise<UserAnalytics> {
    const created = new this.userAnalyticsModel(analytics);
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async update(userId: string, analytics: Partial<UserAnalytics>): Promise<UserAnalytics> {
    const updated = await this.userAnalyticsModel.findOneAndUpdate(
      { userId },
      { $set: analytics },
      { new: true, upsert: true },
    );
    return this.toDomainEntity(updated);
  }

  async findByUserId(userId: string): Promise<UserAnalytics | null> {
    const analytics = await this.userAnalyticsModel.findOne({ userId });
    return analytics ? this.toDomainEntity(analytics) : null;
  }

  async findBySegment(
    segment: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<UserAnalytics[]> {
    const analytics = await this.userAnalyticsModel
      .find({ segments: segment })
      .skip(offset)
      .limit(limit);
    return analytics.map(a => this.toDomainEntity(a));
  }

  async findInactive(daysInactive: number, limit: number): Promise<UserAnalytics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const analytics = await this.userAnalyticsModel
      .find({ 'activity.lastActive': { $lt: cutoffDate } })
      .limit(limit);
    return analytics.map(a => this.toDomainEntity(a));
  }

  async findActive(daysActive: number, limit: number): Promise<UserAnalytics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysActive);

    const analytics = await this.userAnalyticsModel
      .find({ 'activity.lastActive': { $gte: cutoffDate } })
      .limit(limit);
    return analytics.map(a => this.toDomainEntity(a));
  }

  async getSegmentCounts(): Promise<Array<{ segment: string; count: number }>> {
    const result = await this.userAnalyticsModel.aggregate([
      { $unwind: '$segments' },
      {
        $group: {
          _id: '$segments',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return result.map(r => ({
      segment: r._id,
      count: r.count,
    }));
  }

  async getActivityStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  }> {
    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      this.userAnalyticsModel.countDocuments(),
      this.userAnalyticsModel.countDocuments({
        'activity.lastActive': { $gte: startDate, $lte: endDate },
      }),
      this.userAnalyticsModel.countDocuments({
        firstSeen: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const returningUsers = activeUsers - newUsers;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      returningUsers: Math.max(0, returningUsers),
    };
  }

  async getCohortRetention(
    cohortDate: Date,
    periods: number,
  ): Promise<Array<{ period: number; retained: number; total: number }>> {
    const cohortStart = new Date(cohortDate);
    cohortStart.setHours(0, 0, 0, 0);
    const cohortEnd = new Date(cohortDate);
    cohortEnd.setHours(23, 59, 59, 999);

    // Get users in the cohort
    const cohortUsers = await this.userAnalyticsModel
      .find({
        firstSeen: { $gte: cohortStart, $lte: cohortEnd },
      })
      .select('userId');

    const cohortUserIds = cohortUsers.map(u => u.userId);
    const total = cohortUserIds.length;

    const retention: Array<{ period: number; retained: number; total: number }> = [];

    for (let period = 0; period <= periods; period++) {
      const periodStart = new Date(cohortDate);
      periodStart.setDate(periodStart.getDate() + period * 7); // Weekly periods
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);

      const retained = await this.userAnalyticsModel.countDocuments({
        userId: { $in: cohortUserIds },
        'activity.lastActive': { $gte: periodStart, $lt: periodEnd },
      });

      retention.push({
        period,
        retained,
        total,
      });
    }

    return retention;
  }

  private toDomainEntity(doc: UserAnalyticsDocument): UserAnalytics {
    return new UserAnalytics({
      userId: doc.userId,
      firstSeen: doc.firstSeen,
      lastSeen: doc.lastSeen,
      activity: doc.activity,
      engagement: doc.engagement,
      segments: doc.segments,
      customAttributes: doc.customAttributes,
      updatedAt: doc['updatedAt'],
    });
  }
}