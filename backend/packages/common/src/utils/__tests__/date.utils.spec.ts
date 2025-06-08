import { DateUtils } from '../date.utils';

describe('DateUtils', () => {
  const testDate = new Date('2024-01-15T10:30:00.000Z');

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const result = DateUtils.addDays(testDate, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should add negative days correctly', () => {
      const result = DateUtils.addDays(testDate, -5);
      expect(result.getDate()).toBe(10);
      expect(result.getMonth()).toBe(0);
    });

    it('should handle month boundaries', () => {
      const endOfMonth = new Date('2024-01-31T10:00:00.000Z');
      const result = DateUtils.addDays(endOfMonth, 1);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('addHours', () => {
    it('should add hours correctly', () => {
      const result = DateUtils.addHours(testDate, 5);
      expect(result.getHours()).toBe(15);
    });

    it('should handle day boundaries', () => {
      const evening = new Date('2024-01-15T22:00:00.000Z');
      const result = DateUtils.addHours(evening, 5);
      expect(result.getDate()).toBe(16);
      expect(result.getHours()).toBe(3);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes correctly', () => {
      const result = DateUtils.addMinutes(testDate, 45);
      expect(result.getMinutes()).toBe(15);
      expect(result.getHours()).toBe(11);
    });

    it('should handle hour boundaries', () => {
      const result = DateUtils.addMinutes(testDate, 90);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('startOfDay', () => {
    it('should set time to start of day', () => {
      const result = DateUtils.startOfDay(testDate);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(testDate.getDate());
    });
  });

  describe('endOfDay', () => {
    it('should set time to end of day', () => {
      const result = DateUtils.endOfDay(testDate);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
      expect(result.getDate()).toBe(testDate.getDate());
    });
  });

  describe('startOfWeek', () => {
    it('should get start of week (Sunday)', () => {
      const wednesday = new Date('2024-01-17T10:00:00.000Z'); // Wednesday
      const result = DateUtils.startOfWeek(wednesday, 0); // Sunday start
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(14);
    });

    it('should get start of week (Monday)', () => {
      const wednesday = new Date('2024-01-17T10:00:00.000Z'); // Wednesday
      const result = DateUtils.startOfWeek(wednesday, 1); // Monday start
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(15);
    });
  });

  describe('endOfWeek', () => {
    it('should get end of week (Sunday start)', () => {
      const wednesday = new Date('2024-01-17T10:00:00.000Z'); // Wednesday
      const result = DateUtils.endOfWeek(wednesday, 0); // Sunday start
      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(20);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  describe('isToday', () => {
    it('should correctly identify today', () => {
      const today = new Date();
      expect(DateUtils.isToday(today)).toBe(true);
      
      const yesterday = DateUtils.addDays(today, -1);
      expect(DateUtils.isToday(yesterday)).toBe(false);
      
      const tomorrow = DateUtils.addDays(today, 1);
      expect(DateUtils.isToday(tomorrow)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should correctly identify future dates', () => {
      const tomorrow = DateUtils.addDays(new Date(), 1);
      expect(DateUtils.isFuture(tomorrow)).toBe(true);
      
      const yesterday = DateUtils.addDays(new Date(), -1);
      expect(DateUtils.isFuture(yesterday)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should correctly identify past dates', () => {
      const yesterday = DateUtils.addDays(new Date(), -1);
      expect(DateUtils.isPast(yesterday)).toBe(true);
      
      const tomorrow = DateUtils.addDays(new Date(), 1);
      expect(DateUtils.isPast(tomorrow)).toBe(false);
    });
  });

  describe('differenceInDays', () => {
    it('should calculate difference in days', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(DateUtils.differenceInDays(date1, date2)).toBe(5);
      expect(DateUtils.differenceInDays(date2, date1)).toBe(5); // absolute difference
    });
  });

  describe('differenceInHours', () => {
    it('should calculate difference in hours', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T15:00:00');
      expect(DateUtils.differenceInHours(date1, date2)).toBe(5);
    });
  });

  describe('differenceInMinutes', () => {
    it('should calculate difference in minutes', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T10:30:00');
      expect(DateUtils.differenceInMinutes(date1, date2)).toBe(30);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T09:05:03');
      
      expect(DateUtils.formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(DateUtils.formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
      expect(DateUtils.formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 09:05:03');
    });

    it('should use default format', () => {
      const date = new Date('2024-01-15');
      expect(DateUtils.formatDate(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const validDates = [
        '2024-01-15',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00.000Z',
        'January 15, 2024',
      ];

      validDates.forEach((dateStr) => {
        const result = DateUtils.parseDate(dateStr);
        expect(result).toBeInstanceOf(Date);
        expect(result).not.toBeNull();
      });
    });

    it('should return null for invalid date strings', () => {
      const invalidDates = [
        '',
        'not a date',
        '2024-13-45', // invalid month/day
        'abc123',
      ];

      invalidDates.forEach((dateStr) => {
        expect(DateUtils.parseDate(dateStr)).toBeNull();
      });
    });
  });

  describe('getTimezoneOffset', () => {
    it('should get timezone offset for UTC', () => {
      const offset = DateUtils.getTimezoneOffset('UTC');
      expect(offset).toBe(0);
    });

    it('should handle invalid timezones', () => {
      const offset = DateUtils.getTimezoneOffset('Invalid/Timezone');
      expect(offset).toBe(0);
    });
  });

  describe('convertToTimezone', () => {
    it('should convert date to different timezone', () => {
      const utcDate = new Date('2024-01-15T12:00:00.000Z');
      // This test may vary based on system timezone settings
      const result = DateUtils.convertToTimezone(utcDate, 'UTC');
      expect(result).toBeInstanceOf(Date);
    });
  });
});