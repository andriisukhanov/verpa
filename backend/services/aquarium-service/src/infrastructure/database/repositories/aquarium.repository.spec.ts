import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AquariumRepository } from './aquarium.repository';
import { Aquarium as AquariumSchema, AquariumDocument } from '../schemas/aquarium.schema';
import { Aquarium } from '../../../domain/entities/aquarium.entity';
import { Equipment } from '../../../domain/entities/equipment.entity';
import { Inhabitant } from '../../../domain/entities/inhabitant.entity';
import { WaterParameters } from '../../../domain/entities/water-parameters.entity';
import { WaterType, AquariumStatus, EquipmentType, InhabitantType } from '@verpa/common';

describe('AquariumRepository', () => {
  let repository: AquariumRepository;
  let aquariumModel: Model<AquariumDocument>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: AquariumSchema.name, schema: AquariumSchema },
        ]),
      ],
      providers: [AquariumRepository],
    }).compile();

    repository = module.get<AquariumRepository>(AquariumRepository);
    aquariumModel = module.get<Model<AquariumDocument>>(getModelToken(AquariumSchema.name));
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    await aquariumModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a new aquarium', async () => {
      const aquarium = new Aquarium({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        description: 'Test description',
      });

      const result = await repository.create(aquarium);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Tank');
      expect(result.waterType).toBe(WaterType.FRESHWATER);
      expect(result.volume).toBe(100);
      expect(result.status).toBe(AquariumStatus.ACTIVE);
    });

    it('should create aquarium with equipment', async () => {
      const equipment = new Equipment({
        name: 'Test Filter',
        type: EquipmentType.FILTER,
        brand: 'TestBrand',
        model: 'TestModel',
      });

      const aquarium = new Aquarium({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        equipment: [equipment],
      });

      const result = await repository.create(aquarium);

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0].name).toBe('Test Filter');
      expect(result.equipment[0].type).toBe(EquipmentType.FILTER);
    });

    it('should create aquarium with inhabitants', async () => {
      const inhabitant = new Inhabitant({
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

      const aquarium = new Aquarium({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        inhabitants: [inhabitant],
      });

      const result = await repository.create(aquarium);

      expect(result.inhabitants).toHaveLength(1);
      expect(result.inhabitants[0].species).toBe('Paracheirodon innesi');
      expect(result.inhabitants[0].quantity).toBe(10);
    });
  });

  describe('findById', () => {
    it('should find aquarium by id', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      const result = await repository.findById(created._id.toString());

      expect(result).toBeDefined();
      expect(result?.id).toBe(created._id.toString());
      expect(result?.name).toBe('Test Tank');
    });

    it('should return null for non-existent id', async () => {
      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should not return deleted aquariums', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        deletedAt: new Date(),
      });

      const result = await repository.findById(created._id.toString());

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find aquarium by id and userId', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      const result = await repository.findByIdAndUserId(
        created._id.toString(),
        'user123'
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(created._id.toString());
    });

    it('should return null for wrong userId', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      const result = await repository.findByIdAndUserId(
        created._id.toString(),
        'wronguser'
      );

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all aquariums for a user', async () => {
      await aquariumModel.create([
        {
          userId: 'user123',
          name: 'Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
        },
        {
          userId: 'user123',
          name: 'Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
          status: AquariumStatus.ACTIVE,
        },
        {
          userId: 'otheruser',
          name: 'Other Tank',
          waterType: WaterType.FRESHWATER,
          volume: 150,
          status: AquariumStatus.ACTIVE,
        },
      ]);

      const result = await repository.findByUserId('user123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Tank 2'); // Should be sorted by createdAt desc
      expect(result[1].name).toBe('Tank 1');
    });

    it('should handle pagination', async () => {
      // Create 15 aquariums
      const aquariums = [];
      for (let i = 0; i < 15; i++) {
        aquariums.push({
          userId: 'user123',
          name: `Tank ${i}`,
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
        });
      }
      await aquariumModel.create(aquariums);

      const page1 = await repository.findByUserId('user123', { page: 1, limit: 10 });
      const page2 = await repository.findByUserId('user123', { page: 2, limit: 10 });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });

    it('should filter by status', async () => {
      await aquariumModel.create([
        {
          userId: 'user123',
          name: 'Active Tank',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
        },
        {
          userId: 'user123',
          name: 'Maintenance Tank',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.MAINTENANCE,
        },
      ]);

      const result = await repository.findByUserId('user123', {
        status: AquariumStatus.MAINTENANCE,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maintenance Tank');
    });
  });

  describe('findPublicAquariums', () => {
    it('should find public aquariums', async () => {
      await aquariumModel.create([
        {
          userId: 'user1',
          name: 'Public Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
          isPublic: true,
        },
        {
          userId: 'user2',
          name: 'Public Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
          status: AquariumStatus.ACTIVE,
          isPublic: true,
        },
        {
          userId: 'user3',
          name: 'Private Tank',
          waterType: WaterType.FRESHWATER,
          volume: 150,
          status: AquariumStatus.ACTIVE,
          isPublic: false,
        },
      ]);

      const result = await repository.findPublicAquariums();

      expect(result).toHaveLength(2);
      expect(result.every(a => a.isPublic)).toBe(true);
    });

    it('should filter public aquariums by water type', async () => {
      await aquariumModel.create([
        {
          userId: 'user1',
          name: 'Freshwater Public',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
          isPublic: true,
        },
        {
          userId: 'user2',
          name: 'Saltwater Public',
          waterType: WaterType.SALTWATER,
          volume: 200,
          status: AquariumStatus.ACTIVE,
          isPublic: true,
        },
      ]);

      const result = await repository.findPublicAquariums({
        waterType: WaterType.SALTWATER,
      });

      expect(result).toHaveLength(1);
      expect(result[0].waterType).toBe(WaterType.SALTWATER);
    });
  });

  describe('update', () => {
    it('should update aquarium', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Original Name',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      const aquarium = await repository.findById(created._id.toString());
      if (!aquarium) throw new Error('Aquarium not found');

      aquarium.name = 'Updated Name';
      aquarium.volume = 150;

      const result = await repository.update(aquarium);

      expect(result.name).toBe('Updated Name');
      expect(result.volume).toBe(150);

      // Verify in database
      const dbRecord = await aquariumModel.findById(created._id);
      expect(dbRecord?.name).toBe('Updated Name');
      expect(dbRecord?.volume).toBe(150);
    });

    it('should update equipment array', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        equipment: [],
      });

      const aquarium = await repository.findById(created._id.toString());
      if (!aquarium) throw new Error('Aquarium not found');

      const newEquipment = new Equipment({
        name: 'New Filter',
        type: EquipmentType.FILTER,
      });
      aquarium.equipment.push(newEquipment);

      const result = await repository.update(aquarium);

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0].name).toBe('New Filter');
    });
  });

  describe('delete', () => {
    it('should soft delete aquarium', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      await repository.delete(created._id.toString());

      const dbRecord = await aquariumModel.findById(created._id);
      expect(dbRecord?.deletedAt).toBeDefined();

      // Should not be found by findById
      const result = await repository.findById(created._id.toString());
      expect(result).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore soft deleted aquarium', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        deletedAt: new Date(),
      });

      await repository.restore(created._id.toString());

      const dbRecord = await aquariumModel.findById(created._id);
      expect(dbRecord?.deletedAt).toBeNull();

      // Should be found by findById
      const result = await repository.findById(created._id.toString());
      expect(result).toBeDefined();
    });
  });

  describe('countByUserId', () => {
    it('should count aquariums for user', async () => {
      await aquariumModel.create([
        {
          userId: 'user123',
          name: 'Tank 1',
          waterType: WaterType.FRESHWATER,
          volume: 100,
          status: AquariumStatus.ACTIVE,
        },
        {
          userId: 'user123',
          name: 'Tank 2',
          waterType: WaterType.SALTWATER,
          volume: 200,
          status: AquariumStatus.ACTIVE,
        },
        {
          userId: 'user123',
          name: 'Deleted Tank',
          waterType: WaterType.FRESHWATER,
          volume: 150,
          status: AquariumStatus.ACTIVE,
          deletedAt: new Date(),
        },
        {
          userId: 'otheruser',
          name: 'Other Tank',
          waterType: WaterType.FRESHWATER,
          volume: 150,
          status: AquariumStatus.ACTIVE,
        },
      ]);

      const count = await repository.countByUserId('user123');

      expect(count).toBe(2); // Should not count deleted
    });
  });

  describe('exists', () => {
    it('should check if aquarium exists', async () => {
      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
      });

      const exists = await repository.exists(created._id.toString());
      const notExists = await repository.exists('507f1f77bcf86cd799439011');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('domain entity mapping', () => {
    it('should correctly map latest water parameters', async () => {
      const parameters = {
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
        recordedAt: new Date(),
      };

      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        latestParameters: parameters,
      });

      const result = await repository.findById(created._id.toString());

      expect(result?.latestParameters).toBeDefined();
      expect(result?.latestParameters?.temperature).toBe(25);
      expect(result?.latestParameters?.ph).toBe(7.0);
    });

    it('should calculate health status based on parameters', async () => {
      const criticalParams = {
        temperature: 35,
        ph: 9.0,
        ammonia: 2,
        nitrite: 1,
        nitrate: 100,
        recordedAt: new Date(),
      };

      const created = await aquariumModel.create({
        userId: 'user123',
        name: 'Test Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        status: AquariumStatus.ACTIVE,
        latestParameters: criticalParams,
      });

      const result = await repository.findById(created._id.toString());

      expect(result?.getHealthStatus()).toBe('critical');
    });
  });
});