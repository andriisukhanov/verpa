import { Reminder } from './reminder.entity';
import { NotificationType } from '@verpa/common';

describe('Reminder Entity', () => {
  let reminder: Reminder;

  beforeEach(() => {
    reminder = new Reminder({
      type: NotificationType.EMAIL,
      timeBefore: 60,
    });
  });

  describe('constructor', () => {
    it('should create reminder with default values', () => {
      expect(reminder.id).toBeDefined();
      expect(reminder.type).toBe(NotificationType.EMAIL);
      expect(reminder.timeBefore).toBe(60);
      expect(reminder.sent).toBe(false);
      expect(reminder.createdAt).toBeInstanceOf(Date);
    });

    it('should create reminder with provided values', () => {
      const sentAt = new Date('2024-02-01T09:00:00');
      const customReminder = new Reminder({
        id: 'custom-id',
        type: NotificationType.PUSH,
        timeBefore: 120,
        sent: true,
        sentAt,
        error: 'Failed to send',
      });

      expect(customReminder.id).toBe('custom-id');
      expect(customReminder.type).toBe(NotificationType.PUSH);
      expect(customReminder.timeBefore).toBe(120);
      expect(customReminder.sent).toBe(true);
      expect(customReminder.sentAt).toBe(sentAt);
      expect(customReminder.error).toBe('Failed to send');
    });
  });

  describe('reminder time calculation', () => {
    it('should calculate reminder time correctly', () => {
      const eventDate = new Date('2024-02-01T10:00:00');
      reminder.timeBefore = 30;

      const reminderTime = reminder.getReminderTime(eventDate);

      expect(reminderTime).toEqual(new Date('2024-02-01T09:30:00'));
    });

    it('should handle multi-hour reminders', () => {
      const eventDate = new Date('2024-02-01T10:00:00');
      reminder.timeBefore = 180; // 3 hours

      const reminderTime = reminder.getReminderTime(eventDate);

      expect(reminderTime).toEqual(new Date('2024-02-01T07:00:00'));
    });

    it('should handle day-before reminders', () => {
      const eventDate = new Date('2024-02-01T10:00:00');
      reminder.timeBefore = 1440; // 24 hours

      const reminderTime = reminder.getReminderTime(eventDate);

      expect(reminderTime).toEqual(new Date('2024-01-31T10:00:00'));
    });
  });

  describe('send logic', () => {
    it('should determine when to send', () => {
      const eventDate = new Date();
      eventDate.setHours(eventDate.getHours() + 1); // Event in 1 hour
      reminder.timeBefore = 90; // Remind 90 minutes before

      expect(reminder.shouldSend(eventDate)).toBe(true);
    });

    it('should not send if already sent', () => {
      const eventDate = new Date();
      eventDate.setHours(eventDate.getHours() + 1);
      reminder.sent = true;

      expect(reminder.shouldSend(eventDate)).toBe(false);
    });

    it('should not send if too early', () => {
      const eventDate = new Date();
      eventDate.setHours(eventDate.getHours() + 2); // Event in 2 hours
      reminder.timeBefore = 60; // Remind 1 hour before

      expect(reminder.shouldSend(eventDate)).toBe(false);
    });

    it('should mark as sent', () => {
      reminder.markAsSent();

      expect(reminder.sent).toBe(true);
      expect(reminder.sentAt).toBeInstanceOf(Date);
    });

    it('should mark as failed', () => {
      reminder.markAsFailed('Network error');

      expect(reminder.sent).toBe(false);
      expect(reminder.error).toBe('Network error');
    });
  });

  describe('readable time formatting', () => {
    it('should format minutes', () => {
      reminder.timeBefore = 30;
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('30 minutes');
    });

    it('should format single minute', () => {
      reminder.timeBefore = 1;
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('1 minute');
    });

    it('should format hours', () => {
      reminder.timeBefore = 120;
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('2 hours');
    });

    it('should format single hour', () => {
      reminder.timeBefore = 60;
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('1 hour');
    });

    it('should format days', () => {
      reminder.timeBefore = 2880; // 48 hours
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('2 days');
    });

    it('should format single day', () => {
      reminder.timeBefore = 1440;
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('1 day');
    });

    it('should format complex time', () => {
      reminder.timeBefore = 1530; // 1 day, 1 hour, 30 minutes
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('1 day 1 hour 30 minutes');
    });

    it('should format days and hours', () => {
      reminder.timeBefore = 2520; // 1 day, 18 hours
      const json = reminder.toJSON();
      expect(json.readableTimeBefore).toBe('1 day 18 hours');
    });
  });

  describe('toJSON', () => {
    it('should include readable time', () => {
      reminder.timeBefore = 90;
      const json = reminder.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('type', NotificationType.EMAIL);
      expect(json).toHaveProperty('timeBefore', 90);
      expect(json).toHaveProperty('sent', false);
      expect(json).toHaveProperty('readableTimeBefore', '1 hour 30 minutes');
    });
  });
});