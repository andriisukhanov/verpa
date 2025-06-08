import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AquariumService } from './aquarium.service';
import { AquariumDomainService } from '../../domain/services/aquarium.domain.service';
import { AquariumRepository } from '../../infrastructure/database/repositories/aquarium.repository';
import { WaterParametersRepository } from '../../infrastructure/database/repositories/water-parameters.repository';
import { EventService } from '../../infrastructure/events/event.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

describe('AquariumService', () => {
  let service: AquariumService;
  let domainService: AquariumDomainService;
  let aquariumRepository: AquariumRepository;
  let waterParametersRepository: WaterParametersRepository;
  let eventService: EventService;
  let storageService: StorageService;

  const mockUserId = 'user123';
  const mockAquariumId = 'aquarium123';

  const mockAquarium = {
    id: mockAquariumId,
    userId: mockUserId,
    name: 'Test Aquarium',
    type: 'freshwater',
    volume: 100,
    volumeUnit: 'liters',
    dimensions: { length: 100, width: 40, height: 50 },
    inhabitants: [],
    equipment: [],
    parameters: {
      temperature: 25,
      ph: 7.0,
      ammonia: 0,
      nitrite: 0,
      nitrate: 10,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepositories = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockWaterParametersRepo = {
    create: jest.fn(),
    findByAquariumId: jest.fn(),
    getLatestByAquariumId: jest.fn(),
  };

  const mockEventService = {
    publishEvent: jest.fn(),
  };

  const mockStorageService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  const mockDomainService = {
    calculateWaterVolume: jest.fn(),
    validateWaterParameters: jest.fn(),
    checkCompatibility: jest.fn(),
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
          provide: AquariumRepository,
          useValue: mockRepositories,
        },
        {
          provide: WaterParametersRepository,
          useValue: mockWaterParametersRepo,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<AquariumService>(AquariumService);
    domainService = module.get<AquariumDomainService>(AquariumDomainService);
    aquariumRepository = module.get<AquariumRepository>(AquariumRepository);
    waterParametersRepository = module.get<WaterParametersRepository>(WaterParametersRepository);
    eventService = module.get<EventService>(EventService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new aquarium successfully', async () => {
      const createDto = {
        name: 'New Aquarium',
        type: 'freshwater' as const,
        volume: 100,
        volumeUnit: 'liters' as const,
        dimensions: { length: 100, width: 40, height: 50 },
        description: 'Test aquarium',
      };

      mockDomainService.calculateWaterVolume.mockReturnValue(200);
      mockRepositories.create.mockResolvedValue(mockAquarium);

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockAquarium);
      expect(mockRepositories.create).toHaveBeenCalledWith({
        ...createDto,
        userId: mockUserId,
        inhabitants: [],
        equipment: [],
        parameters: {},
      });
      expect(mockEventService.publishEvent).toHaveBeenCalledWith('aquarium.created', {
        aquariumId: mockAquarium.id,
        userId: mockUserId,
        name: mockAquarium.name,
      });
    });

    it('should upload image if provided', async () => {
      const createDto = {
        name: 'New Aquarium',
        type: 'freshwater' as const,
        volume: 100,
        volumeUnit: 'liters' as const,
        image: 'base64-image-data',
      };

      const imageUrl = 'https://storage.example.com/image.jpg';
      mockStorageService.uploadImage.mockResolvedValue(imageUrl);
      mockRepositories.create.mockResolvedValue({
        ...mockAquarium,
        imageUrl,
      });

      const result = await service.create(mockUserId, createDto);

      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(
        createDto.image,
        'aquariums',
      );
      expect(result.imageUrl).toBe(imageUrl);
    });
  });

  describe('findAll', () => {
    it('should return all aquariums for a user', async () => {
      const mockAquariums = [mockAquarium, { ...mockAquarium, id: '456' }];
      mockRepositories.findByUserId.mockResolvedValue(mockAquariums);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual(mockAquariums);
      expect(mockRepositories.findByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array if no aquariums found', async () => {
      mockRepositories.findByUserId.mockResolvedValue([]);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return aquarium details with latest parameters', async () => {
      const latestParameters = {
        temperature: 26,
        ph: 7.2,
        ammonia: 0,
        nitrite: 0,
        nitrate: 15,
        recordedAt: new Date(),
      };

      mockRepositories.findById.mockResolvedValue(mockAquarium);
      mockWaterParametersRepo.getLatestByAquariumId.mockResolvedValue(latestParameters);

      const result = await service.findOne(mockUserId, mockAquariumId);

      expect(result).toEqual({
        ...mockAquarium,
        latestParameters,
      });
    });

    it('should throw NotFoundException if aquarium not found', async () => {
      mockRepositories.findById.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserId, mockAquariumId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own aquarium', async () => {
      mockRepositories.findById.mockResolvedValue({
        ...mockAquarium,
        userId: 'other-user',
      });

      await expect(
        service.findOne(mockUserId, mockAquariumId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recordParameters', () => {
    it('should record water parameters successfully', async () => {
      const parametersDto = {
        temperature: 26,
        ph: 7.2,
        ammonia: 0,
        nitrite: 0,
        nitrate: 15,
      };

      mockRepositories.findById.mockResolvedValue(mockAquarium);
      mockDomainService.validateWaterParameters.mockReturnValue(true);
      mockWaterParametersRepo.create.mockResolvedValue({
        ...parametersDto,
        aquariumId: mockAquariumId,
        recordedAt: new Date(),
      });

      await service.recordParameters(mockUserId, mockAquariumId, parametersDto);

      expect(mockWaterParametersRepo.create).toHaveBeenCalledWith({
        aquariumId: mockAquariumId,
        ...parametersDto,
      });
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        'aquarium.parameters_recorded',
        {
          aquariumId: mockAquariumId,
          parameters: parametersDto,
        },
      );
    });

    it('should update aquarium with latest parameters', async () => {
      const parametersDto = {
        temperature: 26,
        ph: 7.2,
      };

      mockRepositories.findById.mockResolvedValue(mockAquarium);
      mockDomainService.validateWaterParameters.mockReturnValue(true);

      await service.recordParameters(mockUserId, mockAquariumId, parametersDto);

      expect(mockRepositories.update).toHaveBeenCalledWith(
        mockAquariumId,
        { parameters: parametersDto },
      );
    });
  });

  describe('addInhabitant', () => {
    it('should add inhabitant successfully', async () => {
      const inhabitantDto = {
        species: 'Neon Tetra',
        quantity: 10,
        type: 'fish' as const,
        addedDate: new Date().toISOString(),
      };

      mockRepositories.findById.mockResolvedValue(mockAquarium);
      mockDomainService.checkCompatibility.mockResolvedValue(true);

      const result = await service.addInhabitant(
        mockUserId,
        mockAquariumId,
        inhabitantDto,
      );

      expect(result.inhabitants).toHaveLength(1);
      expect(result.inhabitants[0]).toMatchObject({
        species: inhabitantDto.species,
        quantity: inhabitantDto.quantity,
        type: inhabitantDto.type,
      });
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        'aquarium.inhabitant_added',
        expect.any(Object),
      );
    });

    it('should check compatibility before adding inhabitant', async () => {
      const inhabitantDto = {
        species: 'Goldfish',
        quantity: 1,
        type: 'fish' as const,
      };

      const aquariumWithInhabitants = {
        ...mockAquarium,
        inhabitants: [
          {
            id: '1',
            species: 'Neon Tetra',
            quantity: 10,
            type: 'fish',
          },
        ],
      };

      mockRepositories.findById.mockResolvedValue(aquariumWithInhabitants);
      mockDomainService.checkCompatibility.mockResolvedValue(false);

      await expect(
        service.addInhabitant(mockUserId, mockAquariumId, inhabitantDto),
      ).rejects.toThrow('Inhabitant not compatible with existing inhabitants');
    });
  });

  describe('addEquipment', () => {
    it('should add equipment successfully', async () => {
      const equipmentDto = {
        name: 'Filter',
        type: 'filtration' as const,
        brand: 'Fluval',
        model: 'FX6',
        installedDate: new Date().toISOString(),
      };

      mockRepositories.findById.mockResolvedValue(mockAquarium);

      const result = await service.addEquipment(
        mockUserId,
        mockAquariumId,
        equipmentDto,
      );

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0]).toMatchObject({
        name: equipmentDto.name,
        type: equipmentDto.type,
        brand: equipmentDto.brand,
        model: equipmentDto.model,
      });
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        'aquarium.equipment_added',
        expect.any(Object),
      );
    });
  });

  describe('delete', () => {
    it('should delete aquarium successfully', async () => {
      mockRepositories.findById.mockResolvedValue(mockAquarium);

      await service.delete(mockUserId, mockAquariumId);

      expect(mockRepositories.delete).toHaveBeenCalledWith(mockAquariumId);
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        'aquarium.deleted',
        {
          aquariumId: mockAquariumId,
          userId: mockUserId,
        },
      );
    });

    it('should delete associated image if exists', async () => {
      const aquariumWithImage = {
        ...mockAquarium,
        imageUrl: 'https://storage.example.com/image.jpg',
      };

      mockRepositories.findById.mockResolvedValue(aquariumWithImage);

      await service.delete(mockUserId, mockAquariumId);

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        aquariumWithImage.imageUrl,
      );
    });
  });

  describe('getParametersHistory', () => {
    it('should return parameters history', async () => {
      const mockHistory = [
        {
          temperature: 25,
          ph: 7.0,
          recordedAt: new Date('2024-01-01'),
        },
        {
          temperature: 26,
          ph: 7.2,
          recordedAt: new Date('2024-01-02'),
        },
      ];

      mockRepositories.findById.mockResolvedValue(mockAquarium);
      mockWaterParametersRepo.findByAquariumId.mockResolvedValue(mockHistory);

      const result = await service.getParametersHistory(
        mockUserId,
        mockAquariumId,
        { days: 7 },
      );

      expect(result).toEqual(mockHistory);
      expect(mockWaterParametersRepo.findByAquariumId).toHaveBeenCalledWith(
        mockAquariumId,
        expect.any(Date),
        expect.any(Date),
      );
    });
  });
});