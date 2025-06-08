import { Event } from './event.entity';
import { Reminder } from './reminder.entity';
import { EventType, EventStatus, NotificationType } from '@verpa/common';

describe('Event Entity', () => {
  let event: Event;

  beforeEach(() => {
    event = new Event({
      aquariumId: 'aquarium123',
      userId: 'user123',
      type: EventType.WATER_CHANGE,
      title: 'Weekly Water Change',
      scheduledDate: new Date('2024-02-01T10:00:00'),
    });
  });

  describe('constructor', () => {
    it('should create event with default values', () => {
      expect(event.id).toBeDefined();
      expect(event.status).toBe(EventStatus.SCHEDULED);
      expect(event.recurring).toBe(false);
      expect(event.reminders).toEqual([]);
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });

    it('should create event with provided values', () => {
      const customEvent = new Event({
        id: 'custom-id',
        aquariumId: 'aquarium123',
        userId: 'user123',
        type: EventType.FEEDING,
        title: 'Daily Feeding',
        description: 'Feed the fish',
        scheduledDate: new Date('2024-02-01T08:00:00'),
        duration: 15,
        recurring: true,
        recurrencePattern: {
          frequency: 'daily',
          interval: 1,
        },
        status: EventStatus.COMPLETED,
        completedAt: new Date('2024-02-01T08:15:00'),
        completedBy: 'user123',
        notes: 'Fed flakes',
      });

      expect(customEvent.id).toBe('custom-id');
      expect(customEvent.type).toBe(EventType.FEEDING);
      expect(customEvent.description).toBe('Feed the fish');
      expect(customEvent.duration).toBe(15);
      expect(customEvent.recurring).toBe(true);
      expect(customEvent.recurrencePattern).toBeDefined();
      expect(customEvent.status).toBe(EventStatus.COMPLETED);
      expect(customEvent.completedAt).toBeInstanceOf(Date);
      expect(customEvent.notes).toBe('Fed flakes');
    });
  });

  describe('status checks', () => {
    it('should detect overdue events', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      event.scheduledDate = pastDate;

      expect(event.isOverdue()).toBe(true);
    });

    it('should not mark completed events as overdue', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      event.scheduledDate = pastDate;
      event.status = EventStatus.COMPLETED;

      expect(event.isOverdue()).toBe(false);
    });

    it('should detect due events', () => {
      const inThirtyMinutes = new Date();
      inThirtyMinutes.setMinutes(inThirtyMinutes.getMinutes() + 30);
      event.scheduledDate = inThirtyMinutes;

      expect(event.isDue()).toBe(true);
    });

    it('should not mark past events as due', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      event.scheduledDate = yesterday;

      expect(event.isDue()).toBe(false);
    });

    it('should not mark events more than 1 hour away as due', () => {
      const inTwoHours = new Date();
      inTwoHours.setHours(inTwoHours.getHours() + 2);
      event.scheduledDate = inTwoHours;

      expect(event.isDue()).toBe(false);
    });
  });

  describe('event actions', () => {
    it('should complete event', () => {
      event.complete('user123', 'Completed successfully');

      expect(event.status).toBe(EventStatus.COMPLETED);
      expect(event.completedAt).toBeInstanceOf(Date);
      expect(event.completedBy).toBe('user123');
      expect(event.notes).toBe('Completed successfully');
    });

    it('should append notes when completing', () => {
      event.notes = 'Original note';
      event.complete('user123', 'Additional note');

      expect(event.notes).toBe('Original note\nAdditional note');
    });

    it('should cancel event', () => {
      event.cancel('No longer needed');

      expect(event.status).toBe(EventStatus.CANCELLED);
      expect(event.notes).toContain('Cancelled: No longer needed');
    });

    it('should reschedule event', () => {
      const newDate = new Date('2024-02-05T10:00:00');
      event.status = EventStatus.OVERDUE;
      event.reschedule(newDate);

      expect(event.scheduledDate).toEqual(newDate);
      expect(event.status).toBe(EventStatus.SCHEDULED);
      expect(event.updatedAt.getTime()).toBeGreaterThan(event.createdAt.getTime());
    });
  });

  describe('reminders', () => {
    it('should add reminder', () => {
      const reminder = new Reminder({
        type: NotificationType.EMAIL,
        timeBefore: 60,
      });

      event.addReminder(reminder);

      expect(event.reminders).toHaveLength(1);
      expect(event.reminders[0]).toBe(reminder);
    });

    it('should remove reminder', () => {
      const reminder1 = new Reminder({ type: NotificationType.EMAIL });
      const reminder2 = new Reminder({ type: NotificationType.PUSH });
      event.reminders = [reminder1, reminder2];

      event.removeReminder(reminder1.id);

      expect(event.reminders).toHaveLength(1);
      expect(event.reminders[0]).toBe(reminder2);
    });
  });

  describe('recurrence', () => {
    beforeEach(() => {
      event.recurring = true;
      event.scheduledDate = new Date('2024-02-01T10:00:00');
    });

    it('should calculate next daily occurrence', () => {
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };

      const next = event.getNextOccurrence();
      expect(next).toEqual(new Date('2024-02-02T10:00:00'));
    });

    it('should calculate next weekly occurrence', () => {
      event.recurrencePattern = {
        frequency: 'weekly',
        interval: 2,
      };

      const next = event.getNextOccurrence();
      expect(next).toEqual(new Date('2024-02-15T10:00:00'));
    });

    it('should calculate next monthly occurrence', () => {
      event.recurrencePattern = {
        frequency: 'monthly',
        interval: 1,
      };

      const next = event.getNextOccurrence();
      expect(next).toEqual(new Date('2024-03-01T10:00:00'));
    });

    it('should calculate next yearly occurrence', () => {
      event.recurrencePattern = {
        frequency: 'yearly',
        interval: 1,
      };

      const next = event.getNextOccurrence();
      expect(next).toEqual(new Date('2025-02-01T10:00:00'));
    });

    it('should respect recurrence end date', () => {
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };
      event.recurrenceEndDate = new Date('2024-02-01T23:59:59');

      const next = event.getNextOccurrence();
      expect(next).toBeNull();
    });

    it('should return null for non-recurring events', () => {
      event.recurring = false;
      const next = event.getNextOccurrence();
      expect(next).toBeNull();
    });

    it('should use completedAt as base for next occurrence if completed', () => {
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };
      event.completedAt = new Date('2024-02-01T11:00:00');
      event.status = EventStatus.COMPLETED;

      const next = event.getNextOccurrence();
      expect(next).toEqual(new Date('2024-02-02T11:00:00'));
    });

    it('should determine if next occurrence should be created', () => {
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };
      event.status = EventStatus.COMPLETED;

      expect(event.shouldCreateNextOccurrence()).toBe(true);
    });

    it('should not create next occurrence for non-recurring events', () => {
      event.recurring = false;
      event.status = EventStatus.COMPLETED;

      expect(event.shouldCreateNextOccurrence()).toBe(false);
    });

    it('should not create next occurrence if not completed', () => {
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };
      event.status = EventStatus.SCHEDULED;

      expect(event.shouldCreateNextOccurrence()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should include calculated fields', () => {
      const inThirtyMinutes = new Date();
      inThirtyMinutes.setMinutes(inThirtyMinutes.getMinutes() + 30);
      event.scheduledDate = inThirtyMinutes;
      event.recurring = true;
      event.recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };

      const json = event.toJSON();

      expect(json).toHaveProperty('isOverdue', false);
      expect(json).toHaveProperty('isDue', true);
      expect(json).toHaveProperty('nextOccurrence');
      expect(json.nextOccurrence).toBeInstanceOf(Date);
    });
  });
});