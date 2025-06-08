import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventDomainService } from './event.domain.service';
import { IEventRepository } from '../repositories/event.repository.interface';
import { Event } from '../entities/event.entity';
import { Reminder } from '../entities/reminder.entity';
import { EventType, EventStatus, SubscriptionType, NotificationType } from '@verpa/common';

describe('EventDomainService', () => {
  let service: EventDomainService;
  let eventRepository: jest.Mocked<IEventRepository>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEventRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUserId: jest.fn(),
    findByAquariumId: jest.fn(),
    findByUserId: jest.fn(),
    findUpcoming: jest.fn(),
    findOverdue: jest.fn(),
    findDueReminders: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByUserId: jest.fn(),
    countByAquariumId: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventDomainService,
          useFactory: (repo, config, events) => 
            new EventDomainService(repo, config, events),
          inject: ['IEventRepository', ConfigService, EventEmitter2],
        },
        {
          provide: 'IEventRepository',
          useValue: mockEventRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<EventDomainService>(EventDomainService);
    eventRepository = module.get('IEventRepository');
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config: any = {
        'limits.eventsPerAquarium': {
          basic: 50,
          premium: -1,
          professional: -1,
        },
        'limits.remindersPerEvent': {
          basic: 1,
          premium: 5,
          professional: -1,
        },
      };
      return config[key];
    });

    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    const userId = 'user123';
    const aquariumId = 'aquarium123';
    const eventData = {
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

    it('should create event successfully', async () => {
      mockEventRepository.countByAquariumId.mockResolvedValue(0);
      mockEventRepository.create.mockResolvedValue(
        new Event({ id: 'event123', ...eventData, userId, aquariumId })
      );

      const result = await service.createEvent(userId, aquariumId, eventData, SubscriptionType.BASIC);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.aquariumId).toBe(aquariumId);
      expect(result.title).toBe(eventData.title);
      expect(eventRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.created', expect.any(Object));
    });

    it('should add default reminders', async () => {
      mockEventRepository.countByAquariumId.mockResolvedValue(0);
      mockEventRepository.create.mockImplementation(event => Promise.resolve(event));

      const result = await service.createEvent(userId, aquariumId, eventData, SubscriptionType.PREMIUM);

      expect(result.reminders).toHaveLength(2); // Email + Push for water change
      expect(result.reminders[0].type).toBe(NotificationType.EMAIL);
      expect(result.reminders[1].type).toBe(NotificationType.PUSH);
    });

    it('should throw error when limit reached for basic subscription', async () => {
      mockEventRepository.countByAquariumId.mockResolvedValue(50);

      await expect(
        service.createEvent(userId, aquariumId, eventData, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow unlimited events for professional subscription', async () => {
      mockEventRepository.countByAquariumId.mockResolvedValue(1000);
      mockEventRepository.create.mockResolvedValue(
        new Event({ id: 'event123', ...eventData, userId, aquariumId })
      );

      const result = await service.createEvent(userId, aquariumId, eventData, SubscriptionType.PROFESSIONAL);
      expect(result).toBeDefined();
    });

    it('should throw error for invalid event data', async () => {
      mockEventRepository.countByAquariumId.mockResolvedValue(0);

      await expect(
        service.createEvent(userId, aquariumId, { ...eventData, title: '' }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createEvent(userId, aquariumId, { ...eventData, type: undefined }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await expect(
        service.createEvent(userId, aquariumId, { ...eventData, scheduledDate: pastDate }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEvent', () => {
    const eventId = 'event123';
    const userId = 'user123';
    const existingEvent = new Event({
      id: eventId,
      userId,
      aquariumId: 'aquarium123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: EventStatus.SCHEDULED,
    });

    it('should update event successfully', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(
        new Event({ ...existingEvent, title: 'Updated Water Change' })
      );

      const result = await service.updateEvent(eventId, userId, { title: 'Updated Water Change' });

      expect(result.title).toBe('Updated Water Change');
      expect(eventRepository.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.updated', expect.any(Object));
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.updateEvent(eventId, userId, { title: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow updating completed events', async () => {
      const completedEvent = new Event({ ...existingEvent, status: EventStatus.COMPLETED });
      mockEventRepository.findByIdAndUserId.mockResolvedValue(completedEvent);

      await expect(
        service.updateEvent(eventId, userId, { title: 'Updated' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate scheduled date updates', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(existingEvent);

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await expect(
        service.updateEvent(eventId, userId, { scheduledDate: pastDate })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeEvent', () => {
    const eventId = 'event123';
    const userId = 'user123';
    const scheduledEvent = new Event({
      id: eventId,
      userId,
      aquariumId: 'aquarium123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(),
      status: EventStatus.SCHEDULED,
    });

    it('should complete event successfully', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(scheduledEvent);
      const completedEvent = new Event({ ...scheduledEvent });
      completedEvent.complete(userId, 'Done');
      mockEventRepository.update.mockResolvedValue(completedEvent);

      const result = await service.completeEvent(eventId, userId, 'Done');

      expect(result.status).toBe(EventStatus.COMPLETED);
      expect(result.completedBy).toBe(userId);
      expect(result.notes).toBe('Done');
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.completed', expect.any(Object));
    });

    it('should create next occurrence for recurring events', async () => {
      const recurringEvent = new Event({
        ...scheduledEvent,
        recurring: true,
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
        },
      });
      mockEventRepository.findByIdAndUserId.mockResolvedValue(recurringEvent);
      mockEventRepository.update.mockResolvedValue(recurringEvent);
      mockEventRepository.create.mockResolvedValue(new Event({ ...recurringEvent }));

      await service.completeEvent(eventId, userId);

      expect(eventRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.recurring.created', expect.any(Object));
    });

    it('should throw error if event already completed', async () => {
      const completedEvent = new Event({ ...scheduledEvent, status: EventStatus.COMPLETED });
      mockEventRepository.findByIdAndUserId.mockResolvedValue(completedEvent);

      await expect(
        service.completeEvent(eventId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelEvent', () => {
    const eventId = 'event123';
    const userId = 'user123';
    const scheduledEvent = new Event({
      id: eventId,
      userId,
      aquariumId: 'aquarium123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(),
      status: EventStatus.SCHEDULED,
    });

    it('should cancel event successfully', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(scheduledEvent);
      const cancelledEvent = new Event({ ...scheduledEvent });
      cancelledEvent.cancel('No longer needed');
      mockEventRepository.update.mockResolvedValue(cancelledEvent);

      const result = await service.cancelEvent(eventId, userId, 'No longer needed');

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(result.notes).toContain('No longer needed');
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.cancelled', expect.any(Object));
    });
  });

  describe('rescheduleEvent', () => {
    const eventId = 'event123';
    const userId = 'user123';
    const scheduledEvent = new Event({
      id: eventId,
      userId,
      aquariumId: 'aquarium123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(),
      status: EventStatus.SCHEDULED,
    });

    it('should reschedule event successfully', async () => {
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days later
      mockEventRepository.findByIdAndUserId.mockResolvedValue(scheduledEvent);
      const rescheduledEvent = new Event({ ...scheduledEvent, scheduledDate: newDate });
      mockEventRepository.update.mockResolvedValue(rescheduledEvent);

      const result = await service.rescheduleEvent(eventId, userId, newDate);

      expect(result.scheduledDate).toEqual(newDate);
      expect(result.status).toBe(EventStatus.SCHEDULED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.rescheduled', expect.any(Object));
    });
  });

  describe('reminders', () => {
    const eventId = 'event123';
    const userId = 'user123';
    const event = new Event({
      id: eventId,
      userId,
      aquariumId: 'aquarium123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reminders: [],
    });

    it('should add reminder successfully', async () => {
      mockEventRepository.findByIdAndUserId.mockResolvedValue(event);
      mockEventRepository.update.mockResolvedValue(event);

      const reminderData = {
        type: NotificationType.PUSH,
        timeBefore: 120,
      };

      const result = await service.addReminder(eventId, userId, reminderData, SubscriptionType.PREMIUM);

      expect(result.reminders).toHaveLength(1);
      expect(result.reminders[0].type).toBe(NotificationType.PUSH);
      expect(eventEmitter.emit).toHaveBeenCalledWith('reminder.added', expect.any(Object));
    });

    it('should throw error when reminder limit reached', async () => {
      const eventWithReminder = new Event({
        ...event,
        reminders: [new Reminder({ type: NotificationType.EMAIL })],
      });
      mockEventRepository.findByIdAndUserId.mockResolvedValue(eventWithReminder);

      await expect(
        service.addReminder(eventId, userId, { type: NotificationType.PUSH }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove reminder successfully', async () => {
      const reminder = new Reminder({ id: 'reminder123', type: NotificationType.EMAIL });
      const eventWithReminder = new Event({
        ...event,
        reminders: [reminder],
      });
      mockEventRepository.findByIdAndUserId.mockResolvedValue(eventWithReminder);
      mockEventRepository.update.mockResolvedValue(eventWithReminder);

      const result = await service.removeReminder(eventId, userId, 'reminder123');

      expect(result.reminders).toHaveLength(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('reminder.removed', expect.any(Object));
    });
  });

  describe('processReminders', () => {
    it('should process due reminders', async () => {
      const eventDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const reminder = new Reminder({
        type: NotificationType.EMAIL,
        timeBefore: 60, // 1 hour before
        sent: false,
      });
      const event = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Water Change',
        scheduledDate: eventDate,
        reminders: [reminder],
      });

      mockEventRepository.findDueReminders.mockResolvedValue([event]);
      mockEventRepository.update.mockResolvedValue(event);

      await service.processReminders();

      expect(eventEmitter.emit).toHaveBeenCalledWith('reminder.due', expect.any(Object));
      expect(reminder.sent).toBe(true);
      expect(reminder.sentAt).toBeDefined();
    });
  });

  describe('processOverdueEvents', () => {
    it('should mark overdue events', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const overdueEvent = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Water Change',
        scheduledDate: pastDate,
        status: EventStatus.SCHEDULED,
      });

      mockEventRepository.findOverdue.mockResolvedValue([overdueEvent]);
      mockEventRepository.update.mockResolvedValue(overdueEvent);

      await service.processOverdueEvents();

      expect(overdueEvent.status).toBe(EventStatus.OVERDUE);
      expect(eventEmitter.emit).toHaveBeenCalledWith('event.overdue', expect.any(Object));
    });
  });
});