import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from '../services/event.service';
import { EventType, EventStatus, SubscriptionType, NotificationType } from '@verpa/common';

describe('EventController', () => {
  let controller: EventController;
  let eventService: jest.Mocked<EventService>;

  const mockEventService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByAquarium: jest.fn(),
    findOne: jest.fn(),
    findUpcoming: jest.fn(),
    findOverdue: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
    addReminder: jest.fn(),
    removeReminder: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'user123',
      email: 'test@example.com',
      subscriptionType: SubscriptionType.PREMIUM,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    eventService = module.get(EventService);

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
    };

    it('should create event', async () => {
      const event = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        ...createDto,
        scheduledDate: new Date(createDto.scheduledDate),
        reminders: [],
        status: EventStatus.SCHEDULED,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.create.mockResolvedValue(event);

      const result = await controller.create('aquarium123', createDto, mockRequest);

      expect(result).toEqual(event);
      expect(eventService.create).toHaveBeenCalledWith(
        'user123',
        'aquarium123',
        createDto,
        SubscriptionType.PREMIUM,
      );
    });
  });

  describe('findAll', () => {
    it('should return user events', async () => {
      const events = [
        {
          id: 'event1',
          aquariumId: 'aquarium123',
          userId: 'user123',
          type: EventType.WATER_CHANGE,
          title: 'Water Change',
          scheduledDate: new Date(),
          reminders: [],
          status: EventStatus.SCHEDULED,
          recurring: false,
          isOverdue: false,
          isDue: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockEventService.findAll.mockResolvedValue(events);

      const result = await controller.findAll({}, mockRequest);

      expect(result).toEqual(events);
      expect(eventService.findAll).toHaveBeenCalledWith('user123', expect.any(Object));
    });

    it('should pass query parameters', async () => {
      mockEventService.findAll.mockResolvedValue([]);

      const query = {
        type: EventType.FEEDING,
        status: EventStatus.SCHEDULED,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        recurring: 'true',
        page: '2',
        limit: '50',
      };

      await controller.findAll(query, mockRequest);

      expect(eventService.findAll).toHaveBeenCalledWith('user123', {
        type: EventType.FEEDING,
        status: EventStatus.SCHEDULED,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
        recurring: true,
        page: 2,
        limit: 50,
      });
    });
  });

  describe('findByAquarium', () => {
    it('should return aquarium events', async () => {
      const events = [
        {
          id: 'event1',
          aquariumId: 'aquarium123',
          userId: 'user123',
          type: EventType.WATER_CHANGE,
          title: 'Water Change',
          scheduledDate: new Date(),
          reminders: [],
          status: EventStatus.SCHEDULED,
          recurring: false,
          isOverdue: false,
          isDue: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockEventService.findByAquarium.mockResolvedValue(events);

      const result = await controller.findByAquarium('aquarium123', {}, mockRequest);

      expect(result).toEqual(events);
      expect(eventService.findByAquarium).toHaveBeenCalledWith(
        'aquarium123',
        'user123',
        expect.any(Object),
      );
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming events', async () => {
      const events = [
        {
          id: 'event1',
          aquariumId: 'aquarium123',
          userId: 'user123',
          type: EventType.WATER_CHANGE,
          title: 'Tomorrow Event',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          reminders: [],
          status: EventStatus.SCHEDULED,
          recurring: false,
          isOverdue: false,
          isDue: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockEventService.findUpcoming.mockResolvedValue(events);

      const result = await controller.findUpcoming(undefined, mockRequest);

      expect(result).toEqual(events);
      expect(eventService.findUpcoming).toHaveBeenCalledWith('user123', 7);
    });

    it('should use custom days parameter', async () => {
      mockEventService.findUpcoming.mockResolvedValue([]);

      await controller.findUpcoming('14', mockRequest);

      expect(eventService.findUpcoming).toHaveBeenCalledWith('user123', 14);
    });
  });

  describe('findOverdue', () => {
    it('should return overdue events', async () => {
      const events = [
        {
          id: 'event1',
          aquariumId: 'aquarium123',
          userId: 'user123',
          type: EventType.WATER_CHANGE,
          title: 'Overdue Event',
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          reminders: [],
          status: EventStatus.OVERDUE,
          recurring: false,
          isOverdue: true,
          isDue: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockEventService.findOverdue.mockResolvedValue(events);

      const result = await controller.findOverdue(mockRequest);

      expect(result).toEqual(events);
      expect(eventService.findOverdue).toHaveBeenCalledWith('user123');
    });
  });

  describe('findOne', () => {
    it('should return event by id', async () => {
      const event = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [],
        status: EventStatus.SCHEDULED,
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.findOne.mockResolvedValue(event);

      const result = await controller.findOne('event123', mockRequest);

      expect(result).toEqual(event);
      expect(eventService.findOne).toHaveBeenCalledWith('event123', 'user123');
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    it('should update event', async () => {
      const updatedEvent = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Updated Title',
        description: 'Updated description',
        scheduledDate: new Date(),
        reminders: [],
        status: EventStatus.SCHEDULED,
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.update.mockResolvedValue(updatedEvent);

      const result = await controller.update('event123', updateDto, mockRequest);

      expect(result).toEqual(updatedEvent);
      expect(eventService.update).toHaveBeenCalledWith(
        'event123',
        'user123',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete event', async () => {
      mockEventService.remove.mockResolvedValue(undefined);

      await controller.remove('event123', mockRequest);

      expect(eventService.remove).toHaveBeenCalledWith('event123', 'user123');
    });
  });

  describe('complete', () => {
    it('should complete event', async () => {
      const completedEvent = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [],
        status: EventStatus.COMPLETED,
        completedAt: new Date(),
        completedBy: 'user123',
        notes: 'Completed successfully',
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.complete.mockResolvedValue(completedEvent);

      const result = await controller.complete(
        'event123',
        'Completed successfully',
        mockRequest,
      );

      expect(result).toEqual(completedEvent);
      expect(eventService.complete).toHaveBeenCalledWith(
        'event123',
        'user123',
        'Completed successfully',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel event', async () => {
      const cancelledEvent = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [],
        status: EventStatus.CANCELLED,
        notes: 'Cancelled: No longer needed',
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.cancel.mockResolvedValue(cancelledEvent);

      const result = await controller.cancel(
        'event123',
        'No longer needed',
        mockRequest,
      );

      expect(result).toEqual(cancelledEvent);
      expect(eventService.cancel).toHaveBeenCalledWith(
        'event123',
        'user123',
        'No longer needed',
      );
    });
  });

  describe('reschedule', () => {
    it('should reschedule event', async () => {
      const newDate = '2024-02-10T10:00:00Z';
      const rescheduledEvent = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(newDate),
        reminders: [],
        status: EventStatus.SCHEDULED,
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.reschedule.mockResolvedValue(rescheduledEvent);

      const result = await controller.reschedule('event123', newDate, mockRequest);

      expect(result).toEqual(rescheduledEvent);
      expect(eventService.reschedule).toHaveBeenCalledWith(
        'event123',
        'user123',
        newDate,
      );
    });

    it('should throw error if scheduledDate not provided', async () => {
      await expect(
        controller.reschedule('event123', undefined as any, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reminders', () => {
    it('should add reminder', async () => {
      const reminderDto = {
        type: NotificationType.PUSH,
        timeBefore: 120,
      };

      const eventWithReminder = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [
          {
            id: 'reminder123',
            type: NotificationType.PUSH,
            timeBefore: 120,
            sent: false,
            readableTimeBefore: '2 hours',
          },
        ],
        status: EventStatus.SCHEDULED,
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.addReminder.mockResolvedValue(eventWithReminder);

      const result = await controller.addReminder(
        'event123',
        reminderDto,
        mockRequest,
      );

      expect(result).toEqual(eventWithReminder);
      expect(eventService.addReminder).toHaveBeenCalledWith(
        'event123',
        'user123',
        reminderDto,
        SubscriptionType.PREMIUM,
      );
    });

    it('should remove reminder', async () => {
      const eventWithoutReminder = {
        id: 'event123',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.WATER_CHANGE,
        title: 'Test Event',
        scheduledDate: new Date(),
        reminders: [],
        status: EventStatus.SCHEDULED,
        recurring: false,
        isOverdue: false,
        isDue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.removeReminder.mockResolvedValue(eventWithoutReminder);

      const result = await controller.removeReminder(
        'event123',
        'reminder123',
        mockRequest,
      );

      expect(result).toEqual(eventWithoutReminder);
      expect(eventService.removeReminder).toHaveBeenCalledWith(
        'event123',
        'user123',
        'reminder123',
      );
    });
  });
});