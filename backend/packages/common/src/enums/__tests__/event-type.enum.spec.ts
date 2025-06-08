import { EventType } from '../event-type.enum';

describe('EventType Enum', () => {
  const quickEvents = [
    EventType.TEMPERATURE_MEASUREMENT,
    EventType.PHOTO_UPLOAD,
    EventType.FEEDING,
  ];

  const scheduledEvents = [
    EventType.WATER_CHANGE,
    EventType.FILTER_CLEANING,
    EventType.WATER_TEST,
    EventType.MEDICATION,
    EventType.EQUIPMENT_MAINTENANCE,
  ];

  it('should have correct values for quick events', () => {
    expect(EventType.TEMPERATURE_MEASUREMENT).toBe('temperature_measurement');
    expect(EventType.PHOTO_UPLOAD).toBe('photo_upload');
    expect(EventType.FEEDING).toBe('feeding');
  });

  it('should have correct values for scheduled events', () => {
    expect(EventType.WATER_CHANGE).toBe('water_change');
    expect(EventType.FILTER_CLEANING).toBe('filter_cleaning');
    expect(EventType.WATER_TEST).toBe('water_test');
    expect(EventType.MEDICATION).toBe('medication');
    expect(EventType.EQUIPMENT_MAINTENANCE).toBe('equipment_maintenance');
  });

  it('should have custom event type', () => {
    expect(EventType.CUSTOM).toBe('custom');
  });

  it('should have exactly 9 event types', () => {
    const types = Object.keys(EventType);
    expect(types).toHaveLength(9);
  });

  it('should have all lowercase values with underscores', () => {
    Object.values(EventType).forEach((type) => {
      expect(type).toMatch(/^[a-z_]+$/);
    });
  });

  it('should categorize events correctly', () => {
    expect(quickEvents).toHaveLength(3);
    expect(scheduledEvents).toHaveLength(5);
    
    const allEvents = [...quickEvents, ...scheduledEvents, EventType.CUSTOM];
    expect(allEvents).toHaveLength(9);
  });

  it('should be able to check if a value is a valid event type', () => {
    const validTypes = Object.values(EventType);
    
    quickEvents.forEach((event) => {
      expect(validTypes.includes(event)).toBe(true);
    });
    
    scheduledEvents.forEach((event) => {
      expect(validTypes.includes(event)).toBe(true);
    });
    
    expect(validTypes.includes(EventType.CUSTOM)).toBe(true);
    expect(validTypes.includes('invalid' as EventType)).toBe(false);
  });
});