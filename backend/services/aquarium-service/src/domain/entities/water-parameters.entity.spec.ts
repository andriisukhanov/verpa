import { WaterParameters } from './water-parameters.entity';

describe('WaterParameters Entity', () => {
  let parameters: WaterParameters;

  beforeEach(() => {
    parameters = new WaterParameters({
      aquariumId: 'aquarium123',
      temperature: 25,
      ph: 7.0,
    });
  });

  describe('constructor', () => {
    it('should create parameters with default values', () => {
      expect(parameters.id).toBeDefined();
      expect(parameters.recordedAt).toBeInstanceOf(Date);
      expect(parameters.createdAt).toBeInstanceOf(Date);
    });

    it('should create parameters with provided values', () => {
      const recordedAt = new Date('2024-01-01');
      const customParams = new WaterParameters({
        id: 'custom-id',
        aquariumId: 'aquarium123',
        temperature: 26,
        ph: 7.2,
        ammonia: 0.25,
        nitrite: 0.1,
        nitrate: 30,
        phosphate: 0.5,
        kh: 6,
        gh: 8,
        recordedAt,
        recordedBy: 'user123',
        notes: 'Weekly test',
      });

      expect(customParams.id).toBe('custom-id');
      expect(customParams.ammonia).toBe(0.25);
      expect(customParams.nitrite).toBe(0.1);
      expect(customParams.nitrate).toBe(30);
      expect(customParams.phosphate).toBe(0.5);
      expect(customParams.kh).toBe(6);
      expect(customParams.gh).toBe(8);
      expect(customParams.recordedAt).toBe(recordedAt);
      expect(customParams.recordedBy).toBe('user123');
      expect(customParams.notes).toBe('Weekly test');
    });
  });

  describe('parameter checks', () => {
    it('should check temperature optimality', () => {
      expect(parameters.isTemperatureOptimal(20, 30)).toBe(true);
      expect(parameters.isTemperatureOptimal(26, 30)).toBe(false);
      expect(parameters.isTemperatureOptimal(20, 24)).toBe(false);
    });

    it('should check pH optimality', () => {
      expect(parameters.isPhOptimal(6.5, 7.5)).toBe(true);
      expect(parameters.isPhOptimal(7.2, 8.0)).toBe(false);
      expect(parameters.isPhOptimal(6.0, 6.8)).toBe(false);
    });

    it('should detect high ammonia', () => {
      parameters.ammonia = 0.1;
      expect(parameters.hasHighAmmonia()).toBe(false);
      
      parameters.ammonia = 0.3;
      expect(parameters.hasHighAmmonia()).toBe(true);
      
      parameters.ammonia = undefined;
      expect(parameters.hasHighAmmonia()).toBe(false);
    });

    it('should detect high nitrite', () => {
      parameters.nitrite = 0.1;
      expect(parameters.hasHighNitrite()).toBe(false);
      
      parameters.nitrite = 0.5;
      expect(parameters.hasHighNitrite()).toBe(true);
    });

    it('should detect high nitrate', () => {
      parameters.nitrate = 30;
      expect(parameters.hasHighNitrate()).toBe(false);
      
      parameters.nitrate = 50;
      expect(parameters.hasHighNitrate()).toBe(true);
    });
  });

  describe('cycling status', () => {
    it('should detect cycled aquarium', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 20;
      expect(parameters.isCycled()).toBe(true);
    });

    it('should detect uncycled aquarium with ammonia', () => {
      parameters.ammonia = 1;
      parameters.nitrite = 0;
      parameters.nitrate = 0;
      expect(parameters.isCycled()).toBe(false);
    });

    it('should detect uncycled aquarium with nitrite', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0.5;
      parameters.nitrate = 10;
      expect(parameters.isCycled()).toBe(false);
    });

    it('should handle undefined values', () => {
      parameters.ammonia = undefined;
      parameters.nitrite = undefined;
      parameters.nitrate = undefined;
      expect(parameters.isCycled()).toBe(false);
    });
  });

  describe('water change', () => {
    it('should detect need for water change', () => {
      parameters.nitrate = 50;
      expect(parameters.needsWaterChange()).toBe(true);
      
      parameters.nitrate = 20;
      parameters.ammonia = 0.5;
      expect(parameters.needsWaterChange()).toBe(true);
      
      parameters.ammonia = 0;
      parameters.nitrite = 0.5;
      expect(parameters.needsWaterChange()).toBe(true);
    });

    it('should not need water change with good parameters', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 20;
      expect(parameters.needsWaterChange()).toBe(false);
    });

    it('should calculate days since water change', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      parameters.lastWaterChange = pastDate;

      expect(parameters.getDaysSinceWaterChange()).toBe(5);
    });

    it('should return null if no water change date', () => {
      parameters.lastWaterChange = undefined;
      expect(parameters.getDaysSinceWaterChange()).toBeNull();
    });
  });

  describe('parameter status', () => {
    it('should return optimal status for good parameters', () => {
      expect(parameters.getParameterStatus('temperature', 25)).toBe('optimal');
      expect(parameters.getParameterStatus('ph', 7.0)).toBe('optimal');
      expect(parameters.getParameterStatus('ammonia', 0)).toBe('optimal');
      expect(parameters.getParameterStatus('nitrite', 0)).toBe('optimal');
      expect(parameters.getParameterStatus('nitrate', 10)).toBe('optimal');
    });

    it('should return warning status for concerning parameters', () => {
      expect(parameters.getParameterStatus('temperature', 30)).toBe('warning');
      expect(parameters.getParameterStatus('ph', 8.2)).toBe('warning');
      expect(parameters.getParameterStatus('ammonia', 0.2)).toBe('warning');
      expect(parameters.getParameterStatus('nitrite', 0.2)).toBe('warning');
      expect(parameters.getParameterStatus('nitrate', 35)).toBe('warning');
    });

    it('should return critical status for dangerous parameters', () => {
      expect(parameters.getParameterStatus('temperature', 35)).toBe('critical');
      expect(parameters.getParameterStatus('ph', 9.5)).toBe('critical');
      expect(parameters.getParameterStatus('ammonia', 1)).toBe('critical');
      expect(parameters.getParameterStatus('nitrite', 1)).toBe('critical');
      expect(parameters.getParameterStatus('nitrate', 100)).toBe('critical');
    });

    it('should return optimal for unknown parameters', () => {
      expect(parameters.getParameterStatus('unknown', 50)).toBe('optimal');
    });
  });

  describe('overall status', () => {
    it('should return optimal when all parameters are good', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 20;
      parameters.ph = 7.0;
      parameters.temperature = 25;

      expect(parameters.getOverallStatus()).toBe('optimal');
    });

    it('should return warning when any parameter is warning', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 35; // warning
      parameters.ph = 7.0;
      parameters.temperature = 25;

      expect(parameters.getOverallStatus()).toBe('warning');
    });

    it('should return critical when any parameter is critical', () => {
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 35; // warning
      parameters.ph = 7.0;
      parameters.temperature = 40; // critical

      expect(parameters.getOverallStatus()).toBe('critical');
    });

    it('should prioritize critical over warning', () => {
      parameters.ammonia = 2; // critical
      parameters.nitrite = 0.2; // warning
      parameters.nitrate = 35; // warning

      expect(parameters.getOverallStatus()).toBe('critical');
    });
  });

  describe('toJSON', () => {
    it('should include calculated fields', () => {
      const waterChangeDate = new Date();
      waterChangeDate.setDate(waterChangeDate.getDate() - 3);
      
      parameters.lastWaterChange = waterChangeDate;
      parameters.ammonia = 0;
      parameters.nitrite = 0;
      parameters.nitrate = 20;

      const json = parameters.toJSON();

      expect(json).toHaveProperty('daysSinceWaterChange', 3);
      expect(json).toHaveProperty('overallStatus', 'optimal');
      expect(json).toHaveProperty('parameterStatuses');
      expect(json.parameterStatuses).toHaveProperty('temperature', 'optimal');
      expect(json.parameterStatuses).toHaveProperty('ph', 'optimal');
      expect(json.parameterStatuses).toHaveProperty('ammonia', 'optimal');
    });
  });
});