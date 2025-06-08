import { NotificationType, NotificationPriority } from '../notification-type.enum';

describe('NotificationType Enum', () => {
  it('should have correct values for all notification types', () => {
    expect(NotificationType.PUSH).toBe('push');
    expect(NotificationType.EMAIL).toBe('email');
    expect(NotificationType.SMS).toBe('sms');
    expect(NotificationType.IN_APP).toBe('in_app');
  });

  it('should have exactly 4 notification types', () => {
    const types = Object.keys(NotificationType);
    expect(types).toHaveLength(4);
  });

  it('should have all lowercase values', () => {
    Object.values(NotificationType).forEach((type) => {
      expect(type).toMatch(/^[a-z_]+$/);
    });
  });

  it('should be able to check if a value is a valid notification type', () => {
    const validTypes = Object.values(NotificationType);
    
    expect(validTypes.includes('push' as NotificationType)).toBe(true);
    expect(validTypes.includes('email' as NotificationType)).toBe(true);
    expect(validTypes.includes('sms' as NotificationType)).toBe(true);
    expect(validTypes.includes('in_app' as NotificationType)).toBe(true);
    expect(validTypes.includes('invalid' as NotificationType)).toBe(false);
  });
});

describe('NotificationPriority Enum', () => {
  it('should have correct values for all priority levels', () => {
    expect(NotificationPriority.LOW).toBe('low');
    expect(NotificationPriority.MEDIUM).toBe('medium');
    expect(NotificationPriority.HIGH).toBe('high');
    expect(NotificationPriority.CRITICAL).toBe('critical');
  });

  it('should have exactly 4 priority levels', () => {
    const priorities = Object.keys(NotificationPriority);
    expect(priorities).toHaveLength(4);
  });

  it('should have all lowercase values', () => {
    Object.values(NotificationPriority).forEach((priority) => {
      expect(priority).toBe(priority.toLowerCase());
    });
  });

  it('should maintain hierarchical order', () => {
    const hierarchy = [
      NotificationPriority.LOW,
      NotificationPriority.MEDIUM,
      NotificationPriority.HIGH,
      NotificationPriority.CRITICAL,
    ];
    
    expect(hierarchy[0]).toBe('low');
    expect(hierarchy[1]).toBe('medium');
    expect(hierarchy[2]).toBe('high');
    expect(hierarchy[3]).toBe('critical');
  });

  it('should be able to check if a value is a valid priority', () => {
    const validPriorities = Object.values(NotificationPriority);
    
    expect(validPriorities.includes('low' as NotificationPriority)).toBe(true);
    expect(validPriorities.includes('medium' as NotificationPriority)).toBe(true);
    expect(validPriorities.includes('high' as NotificationPriority)).toBe(true);
    expect(validPriorities.includes('critical' as NotificationPriority)).toBe(true);
    expect(validPriorities.includes('invalid' as NotificationPriority)).toBe(false);
  });
});