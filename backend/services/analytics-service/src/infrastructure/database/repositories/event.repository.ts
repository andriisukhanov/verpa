import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { IEventRepository } from '../../../domain/repositories/event.repository.interface';
import { AnalyticsEvent } from '../../../domain/entities/event.entity';

@Injectable()
export class EventRepository implements IEventRepository {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const created = new this.eventModel(event);
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async createBatch(events: AnalyticsEvent[]): Promise<void> {
    await this.eventModel.insertMany(events);
  }

  async findById(id: string): Promise<AnalyticsEvent | null> {
    const event = await this.eventModel.findById(id);
    return event ? this.toDomainEntity(event) : null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<AnalyticsEvent[]> {
    const query = this.eventModel.find({ userId });

    if (options?.startDate || options?.endDate) {
      const dateFilter: any = {};
      if (options.startDate) dateFilter.$gte = options.startDate;
      if (options.endDate) dateFilter.$lte = options.endDate;
      query.where('timestamp').equals(dateFilter);
    }

    if (options?.offset) query.skip(options.offset);
    if (options?.limit) query.limit(options.limit);

    query.sort({ timestamp: -1 });

    const events = await query.exec();
    return events.map(e => this.toDomainEntity(e));
  }

  async findByEntityId(entityType: string, entityId: string): Promise<AnalyticsEvent[]> {
    const events = await this.eventModel
      .find({ entityType, entityId })
      .sort({ timestamp: -1 });
    return events.map(e => this.toDomainEntity(e));
  }

  async findUnprocessed(limit: number): Promise<AnalyticsEvent[]> {
    const events = await this.eventModel
      .find({ processed: false })
      .limit(limit)
      .sort({ createdAt: 1 });
    return events.map(e => this.toDomainEntity(e));
  }

  async markAsProcessed(ids: string[]): Promise<void> {
    await this.eventModel.updateMany(
      { _id: { $in: ids } },
      { $set: { processed: true } },
    );
  }

  async deleteOldEvents(beforeDate: Date): Promise<number> {
    const result = await this.eventModel.deleteMany({
      createdAt: { $lt: beforeDate },
    });
    return result.deletedCount || 0;
  }

  async countEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.eventModel.countDocuments({
      eventType,
      timestamp: { $gte: startDate, $lte: endDate },
    });
  }

  async getEventsByCategory(
    category: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<AnalyticsEvent[]> {
    const events = await this.eventModel
      .find({
        eventCategory: category,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .limit(limit)
      .sort({ timestamp: -1 });
    return events.map(e => this.toDomainEntity(e));
  }

  async getUserEventCounts(
    userId: string,
    groupBy: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ period: string; count: number }>> {
    const dateFormat = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m',
    };

    const result = await this.eventModel.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat[groupBy],
              date: '$timestamp',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return result.map(r => ({
      period: r._id,
      count: r.count,
    }));
  }

  private toDomainEntity(doc: EventDocument): AnalyticsEvent {
    return new AnalyticsEvent({
      id: doc._id.toString(),
      eventType: doc.eventType,
      eventCategory: doc.eventCategory,
      entityType: doc.entityType,
      entityId: doc.entityId,
      userId: doc.userId,
      timestamp: doc.timestamp,
      properties: doc.properties,
      metadata: doc.metadata,
      processed: doc.processed,
      createdAt: doc['createdAt'],
    });
  }
}