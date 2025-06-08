import { SubscriptionType } from '../subscription-type.enum';

describe('SubscriptionType Enum', () => {
  it('should have correct values for all subscription types', () => {
    expect(SubscriptionType.FREE).toBe('free');
    expect(SubscriptionType.PREMIUM).toBe('premium');
    expect(SubscriptionType.ENTERPRISE).toBe('enterprise');
  });

  it('should have exactly 3 subscription types', () => {
    const types = Object.keys(SubscriptionType);
    expect(types).toHaveLength(3);
  });

  it('should have all lowercase values', () => {
    Object.values(SubscriptionType).forEach((type) => {
      expect(type).toBe(type.toLowerCase());
    });
  });

  it('should be able to check if a value is a valid subscription type', () => {
    const validTypes = Object.values(SubscriptionType);
    
    expect(validTypes.includes('free' as SubscriptionType)).toBe(true);
    expect(validTypes.includes('premium' as SubscriptionType)).toBe(true);
    expect(validTypes.includes('enterprise' as SubscriptionType)).toBe(true);
    expect(validTypes.includes('invalid' as SubscriptionType)).toBe(false);
  });

  it('should maintain hierarchical order', () => {
    const hierarchy = [SubscriptionType.FREE, SubscriptionType.PREMIUM, SubscriptionType.ENTERPRISE];
    expect(hierarchy[0]).toBe('free');
    expect(hierarchy[1]).toBe('premium');
    expect(hierarchy[2]).toBe('enterprise');
  });
});