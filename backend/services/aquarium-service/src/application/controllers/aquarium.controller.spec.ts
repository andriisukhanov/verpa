import { Test, TestingModule } from '@nestjs/testing';
import { AquariumController } from './aquarium.controller';
import { AquariumService } from '../services/aquarium.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateAquariumDto } from '../dto/create-aquarium.dto';
import { UpdateAquariumDto } from '../dto/update-aquarium.dto';
import { AddEquipmentDto } from '../dto/add-equipment.dto';
import { AddInhabitantDto } from '../dto/add-inhabitant.dto';
import { RecordParametersDto } from '../dto/record-parameters.dto';
import { AquariumType, WaterType, SubscriptionType, EquipmentType, InhabitantCategory } from '@verpa/common';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AquariumController', () => {
  let controller: AquariumController;
  let aquariumService: jest.Mocked<AquariumService>;
  let storageService: jest.Mocked<StorageService>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    subscriptionType: SubscriptionType.PREMIUM,
  };

  const mockAquarium = {
    id: 'aquarium123',
    userId: mockUser.id,
    name: 'Test Tank',
    type: AquariumType.FRESHWATER,
    volume: 100,
    volumeUnit: 'liters',
    dimensions: {
      length: 100,
      width: 40,
      height: 50,
      unit: 'cm',
    },
    waterType: WaterType.FRESHWATER,
    description: 'Test aquarium',
    location: 'Living Room',
    equipment: [],
    inhabitants: [],
    waterParameters: [],
    healthScore: 85,
    isActive: true,
    isPublic: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockEquipment = {
    id: 'equipment123',
    name: 'Test Filter',
    type: EquipmentType.FILTER,
    brand: 'TestBrand',
    model: 'TestModel',
    purchaseDate: new Date('2024-01-01'),
    warrantyExpiry: new Date('2025-01-01'),
    isActive: true,
    lastMaintenance: null,
    nextMaintenance: new Date('2024-02-01'),
  };

  const mockInhabitant = {
    id: 'inhabitant123',
    species: 'Betta splendens',
    commonName: 'Siamese Fighting Fish',
    category: InhabitantCategory.FISH,
    quantity: 1,
    sex: 'male',
    addedDate: new Date('2024-01-01'),
    notes: 'Beautiful blue halfmoon',
    origin: 'Local pet store',
    healthStatus: 'healthy',
  };

  const mockParameters = {
    id: 'params123',
    temperature: 78,
    ph: 7.2,
    ammonia: 0,
    nitrite: 0,
    nitrate: 10,
    recordedAt: new Date('2024-01-01'),
  };

  const mockAquariumService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findPublicAquariums: jest.fn(),
    getUserStats: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    updateImage: jest.fn(),
    deleteImage: jest.fn(),
    addEquipment: jest.fn(),
    updateEquipment: jest.fn(),
    removeEquipment: jest.fn(),
    performEquipmentMaintenance: jest.fn(),
    addInhabitant: jest.fn(),
    updateInhabitant: jest.fn(),
    removeInhabitant: jest.fn(),
    recordWaterParameters: jest.fn(),
    getParameterHistory: jest.fn(),
    getLatestParameters: jest.fn(),
    getParameterTrends: jest.fn(),
    getHealthStatus: jest.fn(),
  };

  const mockStorageService = {
    uploadAquariumImage: jest.fn(),
    deleteAquariumImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AquariumController],
      providers: [
        {
          provide: AquariumService,
          useValue: mockAquariumService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AquariumController>(AquariumController);
    aquariumService = module.get(AquariumService);
    storageService = module.get(StorageService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAquariumDto = {
      name: 'New Tank',
      type: AquariumType.FRESHWATER,
      volume: 100,
      volumeUnit: 'liters',
      dimensions: {
        length: 100,
        width: 40,
        height: 50,
        unit: 'cm',
      },
      waterType: WaterType.FRESHWATER,
      description: 'New aquarium',
      location: 'Living Room',
    };

    it('should create a new aquarium', async () => {
      aquariumService.create.mockResolvedValue(mockAquarium);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockAquarium);
      expect(aquariumService.create).toHaveBeenCalledWith(
        mockUser.id,
        createDto,
        mockUser.subscriptionType,
      );
    });

    it('should throw BadRequestException for limit reached', async () => {
      aquariumService.create.mockRejectedValue(
        new BadRequestException('Aquarium limit reached for your subscription'),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate name', async () => {
      aquariumService.create.mockRejectedValue(
        new BadRequestException('Aquarium with this name already exists'),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const mockPaginatedResult = {
      items: [mockAquarium],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    it('should return all user aquariums with filters', async () => {
      aquariumService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(
        mockUser,
        WaterType.FRESHWATER,
        false,
        1,
        10,
        'name',
        'asc',
      );

      expect(result).toEqual(mockPaginatedResult);
      expect(aquariumService.findAll).toHaveBeenCalledWith({
        userId: mockUser.id,
        waterType: WaterType.FRESHWATER,
        includeDeleted: false,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should handle default pagination parameters', async () => {
      aquariumService.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll(mockUser);

      expect(aquariumService.findAll).toHaveBeenCalledWith({
        userId: mockUser.id,
        waterType: undefined,
        includeDeleted: undefined,
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });

    it('should return empty list when no aquariums', async () => {
      aquariumService.findAll.mockResolvedValue({
        ...mockPaginatedResult,
        items: [],
        total: 0,
      });

      const result = await controller.findAll(mockUser);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findPublic', () => {
    const mockPublicAquariums = {
      items: [{ ...mockAquarium, isPublic: true }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it('should return public aquariums', async () => {
      aquariumService.findPublicAquariums.mockResolvedValue(mockPublicAquariums);

      const result = await controller.findPublic(WaterType.SALTWATER, 1, 10);

      expect(result).toEqual(mockPublicAquariums);
      expect(aquariumService.findPublicAquariums).toHaveBeenCalledWith({
        waterType: WaterType.SALTWATER,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalAquariums: 5,
      activeAquariums: 4,
      totalVolume: 500,
      aquariumsByType: {
        [AquariumType.FRESHWATER]: 3,
        [AquariumType.SALTWATER]: 2,
      },
      averageHealthScore: 82.5,
      parametersRecordedToday: 3,
      maintenanceDue: 2,
    };

    it('should return user aquarium statistics', async () => {
      aquariumService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockStats);
      expect(aquariumService.getUserStats).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return aquarium by ID', async () => {
      aquariumService.findOne.mockResolvedValue(mockAquarium);

      const result = await controller.findOne(mockAquarium.id, mockUser);

      expect(result).toEqual(mockAquarium);
      expect(aquariumService.findOne).toHaveBeenCalledWith(mockAquarium.id, mockUser.id);
    });

    it('should throw NotFoundException for non-existent aquarium', async () => {
      aquariumService.findOne.mockRejectedValue(new NotFoundException('Aquarium not found'));

      await expect(controller.findOne('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      aquariumService.findOne.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(controller.findOne(mockAquarium.id, { id: 'other-user' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAquariumDto = {
      name: 'Updated Tank',
      description: 'Updated description',
    };

    it('should update aquarium', async () => {
      const updatedAquarium = { ...mockAquarium, ...updateDto };
      aquariumService.update.mockResolvedValue(updatedAquarium);

      const result = await controller.update(mockAquarium.id, updateDto, mockUser);

      expect(result).toEqual(updatedAquarium);
      expect(aquariumService.update).toHaveBeenCalledWith(
        mockAquarium.id,
        mockUser.id,
        updateDto,
      );
    });

    it('should throw NotFoundException for non-existent aquarium', async () => {
      aquariumService.update.mockRejectedValue(new NotFoundException('Aquarium not found'));

      await expect(
        controller.update('nonexistent', updateDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete aquarium', async () => {
      aquariumService.delete.mockResolvedValue(undefined);

      await expect(
        controller.delete(mockAquarium.id, mockUser),
      ).resolves.toBeUndefined();

      expect(aquariumService.delete).toHaveBeenCalledWith(mockAquarium.id, mockUser.id);
    });

    it('should throw NotFoundException for non-existent aquarium', async () => {
      aquariumService.delete.mockRejectedValue(new NotFoundException('Aquarium not found'));

      await expect(controller.delete('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('should restore deleted aquarium', async () => {
      const restoredAquarium = { ...mockAquarium, deletedAt: null };
      aquariumService.restore.mockResolvedValue(restoredAquarium);

      const result = await controller.restore(mockAquarium.id, mockUser);

      expect(result).toEqual(restoredAquarium);
      expect(aquariumService.restore).toHaveBeenCalledWith(mockAquarium.id, mockUser.id);
    });

    it('should throw BadRequestException if aquarium not deleted', async () => {
      aquariumService.restore.mockRejectedValue(
        new BadRequestException('Aquarium is not deleted'),
      );

      await expect(controller.restore(mockAquarium.id, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadImage', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
      originalname: 'test.jpg',
      size: 1000,
    } as Express.Multer.File;

    it('should upload aquarium image', async () => {
      const imageUrl = 'https://storage.example.com/aquarium123.jpg';
      const updatedAquarium = { ...mockAquarium, imageUrl };
      
      storageService.uploadAquariumImage.mockResolvedValue(imageUrl);
      aquariumService.updateImage.mockResolvedValue(updatedAquarium);

      const result = await controller.uploadImage(mockAquarium.id, mockFile, mockUser);

      expect(result).toEqual(updatedAquarium);
      expect(storageService.uploadAquariumImage).toHaveBeenCalledWith(
        mockAquarium.id,
        mockFile.buffer,
        mockFile.mimetype,
      );
      expect(aquariumService.updateImage).toHaveBeenCalledWith(
        mockAquarium.id,
        mockUser.id,
        imageUrl,
      );
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.uploadImage(mockAquarium.id, null as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle storage service errors', async () => {
      storageService.uploadAquariumImage.mockRejectedValue(
        new Error('Storage service error'),
      );

      await expect(
        controller.uploadImage(mockAquarium.id, mockFile, mockUser),
      ).rejects.toThrow('Storage service error');
    });
  });

  describe('deleteImage', () => {
    it('should delete aquarium image', async () => {
      aquariumService.deleteImage.mockResolvedValue(undefined);

      await expect(
        controller.deleteImage(mockAquarium.id, mockUser),
      ).resolves.toBeUndefined();

      expect(aquariumService.deleteImage).toHaveBeenCalledWith(
        mockAquarium.id,
        mockUser.id,
      );
    });
  });

  describe('Equipment endpoints', () => {
    describe('addEquipment', () => {
      const addEquipmentDto: AddEquipmentDto = {
        name: 'New Filter',
        type: EquipmentType.FILTER,
        brand: 'TestBrand',
        model: 'TestModel',
        purchaseDate: new Date('2024-01-01'),
        warrantyExpiry: new Date('2025-01-01'),
        notes: 'High performance filter',
      };

      it('should add equipment to aquarium', async () => {
        const updatedAquarium = {
          ...mockAquarium,
          equipment: [...mockAquarium.equipment, mockEquipment],
        };
        aquariumService.addEquipment.mockResolvedValue(updatedAquarium);

        const result = await controller.addEquipment(
          mockAquarium.id,
          addEquipmentDto,
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.addEquipment).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          addEquipmentDto,
        );
      });

      it('should throw BadRequestException for limit reached', async () => {
        aquariumService.addEquipment.mockRejectedValue(
          new BadRequestException('Equipment limit reached'),
        );

        await expect(
          controller.addEquipment(mockAquarium.id, addEquipmentDto, mockUser),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateEquipment', () => {
      const updateDto = { name: 'Updated Filter' };

      it('should update equipment', async () => {
        const updatedAquarium = { ...mockAquarium };
        aquariumService.updateEquipment.mockResolvedValue(updatedAquarium);

        const result = await controller.updateEquipment(
          mockAquarium.id,
          mockEquipment.id,
          updateDto,
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.updateEquipment).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          mockEquipment.id,
          updateDto,
        );
      });
    });

    describe('removeEquipment', () => {
      it('should remove equipment', async () => {
        aquariumService.removeEquipment.mockResolvedValue(undefined);

        await expect(
          controller.removeEquipment(mockAquarium.id, mockEquipment.id, mockUser),
        ).resolves.toBeUndefined();

        expect(aquariumService.removeEquipment).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          mockEquipment.id,
        );
      });
    });

    describe('performMaintenance', () => {
      it('should record equipment maintenance', async () => {
        const updatedAquarium = { ...mockAquarium };
        aquariumService.performEquipmentMaintenance.mockResolvedValue(updatedAquarium);

        const result = await controller.performMaintenance(
          mockAquarium.id,
          mockEquipment.id,
          'Cleaned filter media',
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.performEquipmentMaintenance).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          mockEquipment.id,
          'Cleaned filter media',
        );
      });
    });
  });

  describe('Inhabitant endpoints', () => {
    describe('addInhabitant', () => {
      const addInhabitantDto: AddInhabitantDto = {
        species: 'Corydoras paleatus',
        commonName: 'Peppered Cory',
        category: InhabitantCategory.FISH,
        quantity: 6,
        sex: 'mixed',
        addedDate: new Date('2024-01-01'),
        notes: 'School of 6',
        origin: 'Local store',
      };

      it('should add inhabitant to aquarium', async () => {
        const updatedAquarium = {
          ...mockAquarium,
          inhabitants: [...mockAquarium.inhabitants, mockInhabitant],
        };
        aquariumService.addInhabitant.mockResolvedValue(updatedAquarium);

        const result = await controller.addInhabitant(
          mockAquarium.id,
          addInhabitantDto,
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.addInhabitant).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          addInhabitantDto,
        );
      });

      it('should throw BadRequestException for compatibility issues', async () => {
        aquariumService.addInhabitant.mockRejectedValue(
          new BadRequestException('Incompatible with existing inhabitants'),
        );

        await expect(
          controller.addInhabitant(mockAquarium.id, addInhabitantDto, mockUser),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateInhabitant', () => {
      const updateDto = { quantity: 5, notes: 'One passed away' };

      it('should update inhabitant', async () => {
        const updatedAquarium = { ...mockAquarium };
        aquariumService.updateInhabitant.mockResolvedValue(updatedAquarium);

        const result = await controller.updateInhabitant(
          mockAquarium.id,
          mockInhabitant.id,
          updateDto,
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.updateInhabitant).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          mockInhabitant.id,
          updateDto,
        );
      });
    });

    describe('removeInhabitant', () => {
      it('should remove inhabitant', async () => {
        aquariumService.removeInhabitant.mockResolvedValue(undefined);

        await expect(
          controller.removeInhabitant(mockAquarium.id, mockInhabitant.id, mockUser),
        ).resolves.toBeUndefined();

        expect(aquariumService.removeInhabitant).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          mockInhabitant.id,
        );
      });
    });
  });

  describe('Water Parameters endpoints', () => {
    describe('recordParameters', () => {
      const parametersDto: RecordParametersDto = {
        temperature: 78.5,
        ph: 7.2,
        ammonia: 0,
        nitrite: 0,
        nitrate: 15,
        notes: 'After water change',
      };

      it('should record water parameters', async () => {
        const updatedAquarium = {
          ...mockAquarium,
          waterParameters: [...mockAquarium.waterParameters, mockParameters],
          healthScore: 90,
        };
        aquariumService.recordWaterParameters.mockResolvedValue(updatedAquarium);

        const result = await controller.recordParameters(
          mockAquarium.id,
          parametersDto,
          mockUser,
        );

        expect(result).toEqual(updatedAquarium);
        expect(aquariumService.recordWaterParameters).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          parametersDto,
        );
      });

      it('should throw BadRequestException for invalid parameters', async () => {
        aquariumService.recordWaterParameters.mockRejectedValue(
          new BadRequestException('Temperature out of valid range'),
        );

        await expect(
          controller.recordParameters(mockAquarium.id, parametersDto, mockUser),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getParametersHistory', () => {
      const mockHistory = [mockParameters];

      it('should return parameters history with date filters', async () => {
        aquariumService.getParameterHistory.mockResolvedValue(mockHistory);

        const result = await controller.getParametersHistory(
          mockAquarium.id,
          mockUser,
          '2024-01-01',
          '2024-01-31',
          50,
        );

        expect(result).toEqual(mockHistory);
        expect(aquariumService.getParameterHistory).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          {
            from: new Date('2024-01-01'),
            to: new Date('2024-01-31'),
            limit: 50,
          },
        );
      });

      it('should handle optional filters', async () => {
        aquariumService.getParameterHistory.mockResolvedValue(mockHistory);

        await controller.getParametersHistory(mockAquarium.id, mockUser);

        expect(aquariumService.getParameterHistory).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          { limit: undefined },
        );
      });
    });

    describe('getLatestParameters', () => {
      it('should return latest parameters', async () => {
        aquariumService.getLatestParameters.mockResolvedValue(mockParameters);

        const result = await controller.getLatestParameters(mockAquarium.id, mockUser);

        expect(result).toEqual(mockParameters);
        expect(aquariumService.getLatestParameters).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
        );
      });
    });

    describe('getParameterTrends', () => {
      const mockTrends = {
        temperature: {
          average: 78.2,
          trend: 'stable',
          data: [{ date: '2024-01-01', value: 78 }],
        },
        ph: {
          average: 7.2,
          trend: 'increasing',
          data: [{ date: '2024-01-01', value: 7.1 }],
        },
      };

      it('should return parameter trends', async () => {
        aquariumService.getParameterTrends.mockResolvedValue(mockTrends);

        const result = await controller.getParameterTrends(mockAquarium.id, mockUser, 30);

        expect(result).toEqual(mockTrends);
        expect(aquariumService.getParameterTrends).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          30,
        );
      });

      it('should use default days when not specified', async () => {
        aquariumService.getParameterTrends.mockResolvedValue(mockTrends);

        await controller.getParameterTrends(mockAquarium.id, mockUser);

        expect(aquariumService.getParameterTrends).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
          30,
        );
      });
    });

    describe('getHealthStatus', () => {
      const mockHealthStatus = {
        score: 85,
        status: 'good',
        issues: [],
        recommendations: ['Continue regular maintenance'],
        lastChecked: new Date('2024-01-01'),
      };

      it('should return aquarium health status', async () => {
        aquariumService.getHealthStatus.mockResolvedValue(mockHealthStatus);

        const result = await controller.getHealthStatus(mockAquarium.id, mockUser);

        expect(result).toEqual(mockHealthStatus);
        expect(aquariumService.getHealthStatus).toHaveBeenCalledWith(
          mockAquarium.id,
          mockUser.id,
        );
      });
    });
  });
});