import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AquariumService } from './aquarium.service';
import { AquariumDomainService } from '../../domain/services/aquarium.domain.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { EventService } from '../../infrastructure/events/event.service';
import { Aquarium } from '../../domain/entities/aquarium.entity';
import { Equipment } from '../../domain/entities/equipment.entity';
import { Inhabitant } from '../../domain/entities/inhabitant.entity';
import { WaterParameters } from '../../domain/entities/water-parameters.entity';
import { WaterType, AquariumStatus, EquipmentType, InhabitantType, SubscriptionType } from '@verpa/common';

describe('AquariumService', () => {
  let service: AquariumService;
  let domainService: jest.Mocked<AquariumDomainService>;
  let storageService: jest.Mocked<StorageService>;
  let eventService: jest.Mocked<EventService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockDomainService = {
    createAquarium: jest.fn(),
    updateAquarium: jest.fn(),
    deleteAquarium: jest.fn(),
    getAquarium: jest.fn(),
    getUserAquariums: jest.fn(),
    getPublicAquariums: jest.fn(),
    addEquipment: jest.fn(),
    updateEquipmentMaintenanceDate: jest.fn(),
    removeEquipment: jest.fn(),
    addInhabitant: jest.fn(),
    removeInhabitant: jest.fn(),
    recordWaterParameters: jest.fn(),
    getWaterParametersHistory: jest.fn(),
    getParameterTrends: jest.fn(),
    getMaintenanceSchedule: jest.fn(),
    checkCompatibility: jest.fn(),
  };

  const mockStorageService = {
    uploadAquariumImage: jest.fn(),
    uploadInhabitantImage: jest.fn(),
    deleteImage: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockEventService = {
    publishAquariumEvent: jest.fn(),
  };

  const mockEventEmitter = {
    on: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AquariumService,
        {
          provide: AquariumDomainService,
          useValue: mockDomainService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AquariumService>(AquariumService);
    domainService = module.get(AquariumDomainService);
    storageService = module.get(StorageService);
    eventService = module.get(EventService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      description: 'Test description',
    };

    it('should create aquarium successfully', async () => {
      const aquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        ...createDto,
      });

      mockDomainService.createAquarium.mockResolvedValue(aquarium);

      const result = await service.create('user123', createDto, SubscriptionType.BASIC);

      expect(result).toBeDefined();
      expect(result.id).toBe('aqua123');
      expect(result.name).toBe('Test Tank');
      expect(domainService.createAquarium).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining(createDto),
        SubscriptionType.BASIC
      );
    });

    it('should handle domain service errors', async () => {
      mockDomainService.createAquarium.mockRejectedValue(
        new BadRequestException('Limit reached')
      );

      await expect(
        service.create('user123', createDto, SubscriptionType.BASIC)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return user aquariums', async () => {
      const aquariums = [
        new Aquarium({
          id: 'aqua1',
          userId: 'user123',
          name: 'Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
        }),
        new Aquarium({
          id: 'aqua2',
          userId: 'user123',
          name: 'Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
        }),
      ];

      mockDomainService.getUserAquariums.mockResolvedValue(aquariums);

      const result = await service.findAll('user123', {});

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Tank 1');
      expect(result[1].name).toBe('Tank 2');
    });

    it('should pass filter options to domain service', async () => {
      mockDomainService.getUserAquariums.mockResolvedValue([]);

      await service.findAll('user123', {
        status: AquariumStatus.MAINTENANCE,
        page: 2,
        limit: 20,
      });

      expect(domainService.getUserAquariums).toHaveBeenCalledWith('user123', {
        status: AquariumStatus.MAINTENANCE,
        page: 2,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return aquarium by id', async () => {
      const aquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
      });

      mockDomainService.getAquarium.mockResolvedValue(aquarium);

      const result = await service.findOne('aqua123', 'user123');

      expect(result).toBeDefined();
      expect(result.id).toBe('aqua123');
      expect(result.name).toBe('Test Tank');
    });

    it('should throw NotFoundException if aquarium not found', async () => {
      mockDomainService.getAquarium.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'user123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Tank',
      volume: 150,
    };

    it('should update aquarium successfully', async () => {
      const updatedAquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Updated Tank',
        waterType: WaterType.FRESHWATER,
        volume: 150,
      });

      mockDomainService.updateAquarium.mockResolvedValue(updatedAquarium);

      const result = await service.update('aqua123', 'user123', updateDto);

      expect(result.name).toBe('Updated Tank');
      expect(result.volume).toBe(150);
      expect(domainService.updateAquarium).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should delete aquarium', async () => {
      mockDomainService.deleteAquarium.mockResolvedValue(undefined);

      await service.remove('aqua123', 'user123');

      expect(domainService.deleteAquarium).toHaveBeenCalledWith('aqua123', 'user123');
    });
  });

  describe('uploadImage', () => {
    it('should upload aquarium image', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
        size: 1000,
      } as Express.Multer.File;

      const imageUrl = 'https://storage.example.com/aquarium/aqua123/image.jpg';
      mockStorageService.uploadAquariumImage.mockResolvedValue(imageUrl);

      const updatedAquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        imageUrl,
      });
      mockDomainService.updateAquarium.mockResolvedValue(updatedAquarium);

      const result = await service.uploadImage('aqua123', 'user123', file);

      expect(result.imageUrl).toBe(imageUrl);
      expect(storageService.uploadAquariumImage).toHaveBeenCalledWith(
        'aqua123',
        file.buffer,
        file.mimetype
      );
      expect(domainService.updateAquarium).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        { imageUrl }
      );
    });

    it('should reject invalid file types', async () => {
      const file = {
        buffer: Buffer.from('fake-doc'),
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        size: 1000,
      } as Express.Multer.File;

      await expect(
        service.uploadImage('aqua123', 'user123', file)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject large files', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      await expect(
        service.uploadImage('aqua123', 'user123', file)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addEquipment', () => {
    const equipmentDto = {
      name: 'Test Filter',
      type: EquipmentType.FILTER,
      brand: 'TestBrand',
      model: 'TestModel',
    };

    it('should add equipment successfully', async () => {
      const aquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        equipment: [new Equipment({ id: 'equip123', ...equipmentDto })],
      });

      mockDomainService.addEquipment.mockResolvedValue(aquarium);

      const result = await service.addEquipment('aqua123', 'user123', equipmentDto);

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0].name).toBe('Test Filter');
    });
  });

  describe('addInhabitant', () => {
    const inhabitantDto = {
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

    it('should add inhabitant successfully', async () => {
      const aquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [new Inhabitant({ id: 'inhab123', ...inhabitantDto })],
      });

      mockDomainService.addInhabitant.mockResolvedValue(aquarium);

      const result = await service.addInhabitant('aqua123', 'user123', inhabitantDto);

      expect(result.inhabitants).toHaveLength(1);
      expect(result.inhabitants[0].species).toBe('Paracheirodon innesi');
    });
  });

  describe('uploadInhabitantImage', () => {
    it('should upload inhabitant image', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'fish.jpg',
        size: 1000,
      } as Express.Multer.File;

      const imageUrl = 'https://storage.example.com/inhabitant/inhab123/image.jpg';
      mockStorageService.uploadInhabitantImage.mockResolvedValue(imageUrl);

      const aquarium = new Aquarium({
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [
          new Inhabitant({
            id: 'inhab123',
            name: 'Test Fish',
            type: InhabitantType.FISH,
            species: 'Test species',
            quantity: 1,
            imageUrl,
          }),
        ],
      });

      mockDomainService.getAquarium.mockResolvedValue(aquarium);
      mockDomainService.updateAquarium.mockResolvedValue(aquarium);

      const result = await service.uploadInhabitantImage(
        'aqua123',
        'user123',
        'inhab123',
        file
      );

      expect(result.inhabitants[0].imageUrl).toBe(imageUrl);
      expect(storageService.uploadInhabitantImage).toHaveBeenCalledWith(
        'inhab123',
        file.buffer,
        file.mimetype
      );
    });
  });

  describe('recordParameters', () => {
    const parametersDto = {
      temperature: 25,
      ph: 7.0,
      ammonia: 0,
      nitrite: 0,
      nitrate: 20,
      notes: 'Weekly test',
    };

    it('should record water parameters', async () => {
      const parameters = new WaterParameters({
        id: 'param123',
        aquariumId: 'aqua123',
        ...parametersDto,
        recordedBy: 'user123',
      });

      mockDomainService.recordWaterParameters.mockResolvedValue(parameters);

      const result = await service.recordParameters('aqua123', 'user123', parametersDto);

      expect(result.temperature).toBe(25);
      expect(result.recordedBy).toBe('user123');
    });
  });

  describe('getParametersHistory', () => {
    it('should return parameters history', async () => {
      const parameters = [
        new WaterParameters({
          id: 'param1',
          aquariumId: 'aqua123',
          temperature: 25,
          ph: 7.0,
          recordedAt: new Date(),
        }),
        new WaterParameters({
          id: 'param2',
          aquariumId: 'aqua123',
          temperature: 24,
          ph: 7.1,
          recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      ];

      mockDomainService.getWaterParametersHistory.mockResolvedValue(parameters);

      const result = await service.getParametersHistory('aqua123', 'user123', {});

      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(25);
      expect(result[1].temperature).toBe(24);
    });
  });

  describe('getParameterTrends', () => {
    it('should return parameter trends', async () => {
      const trends = {
        temperature: { avg: 25, min: 24, max: 26, trend: 'stable' },
        ph: { avg: 7.0, min: 6.8, max: 7.2, trend: 'increasing' },
        ammonia: { avg: 0.1, min: 0, max: 0.25, trend: 'decreasing' },
      };

      mockDomainService.getParameterTrends.mockResolvedValue(trends);

      const result = await service.getParameterTrends('aqua123', 'user123', 7);

      expect(result).toEqual(trends);
      expect(domainService.getParameterTrends).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        7
      );
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('should return maintenance schedule', async () => {
      const schedule = [
        {
          equipmentId: 'equip1',
          equipmentName: 'Filter',
          equipmentType: EquipmentType.FILTER,
          lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          nextMaintenance: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          daysOverdue: 5,
          priority: 'high' as const,
        },
      ];

      mockDomainService.getMaintenanceSchedule.mockResolvedValue(schedule);

      const result = await service.getMaintenanceSchedule('aqua123', 'user123');

      expect(result).toEqual(schedule);
    });
  });

  describe('checkCompatibility', () => {
    const inhabitantDto = {
      name: 'Test Fish',
      type: InhabitantType.FISH,
      species: 'Test species',
      quantity: 1,
      size: 'medium' as const,
      temperatureMin: 24,
      temperatureMax: 26,
      phMin: 6.8,
      phMax: 7.2,
      careLevel: 'moderate' as const,
    };

    it('should check compatibility', async () => {
      const compatibility = {
        compatible: true,
        warnings: [],
        suggestions: ['Consider adding more hiding spots'],
      };

      mockDomainService.checkCompatibility.mockResolvedValue(compatibility);

      const result = await service.checkCompatibility('aqua123', 'user123', inhabitantDto);

      expect(result).toEqual(compatibility);
    });
  });

  describe('findPublic', () => {
    it('should return public aquariums', async () => {
      const aquariums = [
        new Aquarium({
          id: 'aqua1',
          userId: 'user1',
          name: 'Public Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          isPublic: true,
        }),
        new Aquarium({
          id: 'aqua2',
          userId: 'user2',
          name: 'Public Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
          isPublic: true,
        }),
      ];

      mockDomainService.getPublicAquariums.mockResolvedValue(aquariums);

      const result = await service.findPublic({});

      expect(result).toHaveLength(2);
      expect(result.every(a => a.isPublic)).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should handle aquarium.created event', () => {
      const handler = mockEventEmitter.on.mock.calls.find(
        call => call[0] === 'aquarium.created'
      )?.[1];

      expect(handler).toBeDefined();

      const event = {
        aquariumId: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
      };

      handler(event);

      expect(eventService.publishAquariumEvent).toHaveBeenCalledWith(
        'aquarium.created',
        event
      );
    });

    it('should handle aquarium.critical event', () => {
      const handler = mockEventEmitter.on.mock.calls.find(
        call => call[0] === 'aquarium.critical'
      )?.[1];

      expect(handler).toBeDefined();

      const event = {
        aquariumId: 'aqua123',
        userId: 'user123',
        parameters: {
          temperature: 35,
          ph: 9.0,
          ammonia: 2,
        },
      };

      handler(event);

      expect(eventService.publishAquariumEvent).toHaveBeenCalledWith(
        'aquarium.critical',
        event
      );
    });
  });
});