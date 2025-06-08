import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AquariumRepository } from './aquarium.repository';
import { Aquarium, AquariumDocument } from '../../../domain/entities/aquarium.entity';
import { WaterParameters, WaterParametersDocument } from '../../../domain/entities/water-parameters.entity';
import { AquariumType, WaterType, EquipmentType, InhabitantCategory } from '@verpa/common';

describe('AquariumRepository', () => {
  let repository: AquariumRepository;
  let aquariumModel: Model<AquariumDocument>;
  let waterParametersModel: Model<WaterParametersDocument>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockAquarium = {
    _id: '507f1f77bcf86cd799439011',
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
    maintenanceTasks: [],
    healthScore: 85,
    isActive: true,
    isPublic: false,
    imageUrl: null,
    tags: ['planted', 'community'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockWaterParameters = {
    _id: '507f1f77bcf86cd799439012',
    aquariumId: mockAquarium._id,
    temperature: 78,
    ph: 7.2,
    ammonia: 0,
    nitrite: 0,
    nitrate: 10,
    phosphate: 0.5,
    gh: 8,
    kh: 6,
    tds: 150,
    dissolvedOxygen: 7,
    co2: 25,
    salinity: 0,
    notes: 'Weekly test',
    recordedAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockAquariumModel = {
    new: jest.fn().mockReturnValue(mockAquarium),
    constructor: jest.fn().mockReturnValue(mockAquarium),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    skip: jest.fn(),
  };

  const mockWaterParametersModel = {
    new: jest.fn().mockReturnValue(mockWaterParameters),
    constructor: jest.fn().mockReturnValue(mockWaterParameters),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AquariumRepository,
        {
          provide: getModelToken(Aquarium.name),
          useValue: mockAquariumModel,
        },
        {
          provide: getModelToken(WaterParameters.name),
          useValue: mockWaterParametersModel,
        },
      ],
    }).compile();

    repository = module.get<AquariumRepository>(AquariumRepository);
    aquariumModel = module.get<Model<AquariumDocument>>(getModelToken(Aquarium.name));
    waterParametersModel = module.get<Model<WaterParametersDocument>>(
      getModelToken(WaterParameters.name),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new aquarium', async () => {
      const createData = {
        userId: mockUser.id,
        name: 'New Tank',
        type: AquariumType.SALTWATER,
        volume: 200,
        volumeUnit: 'gallons',
      };

      const mockSave = jest.fn().mockResolvedValue({ ...mockAquarium, ...createData });
      mockAquariumModel.new.mockReturnValue({ save: mockSave });

      const result = await repository.create(createData);

      expect(mockAquariumModel.new).toHaveBeenCalledWith(createData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toMatchObject(createData);
    });

    it('should handle save errors', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockAquariumModel.new.mockReturnValue({ save: mockSave });

      await expect(repository.create({ name: 'Test' })).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find aquarium by ID', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAquarium),
      };
      mockAquariumModel.findById.mockReturnValue(mockQuery);

      const result = await repository.findById(mockAquarium._id);

      expect(mockAquariumModel.findById).toHaveBeenCalledWith(mockAquarium._id);
      expect(mockQuery.populate).toHaveBeenCalledWith('equipment');
      expect(mockQuery.populate).toHaveBeenCalledWith('inhabitants');
      expect(result).toEqual(mockAquarium);
    });

    it('should return null if aquarium not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockAquariumModel.findById.mockReturnValue(mockQuery);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all aquariums for a user', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAquarium]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);

      const result = await repository.findByUserId(mockUser.id);

      expect(mockAquariumModel.find).toHaveBeenCalledWith({ userId: mockUser.id });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockAquarium]);
    });

    it('should include deleted aquariums when specified', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAquarium]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);

      await repository.findByUserId(mockUser.id, { includeDeleted: true });

      expect(mockAquariumModel.find).toHaveBeenCalledWith({ userId: mockUser.id });
    });

    it('should exclude deleted aquariums by default', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAquarium]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);

      await repository.findByUserId(mockUser.id, { includeDeleted: false });

      expect(mockAquariumModel.find).toHaveBeenCalledWith({
        userId: mockUser.id,
        deletedAt: { $exists: false },
      });
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results with filters', async () => {
      const filter = { userId: mockUser.id, waterType: WaterType.FRESHWATER };
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAquarium]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);
      mockAquariumModel.countDocuments.mockResolvedValue(25);

      const result = await repository.findPaginated(filter, 2, 10);

      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [mockAquarium],
        total: 25,
        page: 2,
        totalPages: 3,
      });
    });

    it('should use default pagination values', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);
      mockAquariumModel.countDocuments.mockResolvedValue(0);

      await repository.findPaginated();

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findPublic', () => {
    it('should find public aquariums', async () => {
      const publicAquarium = { ...mockAquarium, isPublic: true };
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([publicAquarium]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);

      const result = await repository.findPublic({ limit: 10 });

      expect(mockAquariumModel.find).toHaveBeenCalledWith({
        isPublic: true,
        isActive: true,
        deletedAt: { $exists: false },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ healthScore: -1, createdAt: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([publicAquarium]);
    });

    it('should filter by water type', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockAquariumModel.find.mockReturnValue(mockQuery);

      await repository.findPublic({ waterType: WaterType.SALTWATER });

      expect(mockAquariumModel.find).toHaveBeenCalledWith({
        isPublic: true,
        isActive: true,
        deletedAt: { $exists: false },
        waterType: WaterType.SALTWATER,
      });
    });
  });

  describe('update', () => {
    it('should update aquarium by ID', async () => {
      const updateData = { name: 'Updated Tank', description: 'New description' };
      const updatedAquarium = { ...mockAquarium, ...updateData };

      mockAquariumModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedAquarium),
      });

      const result = await repository.update(mockAquarium._id, updateData);

      expect(mockAquariumModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAquarium._id,
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedAquarium);
    });

    it('should return null if aquarium not found', async () => {
      mockAquariumModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete aquarium by ID', async () => {
      mockAquariumModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await repository.delete(mockAquarium._id);

      expect(mockAquariumModel.deleteOne).toHaveBeenCalledWith({ _id: mockAquarium._id });
      expect(result).toBe(true);
    });

    it('should return false if aquarium not found', async () => {
      mockAquariumModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should soft delete aquarium', async () => {
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.softDelete(mockAquarium._id);

      expect(mockAquariumModel.updateOne).toHaveBeenCalledWith(
        { _id: mockAquarium._id },
        { $set: { deletedAt: expect.any(Date), isActive: false } },
      );
      expect(result).toBe(true);
    });

    it('should return false if aquarium not found', async () => {
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      });

      const result = await repository.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore soft deleted aquarium', async () => {
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.restore(mockAquarium._id);

      expect(mockAquariumModel.updateOne).toHaveBeenCalledWith(
        { _id: mockAquarium._id },
        { $unset: { deletedAt: 1 }, $set: { isActive: true } },
      );
      expect(result).toBe(true);
    });
  });

  describe('count', () => {
    it('should count documents with filter', async () => {
      mockAquariumModel.countDocuments.mockResolvedValue(10);

      const result = await repository.count({ userId: mockUser.id });

      expect(mockAquariumModel.countDocuments).toHaveBeenCalledWith({ userId: mockUser.id });
      expect(result).toBe(10);
    });

    it('should count all documents with empty filter', async () => {
      mockAquariumModel.countDocuments.mockResolvedValue(50);

      const result = await repository.count();

      expect(mockAquariumModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(50);
    });
  });

  describe('exists', () => {
    it('should return true if aquarium exists', async () => {
      mockAquariumModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.exists({ name: 'Test Tank' });

      expect(mockAquariumModel.countDocuments).toHaveBeenCalledWith({ name: 'Test Tank' });
      expect(result).toBe(true);
    });

    it('should return false if aquarium does not exist', async () => {
      mockAquariumModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.exists({ name: 'Nonexistent' });

      expect(result).toBe(false);
    });
  });

  describe('Equipment methods', () => {
    const mockEquipment = {
      id: 'equipment123',
      name: 'Test Filter',
      type: EquipmentType.FILTER,
      brand: 'TestBrand',
      model: 'TestModel',
      purchaseDate: new Date('2024-01-01'),
      warrantyExpiry: new Date('2025-01-01'),
      isActive: true,
    };

    describe('addEquipment', () => {
      it('should add equipment to aquarium', async () => {
        const updatedAquarium = {
          ...mockAquarium,
          equipment: [...mockAquarium.equipment, mockEquipment],
        };

        mockAquariumModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedAquarium),
        });

        const result = await repository.addEquipment(mockAquarium._id, mockEquipment);

        expect(mockAquariumModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockAquarium._id,
          { $push: { equipment: mockEquipment } },
          { new: true },
        );
        expect(result).toEqual(updatedAquarium);
      });
    });

    describe('updateEquipment', () => {
      it('should update specific equipment', async () => {
        const updateData = { name: 'Updated Filter' };
        const aquariumWithEquipment = {
          ...mockAquarium,
          equipment: [mockEquipment],
        };

        mockAquariumModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(aquariumWithEquipment),
        });

        const result = await repository.updateEquipment(
          mockAquarium._id,
          mockEquipment.id,
          updateData,
        );

        expect(mockAquariumModel.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: mockAquarium._id, 'equipment.id': mockEquipment.id },
          { $set: { 'equipment.$': { ...mockEquipment, ...updateData } } },
          { new: true },
        );
        expect(result).toEqual(aquariumWithEquipment);
      });
    });

    describe('removeEquipment', () => {
      it('should remove equipment from aquarium', async () => {
        mockAquariumModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAquarium),
        });

        const result = await repository.removeEquipment(mockAquarium._id, mockEquipment.id);

        expect(mockAquariumModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockAquarium._id,
          { $pull: { equipment: { id: mockEquipment.id } } },
          { new: true },
        );
        expect(result).toEqual(mockAquarium);
      });
    });
  });

  describe('Inhabitant methods', () => {
    const mockInhabitant = {
      id: 'inhabitant123',
      species: 'Betta splendens',
      commonName: 'Siamese Fighting Fish',
      category: InhabitantCategory.FISH,
      quantity: 1,
      sex: 'male',
      addedDate: new Date('2024-01-01'),
      notes: 'Beautiful blue halfmoon',
    };

    describe('addInhabitant', () => {
      it('should add inhabitant to aquarium', async () => {
        const updatedAquarium = {
          ...mockAquarium,
          inhabitants: [...mockAquarium.inhabitants, mockInhabitant],
        };

        mockAquariumModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedAquarium),
        });

        const result = await repository.addInhabitant(mockAquarium._id, mockInhabitant);

        expect(mockAquariumModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockAquarium._id,
          { $push: { inhabitants: mockInhabitant } },
          { new: true },
        );
        expect(result).toEqual(updatedAquarium);
      });
    });

    describe('updateInhabitant', () => {
      it('should update specific inhabitant', async () => {
        const updateData = { quantity: 2, notes: 'Added another' };
        const aquariumWithInhabitant = {
          ...mockAquarium,
          inhabitants: [mockInhabitant],
        };

        mockAquariumModel.findOneAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(aquariumWithInhabitant),
        });

        const result = await repository.updateInhabitant(
          mockAquarium._id,
          mockInhabitant.id,
          updateData,
        );

        expect(mockAquariumModel.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: mockAquarium._id, 'inhabitants.id': mockInhabitant.id },
          { $set: { 'inhabitants.$': { ...mockInhabitant, ...updateData } } },
          { new: true },
        );
        expect(result).toEqual(aquariumWithInhabitant);
      });
    });

    describe('removeInhabitant', () => {
      it('should remove inhabitant from aquarium', async () => {
        mockAquariumModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAquarium),
        });

        const result = await repository.removeInhabitant(mockAquarium._id, mockInhabitant.id);

        expect(mockAquariumModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockAquarium._id,
          { $pull: { inhabitants: { id: mockInhabitant.id } } },
          { new: true },
        );
        expect(result).toEqual(mockAquarium);
      });
    });
  });

  describe('Water Parameters methods', () => {
    describe('createWaterParameters', () => {
      it('should create water parameters', async () => {
        const paramData = {
          aquariumId: mockAquarium._id,
          temperature: 78,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
        };

        const mockSave = jest.fn().mockResolvedValue(mockWaterParameters);
        mockWaterParametersModel.new.mockReturnValue({ save: mockSave });

        const result = await repository.createWaterParameters(paramData);

        expect(mockWaterParametersModel.new).toHaveBeenCalledWith(paramData);
        expect(mockSave).toHaveBeenCalled();
        expect(result).toEqual(mockWaterParameters);
      });
    });

    describe('findWaterParametersByAquarium', () => {
      it('should find water parameters with date filter', async () => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([mockWaterParameters]),
        };
        mockWaterParametersModel.find.mockReturnValue(mockQuery);

        const options = {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
          limit: 50,
        };

        const result = await repository.findWaterParametersByAquarium(mockAquarium._id, options);

        expect(mockWaterParametersModel.find).toHaveBeenCalledWith({
          aquariumId: mockAquarium._id,
          recordedAt: { $gte: options.from, $lte: options.to },
        });
        expect(mockQuery.sort).toHaveBeenCalledWith({ recordedAt: -1 });
        expect(mockQuery.limit).toHaveBeenCalledWith(50);
        expect(result).toEqual([mockWaterParameters]);
      });

      it('should find all parameters without date filter', async () => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([mockWaterParameters]),
        };
        mockWaterParametersModel.find.mockReturnValue(mockQuery);

        await repository.findWaterParametersByAquarium(mockAquarium._id);

        expect(mockWaterParametersModel.find).toHaveBeenCalledWith({
          aquariumId: mockAquarium._id,
        });
      });
    });

    describe('findLatestWaterParameters', () => {
      it('should find latest water parameters', async () => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockWaterParameters),
        };
        mockWaterParametersModel.findOne.mockReturnValue(mockQuery);

        const result = await repository.findLatestWaterParameters(mockAquarium._id);

        expect(mockWaterParametersModel.findOne).toHaveBeenCalledWith({
          aquariumId: mockAquarium._id,
        });
        expect(mockQuery.sort).toHaveBeenCalledWith({ recordedAt: -1 });
        expect(result).toEqual(mockWaterParameters);
      });
    });

    describe('deleteWaterParametersByAquarium', () => {
      it('should delete all water parameters for aquarium', async () => {
        mockWaterParametersModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 10 }),
        });

        const result = await repository.deleteWaterParametersByAquarium(mockAquarium._id);

        expect(mockWaterParametersModel.deleteMany).toHaveBeenCalledWith({
          aquariumId: mockAquarium._id,
        });
        expect(result).toBe(true);
      });
    });
  });

  describe('Aggregation methods', () => {
    describe('getUserStats', () => {
      it('should return user statistics', async () => {
        const mockStats = {
          totalAquariums: 5,
          activeAquariums: 4,
          totalVolume: 500,
          aquariumsByType: {
            [AquariumType.FRESHWATER]: 3,
            [AquariumType.SALTWATER]: 2,
          },
        };

        mockAquariumModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockStats]),
        });

        const result = await repository.getUserStats(mockUser.id);

        expect(mockAquariumModel.aggregate).toHaveBeenCalledWith([
          { $match: { userId: mockUser.id, deletedAt: { $exists: false } } },
          expect.objectContaining({ $group: expect.any(Object) }),
        ]);
        expect(result).toEqual(mockStats);
      });

      it('should return empty stats if no aquariums', async () => {
        mockAquariumModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        });

        const result = await repository.getUserStats(mockUser.id);

        expect(result).toBeNull();
      });
    });

    describe('getParameterTrends', () => {
      it('should return parameter trends', async () => {
        const mockTrends = [
          { date: '2024-01-01', avgTemperature: 78, avgPh: 7.2 },
          { date: '2024-01-02', avgTemperature: 78.5, avgPh: 7.1 },
        ];

        mockWaterParametersModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTrends),
        });

        const result = await repository.getParameterTrends(mockAquarium._id, 7);

        expect(mockWaterParametersModel.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              aquariumId: mockAquarium._id,
              recordedAt: { $gte: expect.any(Date) },
            },
          },
          expect.objectContaining({ $group: expect.any(Object) }),
          expect.objectContaining({ $sort: { date: 1 } }),
        ]);
        expect(result).toEqual(mockTrends);
      });
    });
  });

  describe('updateHealthScore', () => {
    it('should update aquarium health score', async () => {
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.updateHealthScore(mockAquarium._id, 95);

      expect(mockAquariumModel.updateOne).toHaveBeenCalledWith(
        { _id: mockAquarium._id },
        { $set: { healthScore: 95, healthScoreUpdatedAt: expect.any(Date) } },
      );
      expect(result).toBe(true);
    });
  });

  describe('updateImage', () => {
    it('should update aquarium image URL', async () => {
      const imageUrl = 'https://storage.example.com/aquarium123.jpg';
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.updateImage(mockAquarium._id, imageUrl);

      expect(mockAquariumModel.updateOne).toHaveBeenCalledWith(
        { _id: mockAquarium._id },
        { $set: { imageUrl } },
      );
      expect(result).toBe(true);
    });

    it('should remove image URL when null', async () => {
      mockAquariumModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.updateImage(mockAquarium._id, null);

      expect(mockAquariumModel.updateOne).toHaveBeenCalledWith(
        { _id: mockAquarium._id },
        { $unset: { imageUrl: 1 } },
      );
      expect(result).toBe(true);
    });
  });
});