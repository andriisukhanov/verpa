import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { EventRepository } from './event.repository';
import { Event as EventSchema, EventDocument } from '../schemas/event.schema';
import { Event } from '../../../domain/entities/event.entity';
import { Reminder } from '../../../domain/entities/reminder.entity';
import { EventType, EventStatus, NotificationType } from '@verpa/common';

describe('EventRepository', () => {
  let repository: EventRepository;
  let eventModel: Model<EventDocument>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: EventSchema.name, schema: EventSchema },
        ]),
      ],
      providers: [EventRepository],
    }).compile();

    repository = module.get<EventRepository>(EventRepository);
    eventModel = module.get<Model<EventDocument>>(getModelToken(EventSchema.name));
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    await eventModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const event = new Event({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Weekly Water Change',
        scheduledDate: new Date('2024-02-01T10:00:00'),
        description: 'Change 25% of water',
      });

      const result = await repository.create(event);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Weekly Water Change');
      expect(result.type).toBe(EventType.WATER_CHANGE);
      expect(result.status).toBe(EventStatus.SCHEDULED);
    });

    it('should create event with reminders', async () => {
      const reminder = new Reminder({
        type: NotificationType.EMAIL,
        timeBefore: 60,
      });

      const event = new Event({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.FEEDING,
        title: 'Morning Feeding',
        scheduledDate: new Date('2024-02-01T08:00:00'),
        reminders: [reminder],
      });

      const result = await repository.create(event);

      expect(result.reminders).toHaveLength(1);
      expect(result.reminders[0].type).toBe(NotificationType.EMAIL);
      expect(result.reminders[0].timeBefore).toBe(60);
    });

    it('should create recurring event', async () => {
      const event = new Event({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Weekly Water Change',
        scheduledDate: new Date('2024-02-01T10:00:00'),
        recurring: true,
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
        },
        recurrenceEndDate: new Date('2024-12-31T23:59:59'),
      });

      const result = await repository.create(event);

      expect(result.recurring).toBe(true);
      expect(result.recurrencePattern).toBeDefined();
      expect(result.recurrencePattern?.frequency).toBe('weekly');
      expect(result.recurrenceEndDate).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find event by id', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
      });

      const result = await repository.findById(created._id.toString());

      expect(result).toBeDefined();
      expect(result?.id).toBe(created._id.toString());
      expect(result?.title).toBe('Test Event');
    });

    it('should return null for non-existent id', async () => {
      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should return null for invalid id', async () => {
      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find event by id and userId', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
      });

      const result = await repository.findByIdAndUserId(
        created._id.toString(),
        'user123'
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(created._id.toString());
    });

    it('should return null for wrong userId', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
      });

      const result = await repository.findByIdAndUserId(
        created._id.toString(),
        'wronguser'
      );

      expect(result).toBeNull();
    });
  });

  describe('findByAquariumId', () => {
    it('should find all events for an aquarium', async () => {
      const aquariumId = 'aquarium123';
      await eventModel.create([
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'Water Change',
          scheduledDate: new Date('2024-02-01'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId,
          type: EventType.FEEDING,
          title: 'Morning Feed',
          scheduledDate: new Date('2024-02-02'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'other-aquarium',
          type: EventType.MAINTENANCE,
          title: 'Filter Clean',
          scheduledDate: new Date('2024-02-03'),
          status: EventStatus.SCHEDULED,
        },
      ]);

      const result = await repository.findByAquariumId(aquariumId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Water Change');
      expect(result[1].title).toBe('Morning Feed');
    });

    it('should filter by event type', async () => {
      const aquariumId = 'aquarium123';
      await eventModel.create([
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'Water Change 1',
          scheduledDate: new Date('2024-02-01'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'Water Change 2',
          scheduledDate: new Date('2024-02-08'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId,
          type: EventType.FEEDING,
          title: 'Feed Fish',
          scheduledDate: new Date('2024-02-02'),
          status: EventStatus.SCHEDULED,
        },
      ]);

      const result = await repository.findByAquariumId(aquariumId, {
        type: EventType.WATER_CHANGE,
      });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.type === EventType.WATER_CHANGE)).toBe(true);
    });

    it('should filter by date range', async () => {
      const aquariumId = 'aquarium123';
      await eventModel.create([
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'January Event',
          scheduledDate: new Date('2024-01-15'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'February Event',
          scheduledDate: new Date('2024-02-15'),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: 'March Event',
          scheduledDate: new Date('2024-03-15'),
          status: EventStatus.SCHEDULED,
        },
      ]);

      const result = await repository.findByAquariumId(aquariumId, {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('February Event');
    });

    it('should handle pagination', async () => {
      const aquariumId = 'aquarium123';
      const events = [];
      for (let i = 0; i < 15; i++) {
        events.push({
          userId: 'user123',
          aquariumId,
          type: EventType.WATER_CHANGE,
          title: `Event ${i}`,
          scheduledDate: new Date(`2024-02-${i + 1}`),
          status: EventStatus.SCHEDULED,
        });
      }
      await eventModel.create(events);

      const page1 = await repository.findByAquariumId(aquariumId, { page: 1, limit: 10 });
      const page2 = await repository.findByAquariumId(aquariumId, { page: 2, limit: 10 });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });
  });

  describe('findUpcoming', () => {
    it('should find upcoming events within specified days', async () => {
      const userId = 'user123';
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(now);
      nextMonth.setDate(nextMonth.getDate() + 30);

      await eventModel.create([
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Tomorrow Event',
          scheduledDate: tomorrow,
          status: EventStatus.SCHEDULED,
        },
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.FEEDING,
          title: 'Next Week Event',
          scheduledDate: nextWeek,
          status: EventStatus.SCHEDULED,
        },
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.MAINTENANCE,
          title: 'Next Month Event',
          scheduledDate: nextMonth,
          status: EventStatus.SCHEDULED,
        },
      ]);

      const result = await repository.findUpcoming(userId, 7);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Tomorrow Event');
      expect(result[1].title).toBe('Next Week Event');
    });

    it('should not include past or completed events', async () => {
      const userId = 'user123';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await eventModel.create([
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Past Event',
          scheduledDate: yesterday,
          status: EventStatus.SCHEDULED,
        },
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.FEEDING,
          title: 'Completed Event',
          scheduledDate: tomorrow,
          status: EventStatus.COMPLETED,
        },
        {
          userId,
          aquariumId: 'aquarium123',
          type: EventType.MAINTENANCE,
          title: 'Future Event',
          scheduledDate: tomorrow,
          status: EventStatus.SCHEDULED,
        },
      ]);

      const result = await repository.findUpcoming(userId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Future Event');
    });
  });

  describe('findOverdue', () => {
    it('should find overdue events', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await eventModel.create([
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Yesterday Event',
          scheduledDate: yesterday,
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.FEEDING,
          title: 'Last Week Event',
          scheduledDate: lastWeek,
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.MAINTENANCE,
          title: 'Future Event',
          scheduledDate: tomorrow,
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Completed Past Event',
          scheduledDate: yesterday,
          status: EventStatus.COMPLETED,
        },
      ]);

      const result = await repository.findOverdue('user123');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Last Week Event');
      expect(result[1].title).toBe('Yesterday Event');
    });
  });

  describe('findDueReminders', () => {
    it('should find events with due reminders', async () => {
      const inThirtyMinutes = new Date();
      inThirtyMinutes.setMinutes(inThirtyMinutes.getMinutes() + 30);
      const inTwoHours = new Date();
      inTwoHours.setHours(inTwoHours.getHours() + 2);

      await eventModel.create([
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Event Soon',
          scheduledDate: inThirtyMinutes,
          status: EventStatus.SCHEDULED,
          reminders: [{
            id: 'reminder1',
            type: NotificationType.EMAIL,
            timeBefore: 60, // Remind 1 hour before
            sent: false,
            createdAt: new Date(),
          }],
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.FEEDING,
          title: 'Event Later',
          scheduledDate: inTwoHours,
          status: EventStatus.SCHEDULED,
          reminders: [{
            id: 'reminder2',
            type: NotificationType.EMAIL,
            timeBefore: 60, // Remind 1 hour before
            sent: false,
            createdAt: new Date(),
          }],
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.MAINTENANCE,
          title: 'Event With Sent Reminder',
          scheduledDate: inThirtyMinutes,
          status: EventStatus.SCHEDULED,
          reminders: [{
            id: 'reminder3',
            type: NotificationType.EMAIL,
            timeBefore: 60,
            sent: true,
            sentAt: new Date(),
            createdAt: new Date(),
          }],
        },
      ]);

      const result = await repository.findDueReminders();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Event Soon');
    });
  });

  describe('update', () => {
    it('should update event', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Original Title',
        scheduledDate: new Date('2024-02-01'),
        status: EventStatus.SCHEDULED,
      });

      const event = await repository.findById(created._id.toString());
      if (!event) throw new Error('Event not found');

      event.title = 'Updated Title';
      event.notes = 'Added notes';
      event.updatedAt = new Date();

      const result = await repository.update(event);

      expect(result.title).toBe('Updated Title');
      expect(result.notes).toBe('Added notes');

      // Verify in database
      const dbRecord = await eventModel.findById(created._id);
      expect(dbRecord?.title).toBe('Updated Title');
    });

    it('should update event status', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
      });

      const event = await repository.findById(created._id.toString());
      if (!event) throw new Error('Event not found');

      event.complete('user123', 'Completed successfully');

      const result = await repository.update(event);

      expect(result.status).toBe(EventStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(result.completedBy).toBe('user123');
      expect(result.notes).toBe('Completed successfully');
    });

    it('should update reminders', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
        reminders: [{
          id: 'reminder1',
          type: NotificationType.EMAIL,
          timeBefore: 60,
          sent: false,
          createdAt: new Date(),
        }],
      });

      const event = await repository.findById(created._id.toString());
      if (!event) throw new Error('Event not found');

      event.reminders[0].markAsSent();

      const result = await repository.update(event);

      expect(result.reminders[0].sent).toBe(true);
      expect(result.reminders[0].sentAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete event', async () => {
      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
      });

      const result = await repository.delete(created._id.toString());

      expect(result).toBe(true);

      const dbRecord = await eventModel.findById(created._id);
      expect(dbRecord).toBeNull();
    });

    it('should return false for non-existent event', async () => {
      const result = await repository.delete('507f1f77bcf86cd799439011');

      expect(result).toBe(false);
    });
  });

  describe('count methods', () => {
    beforeEach(async () => {
      await eventModel.create([
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Scheduled Event 1',
          scheduledDate: new Date(),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.FEEDING,
          title: 'Scheduled Event 2',
          scheduledDate: new Date(),
          status: EventStatus.SCHEDULED,
        },
        {
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.MAINTENANCE,
          title: 'Completed Event',
          scheduledDate: new Date(),
          status: EventStatus.COMPLETED,
        },
        {
          userId: 'user456',
          aquariumId: 'aquarium456',
          type: EventType.WATER_CHANGE,
          title: 'Other User Event',
          scheduledDate: new Date(),
          status: EventStatus.SCHEDULED,
        },
      ]);
    });

    it('should count events by userId', async () => {
      const count = await repository.countByUserId('user123');
      expect(count).toBe(3);
    });

    it('should count events by userId and status', async () => {
      const scheduledCount = await repository.countByUserId('user123', EventStatus.SCHEDULED);
      const completedCount = await repository.countByUserId('user123', EventStatus.COMPLETED);

      expect(scheduledCount).toBe(2);
      expect(completedCount).toBe(1);
    });

    it('should count events by aquariumId', async () => {
      const count = await repository.countByAquariumId('aquarium123');
      expect(count).toBe(3);
    });

    it('should count events by aquariumId and status', async () => {
      const scheduledCount = await repository.countByAquariumId('aquarium123', EventStatus.SCHEDULED);
      expect(scheduledCount).toBe(2);
    });
  });

  describe('domain entity mapping', () => {
    it('should correctly map reminders', async () => {
      const reminders = [
        {
          id: 'reminder1',
          type: NotificationType.EMAIL,
          timeBefore: 60,
          sent: true,
          sentAt: new Date('2024-02-01T09:00:00'),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'reminder2',
          type: NotificationType.PUSH,
          timeBefore: 15,
          sent: false,
          error: 'Failed to send',
          createdAt: new Date('2024-01-01'),
        },
      ];

      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
        reminders,
      });

      const result = await repository.findById(created._id.toString());

      expect(result?.reminders).toHaveLength(2);
      expect(result?.reminders[0].id).toBe('reminder1');
      expect(result?.reminders[0].sent).toBe(true);
      expect(result?.reminders[0].sentAt).toEqual(new Date('2024-02-01T09:00:00'));
      expect(result?.reminders[1].error).toBe('Failed to send');
    });

    it('should correctly map recurrence pattern', async () => {
      const recurrencePattern = {
        frequency: 'weekly' as const,
        interval: 2,
        daysOfWeek: [1, 3, 5],
      };

      const created = await eventModel.create({
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Recurring Event',
        scheduledDate: new Date(),
        status: EventStatus.SCHEDULED,
        recurring: true,
        recurrencePattern,
        recurrenceEndDate: new Date('2024-12-31'),
      });

      const result = await repository.findById(created._id.toString());

      expect(result?.recurring).toBe(true);
      expect(result?.recurrencePattern).toEqual(recurrencePattern);
      expect(result?.recurrenceEndDate).toEqual(new Date('2024-12-31'));
    });
  });
});