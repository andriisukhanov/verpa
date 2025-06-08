import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';
import { EventDomainService } from '../../domain/services/event.domain.service';
import { Event } from '../../domain/entities/event.entity';
import { Reminder } from '../../domain/entities/reminder.entity';
import { EventType, EventStatus, SubscriptionType, NotificationType } from '@verpa/common';

describe('EventService', () => {
  let service: EventService;
  let domainService: jest.Mocked<EventDomainService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockDomainService = {
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    completeEvent: jest.fn(),
    cancelEvent: jest.fn(),
    rescheduleEvent: jest.fn(),
    addReminder: jest.fn(),
    removeReminder: jest.fn(),
    getEvent: jest.fn(),
    getUserEvents: jest.fn(),
    getAquariumEvents: jest.fn(),
    getUpcomingEvents: jest.fn(),
    getOverdueEvents: jest.fn(),
    processReminders: jest.fn(),
    processOverdueEvents: jest.fn(),
  };

  const mockEventEmitter = {
    on: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: EventDomainService,
          useValue: mockDomainService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    domainService = module.get(EventDomainService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      description: 'Change 25% of water',
      scheduledDate: '2024-02-01T10:00:00Z',
      duration: 30,
      recurring: true,
      recurrencePattern: {
        frequency: 'weekly' as const,
        interval: 1,
      },
      recurrenceEndDate: '2024-12-31T23:59:59Z',
    };

    it('should create event successfully', async () => {
      const event = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        ...createDto,
        scheduledDate: new Date(createDto.scheduledDate),
        recurrenceEndDate: new Date(createDto.recurrenceEndDate),
      });

      mockDomainService.createEvent.mockResolvedValue(event);

      const result = await service.create(
        'user123',
        'aquarium123',
        createDto,
        SubscriptionType.PREMIUM,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('event123');
      expect(result.title).toBe('Weekly Water Change');
      expect(result.recurring).toBe(true);
      expect(domainService.createEvent).toHaveBeenCalledWith(
        'user123',
        'aquarium123',
        expect.objectContaining({
          ...createDto,
          scheduledDate: expect.any(Date),
          recurrenceEndDate: expect.any(Date),
        }),
        SubscriptionType.PREMIUM,
      );
    });

    it('should handle events without recurrence end date', async () => {
      const simpleDto = {
        type: EventType.FEEDING,
        title: 'Morning Feed',
        scheduledDate: '2024-02-01T08:00:00Z',
      };

      const event = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        ...simpleDto,
        scheduledDate: new Date(simpleDto.scheduledDate),
      });

      mockDomainService.createEvent.mockResolvedValue(event);

      await service.create('user123', 'aquarium123', simpleDto, SubscriptionType.BASIC);

      expect(domainService.createEvent).toHaveBeenCalledWith(
        'user123',
        'aquarium123',
        expect.objectContaining({
          ...simpleDto,
          scheduledDate: expect.any(Date),
          recurrenceEndDate: undefined,
        }),
        SubscriptionType.BASIC,
      );
    });
  });

  describe('findAll', () => {
    it('should return user events', async () => {
      const events = [
        new Event({
          id: 'event1',
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Water Change',
          scheduledDate: new Date(),
        }),
        new Event({
          id: 'event2',
          userId: 'user123',
          aquariumId: 'aquarium456',
          type: EventType.FEEDING,
          title: 'Feed Fish',
          scheduledDate: new Date(),
        }),
      ];

      mockDomainService.getUserEvents.mockResolvedValue(events);

      const result = await service.findAll('user123', {});

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event1');
      expect(result[1].id).toBe('event2');
    });
  });

  describe('findByAquarium', () => {
    it('should return aquarium events', async () => {
      const events = [
        new Event({
          id: 'event1',
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Water Change',
          scheduledDate: new Date(),
        }),
      ];

      mockDomainService.getAquariumEvents.mockResolvedValue(events);

      const result = await service.findByAquarium('aquarium123', 'user123', {});

      expect(result).toHaveLength(1);
      expect(result[0].aquariumId).toBe('aquarium123');
    });
  });

  describe('findOne', () => {
    it('should return event by id', async () => {
      const event = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
      });

      mockDomainService.getEvent.mockResolvedValue(event);

      const result = await service.findOne('event123', 'user123');

      expect(result).toBeDefined();
      expect(result.id).toBe('event123');
      expect(result.title).toBe('Test Event');
    });

    it('should throw NotFoundException if event not found', async () => {
      mockDomainService.getEvent.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'user123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming events', async () => {
      const events = [
        new Event({
          id: 'event1',
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Tomorrow Event',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      ];

      mockDomainService.getUpcomingEvents.mockResolvedValue(events);

      const result = await service.findUpcoming('user123', 7);

      expect(result).toHaveLength(1);
      expect(domainService.getUpcomingEvents).toHaveBeenCalledWith('user123', 7);
    });
  });

  describe('findOverdue', () => {
    it('should return overdue events', async () => {
      const events = [
        new Event({
          id: 'event1',
          userId: 'user123',
          aquariumId: 'aquarium123',
          type: EventType.WATER_CHANGE,
          title: 'Overdue Event',
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: EventStatus.OVERDUE,
        }),
      ];

      mockDomainService.getOverdueEvents.mockResolvedValue(events);

      const result = await service.findOverdue('user123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(EventStatus.OVERDUE);
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      description: 'Updated description',
      scheduledDate: '2024-02-05T10:00:00Z',
    };

    it('should update event successfully', async () => {
      const updatedEvent = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Updated Title',
        description: 'Updated description',
        scheduledDate: new Date(updateDto.scheduledDate),
      });

      mockDomainService.updateEvent.mockResolvedValue(updatedEvent);

      const result = await service.update('event123', 'user123', updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(domainService.updateEvent).toHaveBeenCalledWith(
        'event123',
        'user123',
        expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated description',
          scheduledDate: expect.any(Date),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete event', async () => {
      mockDomainService.deleteEvent.mockResolvedValue(undefined);

      await service.remove('event123', 'user123');

      expect(domainService.deleteEvent).toHaveBeenCalledWith('event123', 'user123');
    });
  });

  describe('complete', () => {
    it('should complete event', async () => {
      const completedEvent = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.COMPLETED,
        completedAt: new Date(),
        completedBy: 'user123',
        notes: 'Completed successfully',
      });

      mockDomainService.completeEvent.mockResolvedValue(completedEvent);

      const result = await service.complete('event123', 'user123', 'Completed successfully');

      expect(result.status).toBe(EventStatus.COMPLETED);
      expect(result.completedBy).toBe('user123');
      expect(result.notes).toBe('Completed successfully');
    });
  });

  describe('cancel', () => {
    it('should cancel event', async () => {
      const cancelledEvent = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        status: EventStatus.CANCELLED,
        notes: 'Cancelled: No longer needed',
      });

      mockDomainService.cancelEvent.mockResolvedValue(cancelledEvent);

      const result = await service.cancel('event123', 'user123', 'No longer needed');

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(result.notes).toContain('No longer needed');
    });
  });

  describe('reschedule', () => {
    it('should reschedule event', async () => {
      const newDate = new Date('2024-02-10T10:00:00Z');
      const rescheduledEvent = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: newDate,
        status: EventStatus.SCHEDULED,
      });

      mockDomainService.rescheduleEvent.mockResolvedValue(rescheduledEvent);

      const result = await service.reschedule('event123', 'user123', '2024-02-10T10:00:00Z');

      expect(result.scheduledDate).toEqual(newDate);
      expect(result.status).toBe(EventStatus.SCHEDULED);
    });
  });

  describe('reminders', () => {
    it('should add reminder', async () => {
      const reminderDto = {
        type: NotificationType.PUSH,
        timeBefore: 120,
      };

      const eventWithReminder = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [
          new Reminder({
            id: 'reminder123',
            type: NotificationType.PUSH,
            timeBefore: 120,
          }),
        ],
      });

      mockDomainService.addReminder.mockResolvedValue(eventWithReminder);

      const result = await service.addReminder(
        'event123',
        'user123',
        reminderDto,
        SubscriptionType.PREMIUM,
      );

      expect(result.reminders).toHaveLength(1);
      expect(result.reminders[0].type).toBe(NotificationType.PUSH);
    });

    it('should remove reminder', async () => {
      const eventWithoutReminder = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [],
      });

      mockDomainService.removeReminder.mockResolvedValue(eventWithoutReminder);

      const result = await service.removeReminder('event123', 'user123', 'reminder123');

      expect(result.reminders).toHaveLength(0);
    });
  });

  describe('scheduled jobs', () => {
    it('should process reminders', async () => {
      mockDomainService.processReminders.mockResolvedValue(undefined);

      await service.processReminders();

      expect(domainService.processReminders).toHaveBeenCalled();
    });

    it('should handle reminder processing errors', async () => {
      mockDomainService.processReminders.mockRejectedValue(new Error('Processing failed'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      await service.processReminders();

      expect(consoleError).toHaveBeenCalledWith('Error processing reminders:', expect.any(Error));
      consoleError.mockRestore();
    });

    it('should process overdue events', async () => {
      mockDomainService.processOverdueEvents.mockResolvedValue(undefined);

      await service.processOverdueEvents();

      expect(domainService.processOverdueEvents).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should setup event listeners on module init', () => {
      service.onModuleInit();

      expect(eventEmitter.on).toHaveBeenCalledWith('event.created', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('event.completed', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('reminder.due', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('event.overdue', expect.any(Function));
    });
  });

  describe('toResponseDto', () => {
    it('should correctly transform event to response DTO', async () => {
      const event = new Event({
        id: 'event123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date('2024-02-01T10:00:00Z'),
        recurring: true,
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
        },
        reminders: [
          new Reminder({
            id: 'reminder123',
            type: NotificationType.EMAIL,
            timeBefore: 60,
          }),
        ],
        status: EventStatus.SCHEDULED,
      });

      mockDomainService.getEvent.mockResolvedValue(event);

      const result = await service.findOne('event123', 'user123');

      expect(result).toHaveProperty('id', 'event123');
      expect(result).toHaveProperty('isOverdue');
      expect(result).toHaveProperty('isDue');
      expect(result).toHaveProperty('nextOccurrence');
      expect(result.reminders[0]).toHaveProperty('readableTimeBefore');
    });
  });
});