import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event } from '../../../domain/entities/event.entity';
import { Reminder } from '../../../domain/entities/reminder.entity';
import { IEventRepository, FindEventsOptions } from '../../../domain/repositories/event.repository.interface';
import { Event as EventSchema, EventDocument } from '../schemas/event.schema';
import { EventStatus } from '@verpa/common';

@Injectable()
export class EventRepository implements IEventRepository {
  constructor(
    @InjectModel(EventSchema.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(event: Event): Promise<Event> {
    const created = new this.eventModel(this.toDocument(event));
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async findById(id: string): Promise<Event | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.eventModel.findById(id).exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Event | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.eventModel
      .findOne({ _id: id, userId })
      .exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findByAquariumId(aquariumId: string, options?: FindEventsOptions): Promise<Event[]> {
    const query = this.buildQuery({ ...options, aquariumId });
    const sort = this.buildSort(options);
    const skip = this.calculateSkip(options);
    const limit = options?.limit || 20;

    const docs = await this.eventModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return docs.map(doc => this.toDomainEntity(doc));
  }

  async findByUserId(userId: string, options?: FindEventsOptions): Promise<Event[]> {
    const query = this.buildQuery({ ...options, userId });
    const sort = this.buildSort(options);
    const skip = this.calculateSkip(options);
    const limit = options?.limit || 20;

    const docs = await this.eventModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return docs.map(doc => this.toDomainEntity(doc));
  }

  async findUpcoming(userId: string, days: number = 7): Promise<Event[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const query: any = {
      userId,
      status: EventStatus.SCHEDULED,
      scheduledDate: {
        $gte: now,
        $lte: endDate,
      },
    };

    const docs = await this.eventModel
      .find(query)
      .sort({ scheduledDate: 1 })
      .exec();

    return docs.map(doc => this.toDomainEntity(doc));
  }

  async findOverdue(userId: string): Promise<Event[]> {
    const now = new Date();
    const query: any = {
      status: EventStatus.SCHEDULED,
      scheduledDate: { $lt: now },
    };

    if (userId) {
      query.userId = userId;
    }

    const docs = await this.eventModel
      .find(query)
      .sort({ scheduledDate: 1 })
      .exec();

    return docs.map(doc => this.toDomainEntity(doc));
  }

  async findDueReminders(timeWindow: number = 60): Promise<Event[]> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + timeWindow * 60 * 1000);

    const query: any = {
      status: EventStatus.SCHEDULED,
      'reminders.sent': false,
      scheduledDate: { $gte: now },
    };

    const docs = await this.eventModel.find(query).exec();

    // Filter events with reminders that should be sent
    const eventsWithDueReminders = docs.filter(doc => {
      const event = this.toDomainEntity(doc);
      return event.reminders.some(reminder => 
        reminder.shouldSend(event.scheduledDate)
      );
    });

    return eventsWithDueReminders.map(doc => this.toDomainEntity(doc));
  }

  async update(event: Event): Promise<Event> {
    const updateData = this.toDocument(event);
    delete updateData._id;

    const updated = await this.eventModel
      .findByIdAndUpdate(
        event.id,
        updateData,
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new Error('Event not found');
    }

    return this.toDomainEntity(updated);
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.eventModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async countByUserId(userId: string, status?: EventStatus): Promise<number> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }
    return this.eventModel.countDocuments(query).exec();
  }

  async countByAquariumId(aquariumId: string, status?: EventStatus): Promise<number> {
    const query: any = { aquariumId };
    if (status) {
      query.status = status;
    }
    return this.eventModel.countDocuments(query).exec();
  }

  private buildQuery(options?: FindEventsOptions & { userId?: string; aquariumId?: string }): any {
    const query: any = {};

    if (options?.userId) query.userId = options.userId;
    if (options?.aquariumId) query.aquariumId = options.aquariumId;
    if (options?.type) query.type = options.type;
    if (options?.status) query.status = options.status;
    if (options?.recurring !== undefined) query.recurring = options.recurring;

    if (options?.startDate || options?.endDate) {
      query.scheduledDate = {};
      if (options.startDate) {
        query.scheduledDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.scheduledDate.$lte = new Date(options.endDate);
      }
    }

    return query;
  }

  private buildSort(options?: FindEventsOptions): any {
    const sortBy = options?.sortBy || 'scheduledDate';
    const sortOrder = options?.sortOrder === 'desc' ? -1 : 1;
    return { [sortBy]: sortOrder };
  }

  private calculateSkip(options?: FindEventsOptions): number {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    return (page - 1) * limit;
  }

  private toDocument(event: Event): any {
    return {
      _id: event.id ? new Types.ObjectId(event.id) : undefined,
      aquariumId: event.aquariumId,
      userId: event.userId,
      type: event.type,
      title: event.title,
      description: event.description,
      scheduledDate: event.scheduledDate,
      duration: event.duration,
      recurring: event.recurring,
      recurrencePattern: event.recurrencePattern,
      recurrenceEndDate: event.recurrenceEndDate,
      reminders: event.reminders.map(reminder => ({
        id: reminder.id,
        type: reminder.type,
        timeBefore: reminder.timeBefore,
        sent: reminder.sent,
        sentAt: reminder.sentAt,
        error: reminder.error,
        createdAt: reminder.createdAt,
      })),
      status: event.status,
      completedAt: event.completedAt,
      completedBy: event.completedBy,
      notes: event.notes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private toDomainEntity(doc: EventDocument): Event {
    const obj = doc.toJSON();

    const reminders = obj.reminders?.map((r: any) => new Reminder({
      id: r.id,
      type: r.type,
      timeBefore: r.timeBefore,
      sent: r.sent,
      sentAt: r.sentAt,
      error: r.error,
      createdAt: r.createdAt,
    })) || [];

    return new Event({
      id: obj.id || obj._id.toString(),
      aquariumId: obj.aquariumId,
      userId: obj.userId,
      type: obj.type,
      title: obj.title,
      description: obj.description,
      scheduledDate: obj.scheduledDate,
      duration: obj.duration,
      recurring: obj.recurring,
      recurrencePattern: obj.recurrencePattern,
      recurrenceEndDate: obj.recurrenceEndDate,
      reminders,
      status: obj.status,
      completedAt: obj.completedAt,
      completedBy: obj.completedBy,
      notes: obj.notes,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    });
  }
}