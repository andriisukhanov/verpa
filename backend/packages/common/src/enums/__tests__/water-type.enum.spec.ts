import { WaterType } from '../water-type.enum';

describe('WaterType Enum', () => {
  it('should have correct values for all water types', () => {
    expect(WaterType.FRESHWATER).toBe('freshwater');
    expect(WaterType.SALTWATER).toBe('saltwater');
    expect(WaterType.BRACKISH).toBe('brackish');
  });

  it('should have exactly 3 water types', () => {
    const types = Object.keys(WaterType);
    expect(types).toHaveLength(3);
  });

  it('should have all lowercase values', () => {
    Object.values(WaterType).forEach((type) => {
      expect(type).toBe(type.toLowerCase());
    });
  });

  it('should be able to check if a value is a valid water type', () => {
    const validTypes = Object.values(WaterType);
    
    expect(validTypes.includes('freshwater' as WaterType)).toBe(true);
    expect(validTypes.includes('saltwater' as WaterType)).toBe(true);
    expect(validTypes.includes('brackish' as WaterType)).toBe(true);
    expect(validTypes.includes('invalid' as WaterType)).toBe(false);
  });

  it('should cover all common aquarium water types', () => {
    const waterTypes = Object.values(WaterType);
    const expectedTypes = ['freshwater', 'saltwater', 'brackish'];
    
    expectedTypes.forEach((type) => {
      expect(waterTypes).toContain(type);
    });
  });
});