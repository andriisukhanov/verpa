import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AquariumController } from './aquarium.controller';
import { AquariumService } from '../services/aquarium.service';
import { AuthGuard } from '@nestjs/passport';
import { WaterType, AquariumStatus, EquipmentType, InhabitantType, SubscriptionType } from '@verpa/common';

describe('AquariumController', () => {
  let controller: AquariumController;
  let aquariumService: jest.Mocked<AquariumService>;

  const mockAquariumService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findPublic: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    addEquipment: jest.fn(),
    updateEquipmentMaintenance: jest.fn(),
    removeEquipment: jest.fn(),
    addInhabitant: jest.fn(),
    updateInhabitant: jest.fn(),
    removeInhabitant: jest.fn(),
    uploadInhabitantImage: jest.fn(),
    recordParameters: jest.fn(),
    getParametersHistory: jest.fn(),
    getParameterTrends: jest.fn(),
    getMaintenanceSchedule: jest.fn(),
    checkCompatibility: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'user123',
      email: 'test@example.com',
      subscriptionType: SubscriptionType.BASIC,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AquariumController],
      providers: [
        {
          provide: AquariumService,
          useValue: mockAquariumService,
        },
      ],
    }).compile();

    controller = module.get<AquariumController>(AquariumController);
    aquariumService = module.get(AquariumService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Tank',
      waterType: WaterType.FRESHWATER,
      volume: 100,
      description: 'Test description',
    };

    it('should create aquarium', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        ...createDto,
        status: AquariumStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.create.mockResolvedValue(aquarium);

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.create).toHaveBeenCalledWith(
        'user123',
        createDto,
        SubscriptionType.BASIC
      );
    });

    it('should handle validation errors', async () => {
      mockAquariumService.create.mockRejectedValue(
        new BadRequestException('Invalid data')
      );

      await expect(
        controller.create(createDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return user aquariums', async () => {
      const aquariums = [
        {
          id: 'aqua1',
          userId: 'user123',
          name: 'Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'aqua2',
          userId: 'user123',
          name: 'Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
          status: AquariumStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAquariumService.findAll.mockResolvedValue(aquariums);

      const result = await controller.findAll({}, mockRequest);

      expect(result).toEqual(aquariums);
      expect(aquariumService.findAll).toHaveBeenCalledWith('user123', {});
    });

    it('should pass query parameters', async () => {
      mockAquariumService.findAll.mockResolvedValue([]);

      const query = {
        status: AquariumStatus.MAINTENANCE,
        page: '2',
        limit: '20',
      };

      await controller.findAll(query, mockRequest);

      expect(aquariumService.findAll).toHaveBeenCalledWith('user123', {
        status: AquariumStatus.MAINTENANCE,
        page: 2,
        limit: 20,
      });
    });
  });

  describe('findPublic', () => {
    it('should return public aquariums', async () => {
      const publicAquariums = [
        {
          id: 'aqua1',
          userId: 'user1',
          name: 'Public Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAquariumService.findPublic.mockResolvedValue(publicAquariums);

      const result = await controller.findPublic({});

      expect(result).toEqual(publicAquariums);
      expect(aquariumService.findPublic).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return aquarium by id', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.findOne.mockResolvedValue(aquarium);

      const result = await controller.findOne('aqua123', mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.findOne).toHaveBeenCalledWith('aqua123', 'user123');
    });

    it('should handle not found', async () => {
      mockAquariumService.findOne.mockRejectedValue(
        new NotFoundException('Aquarium not found')
      );

      await expect(
        controller.findOne('non-existent', mockRequest)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Tank',
      volume: 150,
    };

    it('should update aquarium', async () => {
      const updatedAquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Updated Tank',
        waterType: WaterType.FRESHWATER,
        volume: 150,
        status: AquariumStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.update.mockResolvedValue(updatedAquarium);

      const result = await controller.update('aqua123', updateDto, mockRequest);

      expect(result).toEqual(updatedAquarium);
      expect(aquariumService.update).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should delete aquarium', async () => {
      mockAquariumService.remove.mockResolvedValue(undefined);

      await controller.remove('aqua123', mockRequest);

      expect(aquariumService.remove).toHaveBeenCalledWith('aqua123', 'user123');
    });
  });

  describe('uploadImage', () => {
    it('should upload image', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
        size: 1000,
      } as Express.Multer.File;

      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        imageUrl: 'https://storage.example.com/aquarium/aqua123/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.uploadImage.mockResolvedValue(aquarium);

      const result = await controller.uploadImage('aqua123', file, mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.uploadImage).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        file
      );
    });

    it('should reject missing file', async () => {
      await expect(
        controller.uploadImage('aqua123', undefined as any, mockRequest)
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

    it('should add equipment', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        equipment: [
          {
            id: 'equip123',
            ...equipmentDto,
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.addEquipment.mockResolvedValue(aquarium);

      const result = await controller.addEquipment('aqua123', equipmentDto, mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.addEquipment).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        equipmentDto
      );
    });
  });

  describe('updateEquipmentMaintenance', () => {
    it('should update equipment maintenance', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        equipment: [
          {
            id: 'equip123',
            name: 'Filter',
            type: EquipmentType.FILTER,
            lastMaintenanceDate: new Date(),
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.updateEquipmentMaintenance.mockResolvedValue(aquarium);

      const result = await controller.updateEquipmentMaintenance(
        'aqua123',
        'equip123',
        mockRequest
      );

      expect(result).toEqual(aquarium);
      expect(aquariumService.updateEquipmentMaintenance).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        'equip123'
      );
    });
  });

  describe('removeEquipment', () => {
    it('should remove equipment', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        equipment: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.removeEquipment.mockResolvedValue(aquarium);

      const result = await controller.removeEquipment('aqua123', 'equip123', mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.removeEquipment).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        'equip123'
      );
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

    it('should add inhabitant', async () => {
      const aquarium = {
        id: 'aqua123',
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        inhabitants: [
          {
            id: 'inhab123',
            ...inhabitantDto,
            addedDate: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAquariumService.addInhabitant.mockResolvedValue(aquarium);

      const result = await controller.addInhabitant('aqua123', inhabitantDto, mockRequest);

      expect(result).toEqual(aquarium);
      expect(aquariumService.addInhabitant).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        inhabitantDto
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
      const parameters = {
        id: 'param123',
        aquariumId: 'aqua123',
        ...parametersDto,
        recordedAt: new Date(),
        recordedBy: 'user123',
        overallStatus: 'optimal',
      };

      mockAquariumService.recordParameters.mockResolvedValue(parameters);

      const result = await controller.recordParameters(
        'aqua123',
        parametersDto,
        mockRequest
      );

      expect(result).toEqual(parameters);
      expect(aquariumService.recordParameters).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        parametersDto
      );
    });
  });

  describe('getParametersHistory', () => {
    it('should return parameters history', async () => {
      const parameters = [
        {
          id: 'param1',
          aquariumId: 'aqua123',
          temperature: 25,
          ph: 7.0,
          recordedAt: new Date(),
          recordedBy: 'user123',
        },
        {
          id: 'param2',
          aquariumId: 'aqua123',
          temperature: 24,
          ph: 7.1,
          recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          recordedBy: 'user123',
        },
      ];

      mockAquariumService.getParametersHistory.mockResolvedValue(parameters);

      const result = await controller.getParametersHistory('aqua123', {}, mockRequest);

      expect(result).toEqual(parameters);
      expect(aquariumService.getParametersHistory).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        {}
      );
    });

    it('should pass query parameters', async () => {
      mockAquariumService.getParametersHistory.mockResolvedValue([]);

      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        page: '2',
        limit: '50',
      };

      await controller.getParametersHistory('aqua123', query, mockRequest);

      expect(aquariumService.getParametersHistory).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          page: 2,
          limit: 50,
        }
      );
    });
  });

  describe('getParameterTrends', () => {
    it('should return parameter trends', async () => {
      const trends = {
        temperature: { avg: 25, min: 24, max: 26, trend: 'stable' },
        ph: { avg: 7.0, min: 6.8, max: 7.2, trend: 'increasing' },
      };

      mockAquariumService.getParameterTrends.mockResolvedValue(trends);

      const result = await controller.getParameterTrends(
        'aqua123',
        { days: '7' },
        mockRequest
      );

      expect(result).toEqual(trends);
      expect(aquariumService.getParameterTrends).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        7
      );
    });

    it('should use default days if not provided', async () => {
      mockAquariumService.getParameterTrends.mockResolvedValue({});

      await controller.getParameterTrends('aqua123', {}, mockRequest);

      expect(aquariumService.getParameterTrends).toHaveBeenCalledWith(
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
          lastMaintenance: new Date(),
          nextMaintenance: new Date(),
          daysOverdue: 0,
          priority: 'low' as const,
        },
      ];

      mockAquariumService.getMaintenanceSchedule.mockResolvedValue(schedule);

      const result = await controller.getMaintenanceSchedule('aqua123', mockRequest);

      expect(result).toEqual(schedule);
      expect(aquariumService.getMaintenanceSchedule).toHaveBeenCalledWith(
        'aqua123',
        'user123'
      );
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
        suggestions: ['Consider adding more plants'],
      };

      mockAquariumService.checkCompatibility.mockResolvedValue(compatibility);

      const result = await controller.checkCompatibility(
        'aqua123',
        inhabitantDto,
        mockRequest
      );

      expect(result).toEqual(compatibility);
      expect(aquariumService.checkCompatibility).toHaveBeenCalledWith(
        'aqua123',
        'user123',
        inhabitantDto
      );
    });
  });
});