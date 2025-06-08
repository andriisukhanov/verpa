import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AquariumDomainService } from './aquarium.domain.service';
import { IAquariumRepository } from '../repositories/aquarium.repository.interface';
import { IWaterParametersRepository } from '../repositories/water-parameters.repository.interface';
import { Aquarium } from '../entities/aquarium.entity';
import { Equipment } from '../entities/equipment.entity';
import { Inhabitant } from '../entities/inhabitant.entity';
import { WaterParameters } from '../entities/water-parameters.entity';
import { WaterType, AquariumStatus, SubscriptionType, EquipmentType, InhabitantType } from '@verpa/common';

describe('AquariumDomainService', () => {
  let service: AquariumDomainService;
  let aquariumRepository: jest.Mocked<IAquariumRepository>;
  let waterParametersRepository: jest.Mocked<IWaterParametersRepository>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockAquariumRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUserId: jest.fn(),
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    countByUserId: jest.fn(),
    exists: jest.fn(),
    findPublicAquariums: jest.fn(),
  };

  const mockWaterParametersRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByAquariumId: jest.fn(),
    findLatestByAquariumId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByAquariumId: jest.fn(),
    getAverageParameters: jest.fn(),
    getParameterTrends: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AquariumDomainService,
          useFactory: (repo, paramRepo, config, events) => 
            new AquariumDomainService(repo, paramRepo, config, events),
          inject: ['IAquariumRepository', 'IWaterParametersRepository', ConfigService, EventEmitter2],
        },
        {
          provide: 'IAquariumRepository',
          useValue: mockAquariumRepository,
        },
        {
          provide: 'IWaterParametersRepository',
          useValue: mockWaterParametersRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AquariumDomainService>(AquariumDomainService);
    aquariumRepository = module.get('IAquariumRepository');
    waterParametersRepository = module.get('IWaterParametersRepository');
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);

    // Setup default config values
    mockConfigService.get.mockImplementation((key) => {
      const config = {
        'limits.maxAquariumsPerUser': {
          basic: 3,
          premium: 10,
          professional: -1,
        },
        'limits.maxEquipmentPerAquarium': 50,
        'limits.maxInhabitantsPerAquarium': 100,
      };
      return config[key];
    });

    jest.clearAllMocks();
  });

  describe('createAquarium', () => {
    const userId = 'user123';
    const aquariumData = {
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    };

    it('should create aquarium successfully', async () => {
      mockAquariumRepository.countByUserId.mockResolvedValue(0);
      mockAquariumRepository.create.mockResolvedValue(
        new Aquarium({ id: 'aqua123', ...aquariumData, userId })
      );

      const result = await service.createAquarium(userId, aquariumData, SubscriptionType.BASIC);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.name).toBe(aquariumData.name);
      expect(aquariumRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.created', expect.any(Object));
    });

    it('should throw error when limit reached for basic subscription', async () => {
      mockAquariumRepository.countByUserId.mockResolvedValue(3);

      await expect(
        service.createAquarium(userId, aquariumData, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow unlimited aquariums for professional subscription', async () => {
      mockAquariumRepository.countByUserId.mockResolvedValue(100);
      mockAquariumRepository.create.mockResolvedValue(
        new Aquarium({ id: 'aqua123', ...aquariumData, userId })
      );

      const result = await service.createAquarium(userId, aquariumData, SubscriptionType.PROFESSIONAL);
      expect(result).toBeDefined();
    });

    it('should throw error for invalid aquarium data', async () => {
      mockAquariumRepository.countByUserId.mockResolvedValue(0);
      
      await expect(
        service.createAquarium(userId, { ...aquariumData, name: '' }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createAquarium(userId, { ...aquariumData, volume: -10 }, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAquarium', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const existingAquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });

    it('should update aquarium successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(existingAquarium);
      mockAquariumRepository.update.mockResolvedValue(
        new Aquarium({ ...existingAquarium, name: 'Updated Tank' })
      );

      const result = await service.updateAquarium(aquariumId, userId, { name: 'Updated Tank' });

      expect(result.name).toBe('Updated Tank');
      expect(aquariumRepository.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.updated', expect.any(Object));
    });

    it('should throw error if aquarium not found', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.updateAquarium(aquariumId, userId, { name: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAquarium', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const existingAquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });

    it('should delete aquarium successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(existingAquarium);
      mockAquariumRepository.update.mockResolvedValue(existingAquarium);

      await service.deleteAquarium(aquariumId, userId);

      expect(aquariumRepository.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.deleted', expect.any(Object));
    });

    it('should throw error if aquarium not found', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.deleteAquarium(aquariumId, userId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addEquipment', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });

    it('should add equipment successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const equipmentData = {
        name: 'Test Filter',
        type: EquipmentType.FILTER,
      };

      const result = await service.addEquipment(aquariumId, userId, equipmentData);

      expect(result.equipment).toHaveLength(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('equipment.added', expect.any(Object));
    });

    it('should throw error when equipment limit reached', async () => {
      const fullAquarium = new Aquarium({ ...aquarium });
      // Add max equipment
      for (let i = 0; i < 50; i++) {
        fullAquarium.equipment.push(new Equipment({
          name: `Equipment ${i}`,
          type: EquipmentType.OTHER,
        }));
      }

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(fullAquarium);

      await expect(
        service.addEquipment(aquariumId, userId, { name: 'New', type: EquipmentType.FILTER })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addInhabitant', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      latestParameters: new WaterParameters({
        aquariumId,
        temperature: 25,
        ph: 7.0,
      }),
    });

    it('should add compatible inhabitant successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const inhabitantData = {
        name: 'Neon Tetra',
        type: InhabitantType.FISH,
        species: 'Paracheirodon innesi',
        quantity: 10,
        size: 'small' as const,
        temperatureMin: 20,
        temperatureMax: 28,
        phMin: 6.0,
        phMax: 7.5,
        careLevel: 'easy' as const,
      };

      const result = await service.addInhabitant(aquariumId, userId, inhabitantData);

      expect(result.inhabitants).toHaveLength(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('inhabitant.added', expect.any(Object));
    });

    it('should throw error for incompatible water type', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const coralData = {
        name: 'Test Coral',
        type: InhabitantType.CORAL,
        species: 'Test species',
        quantity: 1,
        size: 'medium' as const,
        temperatureMin: 24,
        temperatureMax: 26,
        phMin: 8.0,
        phMax: 8.4,
        careLevel: 'moderate' as const,
      };

      await expect(
        service.addInhabitant(aquariumId, userId, coralData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for incompatible temperature', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const inhabitantData = {
        name: 'Cold Water Fish',
        type: InhabitantType.FISH,
        species: 'Cold species',
        quantity: 1,
        size: 'medium' as const,
        temperatureMin: 10,
        temperatureMax: 18,
        phMin: 6.5,
        phMax: 7.5,
        careLevel: 'moderate' as const,
      };

      await expect(
        service.addInhabitant(aquariumId, userId, inhabitantData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit overstocked event when bioload exceeded', async () => {
      const smallAquarium = new Aquarium({ ...aquarium, volume: 20 }); // Small tank
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(smallAquarium);
      mockAquariumRepository.update.mockResolvedValue(smallAquarium);

      const inhabitantData = {
        name: 'Large Fish',
        type: InhabitantType.FISH,
        species: 'Large species',
        quantity: 5,
        size: 'large' as const,
        temperatureMin: 24,
        temperatureMax: 26,
        phMin: 6.8,
        phMax: 7.2,
        careLevel: 'difficult' as const,
      };

      await service.addInhabitant(aquariumId, userId, inhabitantData);

      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.overstocked', expect.any(Object));
    });
  });

  describe('recordWaterParameters', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });

    it('should record parameters successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);
      
      const parameters = new WaterParameters({
        aquariumId,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
      });
      
      mockWaterParametersRepository.create.mockResolvedValue(parameters);

      const result = await service.recordWaterParameters(aquariumId, userId, parameters);

      expect(result).toBeDefined();
      expect(waterParametersRepository.create).toHaveBeenCalled();
      expect(aquariumRepository.update).toHaveBeenCalled();
    });

    it('should emit critical alert for dangerous parameters', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);
      
      const dangerousParams = new WaterParameters({
        aquariumId,
        temperature: 35,
        ph: 9.0,
        ammonia: 2,
        nitrite: 1,
        nitrate: 100,
      });
      
      mockWaterParametersRepository.create.mockResolvedValue(dangerousParams);

      await service.recordWaterParameters(aquariumId, userId, dangerousParams);

      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.critical', expect.any(Object));
    });

    it('should emit water change needed event', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);
      
      const highNitrateParams = new WaterParameters({
        aquariumId,
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 50,
      });
      
      mockWaterParametersRepository.create.mockResolvedValue(highNitrateParams);

      await service.recordWaterParameters(aquariumId, userId, highNitrateParams);

      expect(eventEmitter.emit).toHaveBeenCalledWith('aquarium.waterChangeNeeded', expect.any(Object));
    });

    it('should throw error for invalid parameters for water type', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const saltwaterParams = {
        temperature: 25,
        ph: 8.2,
        salinity: 35, // Should not be in freshwater
      };

      await expect(
        service.recordWaterParameters(aquariumId, userId, saltwaterParams)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEquipmentMaintenanceDate', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const equipmentId = 'equip123';
    const equipment = new Equipment({
      id: equipmentId,
      name: 'Test Filter',
      type: EquipmentType.FILTER,
    });
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      equipment: [equipment],
    });

    it('should update equipment maintenance date', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const result = await service.updateEquipmentMaintenanceDate(aquariumId, userId, equipmentId);

      expect(result.equipment[0].lastMaintenanceDate).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('equipment.maintenancePerformed', expect.any(Object));
    });

    it('should throw error if equipment not found', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      await expect(
        service.updateEquipmentMaintenanceDate(aquariumId, userId, 'invalid-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeEquipment', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const equipmentId = 'equip123';
    const equipment = new Equipment({
      id: equipmentId,
      name: 'Test Filter',
      type: EquipmentType.FILTER,
    });
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      equipment: [equipment],
    });

    it('should remove equipment successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const result = await service.removeEquipment(aquariumId, userId, equipmentId);

      expect(result.equipment).toHaveLength(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('equipment.removed', expect.any(Object));
    });
  });

  describe('removeInhabitant', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const inhabitantId = 'inhab123';
    const inhabitant = new Inhabitant({
      id: inhabitantId,
      name: 'Test Fish',
      type: InhabitantType.FISH,
      species: 'Test species',
      quantity: 5,
    });
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      inhabitants: [inhabitant],
    });

    it('should remove inhabitant successfully', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const result = await service.removeInhabitant(aquariumId, userId, inhabitantId, 3);

      expect(result.inhabitants[0].quantity).toBe(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('inhabitant.removed', expect.any(Object));
    });

    it('should remove inhabitant completely when quantity matches', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      mockAquariumRepository.update.mockResolvedValue(aquarium);

      const result = await service.removeInhabitant(aquariumId, userId, inhabitantId, 5);

      expect(result.inhabitants).toHaveLength(0);
    });

    it('should throw error for invalid quantity', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      await expect(
        service.removeInhabitant(aquariumId, userId, inhabitantId, 10)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getParameterTrends', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const aquarium = new Aquarium({
      id: aquariumId,
      userId,
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
    });

    it('should get parameter trends', async () => {
      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);
      
      const mockTrends = {
        temperature: { avg: 25, min: 24, max: 26, trend: 'stable' },
        ph: { avg: 7.0, min: 6.8, max: 7.2, trend: 'increasing' },
      };
      mockWaterParametersRepository.getParameterTrends.mockResolvedValue(mockTrends);

      const result = await service.getParameterTrends(aquariumId, userId, 7);

      expect(result).toEqual(mockTrends);
      expect(waterParametersRepository.getParameterTrends).toHaveBeenCalledWith(aquariumId, 7);
    });
  });

  describe('getMaintenanceSchedule', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    it('should generate maintenance schedule', async () => {
      const equipment1 = new Equipment({
        id: 'filter1',
        name: 'Filter',
        type: EquipmentType.FILTER,
        lastMaintenanceDate: threeWeeksAgo,
      });
      const equipment2 = new Equipment({
        id: 'heater1',
        name: 'Heater',
        type: EquipmentType.HEATER,
        lastMaintenanceDate: oneWeekAgo,
      });

      const aquarium = new Aquarium({
        id: aquariumId,
        userId,
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        equipment: [equipment1, equipment2],
      });

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const schedule = await service.getMaintenanceSchedule(aquariumId, userId);

      expect(schedule).toHaveLength(2);
      expect(schedule[0].equipmentId).toBe('filter1');
      expect(schedule[0].daysOverdue).toBeGreaterThan(0);
      expect(schedule[1].equipmentId).toBe('heater1');
    });

    it('should prioritize overdue maintenance', async () => {
      const equipment1 = new Equipment({
        id: 'filter1',
        name: 'Filter',
        type: EquipmentType.FILTER,
        lastMaintenanceDate: threeWeeksAgo,
      });
      const equipment2 = new Equipment({
        id: 'heater1',
        name: 'Heater',
        type: EquipmentType.HEATER,
        lastMaintenanceDate: now,
      });

      const aquarium = new Aquarium({
        id: aquariumId,
        userId,
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        equipment: [equipment2, equipment1],
      });

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const schedule = await service.getMaintenanceSchedule(aquariumId, userId);

      expect(schedule[0].equipmentId).toBe('filter1');
      expect(schedule[0].priority).toBe('high');
    });
  });

  describe('checkCompatibility', () => {
    const aquariumId = 'aqua123';
    const userId = 'user123';

    it('should check inhabitant compatibility', async () => {
      const inhabitant1 = new Inhabitant({
        name: 'Neon Tetra',
        type: InhabitantType.FISH,
        species: 'Paracheirodon innesi',
        quantity: 10,
        temperatureMin: 20,
        temperatureMax: 28,
        phMin: 6.0,
        phMax: 7.5,
        aggressionLevel: 'peaceful',
      });

      const aquarium = new Aquarium({
        id: aquariumId,
        userId,
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [inhabitant1],
        latestParameters: new WaterParameters({
          aquariumId,
          temperature: 25,
          ph: 7.0,
        }),
      });

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const newInhabitant = {
        name: 'Cardinal Tetra',
        type: InhabitantType.FISH,
        species: 'Paracheirodon axelrodi',
        quantity: 5,
        temperatureMin: 23,
        temperatureMax: 27,
        phMin: 6.0,
        phMax: 7.0,
        aggressionLevel: 'peaceful',
      };

      const result = await service.checkCompatibility(aquariumId, userId, newInhabitant);

      expect(result.compatible).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect incompatible parameters', async () => {
      const aquarium = new Aquarium({
        id: aquariumId,
        userId,
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [],
        latestParameters: new WaterParameters({
          aquariumId,
          temperature: 25,
          ph: 7.0,
        }),
      });

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const newInhabitant = {
        name: 'Cold Water Fish',
        type: InhabitantType.FISH,
        species: 'Cold species',
        quantity: 1,
        temperatureMin: 10,
        temperatureMax: 18,
        phMin: 7.5,
        phMax: 8.5,
        aggressionLevel: 'peaceful',
      };

      const result = await service.checkCompatibility(aquariumId, userId, newInhabitant);

      expect(result.compatible).toBe(false);
      expect(result.warnings).toContain('Temperature requirements not compatible');
      expect(result.warnings).toContain('pH requirements not compatible');
    });

    it('should detect aggression conflicts', async () => {
      const peacefulFish = new Inhabitant({
        name: 'Peaceful Fish',
        type: InhabitantType.FISH,
        species: 'Peaceful species',
        quantity: 5,
        temperatureMin: 24,
        temperatureMax: 26,
        phMin: 6.8,
        phMax: 7.2,
        aggressionLevel: 'peaceful',
      });

      const aquarium = new Aquarium({
        id: aquariumId,
        userId,
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [peacefulFish],
        latestParameters: new WaterParameters({
          aquariumId,
          temperature: 25,
          ph: 7.0,
        }),
      });

      mockAquariumRepository.findByIdAndUserId.mockResolvedValue(aquarium);

      const aggressiveFish = {
        name: 'Aggressive Fish',
        type: InhabitantType.FISH,
        species: 'Aggressive species',
        quantity: 1,
        temperatureMin: 24,
        temperatureMax: 26,
        phMin: 6.8,
        phMax: 7.2,
        aggressionLevel: 'aggressive',
      };

      const result = await service.checkCompatibility(aquariumId, userId, aggressiveFish);

      expect(result.compatible).toBe(false);
      expect(result.warnings).toContain('Aggressive fish may harm peaceful inhabitants');
    });
  });
});