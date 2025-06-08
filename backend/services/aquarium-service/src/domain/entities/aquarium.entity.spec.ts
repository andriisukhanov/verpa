import { Aquarium } from './aquarium.entity';
import { Equipment } from './equipment.entity';
import { Inhabitant } from './inhabitant.entity';
import { WaterParameters } from './water-parameters.entity';
import { WaterType, AquariumStatus, EquipmentType, EquipmentStatus, InhabitantType } from '@verpa/common';

describe('Aquarium Entity', () => {
  let aquarium: Aquarium;

  beforeEach(() => {
    aquarium = new Aquarium({
      userId: 'user123',
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });
  });

  describe('constructor', () => {
    it('should create aquarium with default values', () => {
      expect(aquarium.id).toBeDefined();
      expect(aquarium.status).toBe(AquariumStatus.ACTIVE);
      expect(aquarium.equipment).toEqual([]);
      expect(aquarium.inhabitants).toEqual([]);
      expect(aquarium.tags).toEqual([]);
      expect(aquarium.isPublic).toBe(false);
      expect(aquarium.createdAt).toBeInstanceOf(Date);
      expect(aquarium.updatedAt).toBeInstanceOf(Date);
    });

    it('should create aquarium with provided values', () => {
      const customAquarium = new Aquarium({
        id: 'custom-id',
        userId: 'user123',
        name: 'Custom Tank',
        description: 'A custom aquarium',
        waterType: WaterType.SALTWATER,
        volume: 200,
        dimensions: { length: 100, width: 50, height: 50 },
        tags: ['reef', 'display'],
        isPublic: true,
      });

      expect(customAquarium.id).toBe('custom-id');
      expect(customAquarium.description).toBe('A custom aquarium');
      expect(customAquarium.waterType).toBe(WaterType.SALTWATER);
      expect(customAquarium.volume).toBe(200);
      expect(customAquarium.dimensions).toEqual({ length: 100, width: 50, height: 50 });
      expect(customAquarium.tags).toEqual(['reef', 'display']);
      expect(customAquarium.isPublic).toBe(true);
    });
  });

  describe('equipment management', () => {
    let equipment: Equipment;

    beforeEach(() => {
      equipment = new Equipment({
        name: 'Test Filter',
        type: EquipmentType.FILTER,
      });
    });

    it('should add equipment', () => {
      aquarium.addEquipment(equipment);
      expect(aquarium.equipment).toHaveLength(1);
      expect(aquarium.equipment[0]).toBe(equipment);
    });

    it('should throw error when adding duplicate equipment', () => {
      aquarium.addEquipment(equipment);
      expect(() => aquarium.addEquipment(equipment)).toThrow('Equipment already exists in aquarium');
    });

    it('should remove equipment', () => {
      aquarium.addEquipment(equipment);
      aquarium.removeEquipment(equipment.id);
      expect(aquarium.equipment).toHaveLength(0);
    });

    it('should throw error when removing non-existent equipment', () => {
      expect(() => aquarium.removeEquipment('non-existent')).toThrow('Equipment not found in aquarium');
    });

    it('should update equipment', () => {
      aquarium.addEquipment(equipment);
      aquarium.updateEquipment(equipment.id, { name: 'Updated Filter' });
      expect(aquarium.equipment[0].name).toBe('Updated Filter');
    });

    it('should throw error when updating non-existent equipment', () => {
      expect(() => aquarium.updateEquipment('non-existent', {})).toThrow('Equipment not found in aquarium');
    });
  });

  describe('inhabitant management', () => {
    let inhabitant: Inhabitant;

    beforeEach(() => {
      inhabitant = new Inhabitant({
        name: 'Neon Tetra',
        type: InhabitantType.FISH,
        species: 'Paracheirodon innesi',
        quantity: 10,
        size: 'small',
        temperatureMin: 20,
        temperatureMax: 28,
        phMin: 6.0,
        phMax: 7.5,
        careLevel: 'easy',
      });
    });

    it('should add inhabitant', () => {
      aquarium.addInhabitant(inhabitant);
      expect(aquarium.inhabitants).toHaveLength(1);
      expect(aquarium.inhabitants[0]).toBe(inhabitant);
    });

    it('should throw error when adding duplicate inhabitant', () => {
      aquarium.addInhabitant(inhabitant);
      expect(() => aquarium.addInhabitant(inhabitant)).toThrow('Inhabitant already exists in aquarium');
    });

    it('should remove inhabitant', () => {
      aquarium.addInhabitant(inhabitant);
      aquarium.removeInhabitant(inhabitant.id);
      expect(aquarium.inhabitants).toHaveLength(0);
    });

    it('should throw error when removing non-existent inhabitant', () => {
      expect(() => aquarium.removeInhabitant('non-existent')).toThrow('Inhabitant not found in aquarium');
    });

    it('should update inhabitant', () => {
      aquarium.addInhabitant(inhabitant);
      aquarium.updateInhabitant(inhabitant.id, { quantity: 15 });
      expect(aquarium.inhabitants[0].quantity).toBe(15);
    });

    it('should calculate total inhabitants', () => {
      aquarium.addInhabitant(inhabitant);
      aquarium.addInhabitant(new Inhabitant({
        name: 'Corydoras',
        type: InhabitantType.FISH,
        species: 'Corydoras paleatus',
        quantity: 5,
        size: 'small',
        temperatureMin: 22,
        temperatureMax: 26,
        phMin: 6.5,
        phMax: 7.5,
        careLevel: 'easy',
      }));

      expect(aquarium.calculateTotalInhabitants()).toBe(15);
    });
  });

  describe('water parameters', () => {
    it('should update water parameters', () => {
      const parameters = new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
      });

      aquarium.updateWaterParameters(parameters);
      expect(aquarium.latestParameters).toBe(parameters);
    });
  });

  describe('bioload calculation', () => {
    it('should calculate bioload correctly', () => {
      aquarium.addInhabitant(new Inhabitant({
        name: 'Small Fish',
        type: InhabitantType.FISH,
        species: 'Small species',
        quantity: 10,
        size: 'small',
        temperatureMin: 20,
        temperatureMax: 28,
        phMin: 6.0,
        phMax: 7.5,
        careLevel: 'easy',
      }));

      aquarium.addInhabitant(new Inhabitant({
        name: 'Medium Fish',
        type: InhabitantType.FISH,
        species: 'Medium species',
        quantity: 3,
        size: 'medium',
        temperatureMin: 22,
        temperatureMax: 26,
        phMin: 6.5,
        phMax: 7.5,
        careLevel: 'moderate',
      }));

      expect(aquarium.calculateBioload()).toBe(19); // 10*1 + 3*3
    });

    it('should detect overstocking', () => {
      // Add many large fish to small tank
      aquarium.volume = 50; // Small tank
      
      aquarium.addInhabitant(new Inhabitant({
        name: 'Large Fish',
        type: InhabitantType.FISH,
        species: 'Large species',
        quantity: 10,
        size: 'large',
        temperatureMin: 24,
        temperatureMax: 28,
        phMin: 7.0,
        phMax: 8.0,
        careLevel: 'difficult',
      }));

      expect(aquarium.isOverstocked()).toBe(true);
    });
  });

  describe('health status', () => {
    it('should return warning when no parameters', () => {
      expect(aquarium.getHealthStatus()).toBe('warning');
    });

    it('should return healthy status with good parameters', () => {
      aquarium.updateWaterParameters(new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
        lastWaterChange: new Date(),
      }));

      expect(aquarium.getHealthStatus()).toBe('healthy');
    });

    it('should return critical status with dangerous parameters', () => {
      aquarium.updateWaterParameters(new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 35,
        ph: 5.5,
        ammonia: 2,
        nitrite: 2,
        nitrate: 100,
      }));

      expect(aquarium.getHealthStatus()).toBe('critical');
    });

    it('should return warning status with high nitrates', () => {
      aquarium.updateWaterParameters(new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 50,
      }));

      expect(aquarium.getHealthStatus()).toBe('warning');
    });
  });

  describe('water change detection', () => {
    it('should detect need for water change after 7 days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8);

      aquarium.updateWaterParameters(new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
        lastWaterChange: oldDate,
      }));

      expect(aquarium.needsWaterChange()).toBe(true);
    });

    it('should detect need for water change with high parameters', () => {
      aquarium.updateWaterParameters(new WaterParameters({
        aquariumId: aquarium.id,
        temperature: 25,
        ph: 7.0,
        ammonia: 0.5,
        nitrite: 0,
        nitrate: 20,
        lastWaterChange: new Date(),
      }));

      expect(aquarium.needsWaterChange()).toBe(true);
    });
  });

  describe('soft delete', () => {
    it('should mark as deleted', () => {
      aquarium.markAsDeleted();
      expect(aquarium.status).toBe(AquariumStatus.DELETED);
      expect(aquarium.deletedAt).toBeInstanceOf(Date);
    });

    it('should restore deleted aquarium', () => {
      aquarium.markAsDeleted();
      aquarium.restore();
      expect(aquarium.status).toBe(AquariumStatus.ACTIVE);
      expect(aquarium.deletedAt).toBeUndefined();
    });

    it('should throw error when restoring non-deleted aquarium', () => {
      expect(() => aquarium.restore()).toThrow('Aquarium is not deleted');
    });
  });
});