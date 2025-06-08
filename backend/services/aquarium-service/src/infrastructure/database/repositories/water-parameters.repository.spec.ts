import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { WaterParametersRepository } from './water-parameters.repository';
import { WaterParameters as WaterParametersSchema, WaterParametersDocument } from '../schemas/water-parameters.schema';
import { WaterParameters } from '../../../domain/entities/water-parameters.entity';

describe('WaterParametersRepository', () => {
  let repository: WaterParametersRepository;
  let parametersModel: Model<WaterParametersDocument>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: WaterParametersSchema.name, schema: WaterParametersSchema },
        ]),
      ],
      providers: [WaterParametersRepository],
    }).compile();

    repository = module.get<WaterParametersRepository>(WaterParametersRepository);
    parametersModel = module.get<Model<WaterParametersDocument>>(
      getModelToken(WaterParametersSchema.name)
    );
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    await parametersModel.deleteMany({});
  });

  describe('create', () => {
    it('should create water parameters', async () => {
      const parameters = new WaterParameters({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        ammonia: 0,
        nitrite: 0,
        nitrate: 20,
        phosphate: 0.5,
        kh: 6,
        gh: 8,
        recordedBy: 'user123',
        notes: 'Weekly test',
      });

      const result = await repository.create(parameters);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.temperature).toBe(25);
      expect(result.ph).toBe(7.0);
      expect(result.ammonia).toBe(0);
      expect(result.notes).toBe('Weekly test');
    });

    it('should set recordedAt if not provided', async () => {
      const parameters = new WaterParameters({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
      });

      const result = await repository.create(parameters);

      expect(result.recordedAt).toBeDefined();
      expect(result.recordedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should find parameters by id', async () => {
      const created = await parametersModel.create({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        recordedAt: new Date(),
      });

      const result = await repository.findById(created._id.toString());

      expect(result).toBeDefined();
      expect(result?.id).toBe(created._id.toString());
      expect(result?.temperature).toBe(25);
    });

    it('should return null for non-existent id', async () => {
      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('findByAquariumId', () => {
    it('should find all parameters for an aquarium', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      await parametersModel.create([
        {
          aquariumId,
          temperature: 25,
          ph: 7.0,
          recordedAt: now,
        },
        {
          aquariumId,
          temperature: 24,
          ph: 7.1,
          recordedAt: yesterday,
        },
        {
          aquariumId,
          temperature: 26,
          ph: 6.9,
          recordedAt: twoDaysAgo,
        },
        {
          aquariumId: 'other-aquarium',
          temperature: 25,
          ph: 7.0,
          recordedAt: now,
        },
      ]);

      const result = await repository.findByAquariumId(aquariumId);

      expect(result).toHaveLength(3);
      expect(result[0].temperature).toBe(25); // Most recent first
      expect(result[1].temperature).toBe(24);
      expect(result[2].temperature).toBe(26);
    });

    it('should handle pagination', async () => {
      const aquariumId = 'aquarium123';
      const parameters = [];
      for (let i = 0; i < 15; i++) {
        parameters.push({
          aquariumId,
          temperature: 25 + i * 0.1,
          ph: 7.0,
          recordedAt: new Date(Date.now() - i * 60 * 60 * 1000),
        });
      }
      await parametersModel.create(parameters);

      const page1 = await repository.findByAquariumId(aquariumId, { page: 1, limit: 10 });
      const page2 = await repository.findByAquariumId(aquariumId, { page: 2, limit: 10 });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });

    it('should filter by date range', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      await parametersModel.create([
        {
          aquariumId,
          temperature: 25,
          ph: 7.0,
          recordedAt: now,
        },
        {
          aquariumId,
          temperature: 24,
          ph: 7.1,
          recordedAt: threeDaysAgo,
        },
        {
          aquariumId,
          temperature: 26,
          ph: 6.9,
          recordedAt: fiveDaysAgo,
        },
      ]);

      const result = await repository.findByAquariumId(aquariumId, {
        startDate: yesterday,
        endDate: now,
      });

      expect(result).toHaveLength(1);
      expect(result[0].temperature).toBe(25);
    });
  });

  describe('findLatestByAquariumId', () => {
    it('should find the latest parameters', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await parametersModel.create([
        {
          aquariumId,
          temperature: 25,
          ph: 7.0,
          recordedAt: now,
        },
        {
          aquariumId,
          temperature: 24,
          ph: 7.1,
          recordedAt: yesterday,
        },
      ]);

      const result = await repository.findLatestByAquariumId(aquariumId);

      expect(result).toBeDefined();
      expect(result?.temperature).toBe(25);
    });

    it('should return null if no parameters exist', async () => {
      const result = await repository.findLatestByAquariumId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update water parameters', async () => {
      const created = await parametersModel.create({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        recordedAt: new Date(),
      });

      const parameters = await repository.findById(created._id.toString());
      if (!parameters) throw new Error('Parameters not found');

      parameters.temperature = 26;
      parameters.ammonia = 0.25;
      parameters.notes = 'Updated test';

      const result = await repository.update(parameters);

      expect(result.temperature).toBe(26);
      expect(result.ammonia).toBe(0.25);
      expect(result.notes).toBe('Updated test');

      // Verify in database
      const dbRecord = await parametersModel.findById(created._id);
      expect(dbRecord?.temperature).toBe(26);
    });
  });

  describe('delete', () => {
    it('should delete water parameters', async () => {
      const created = await parametersModel.create({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        recordedAt: new Date(),
      });

      await repository.delete(created._id.toString());

      const dbRecord = await parametersModel.findById(created._id);
      expect(dbRecord).toBeNull();
    });
  });

  describe('deleteByAquariumId', () => {
    it('should delete all parameters for an aquarium', async () => {
      const aquariumId = 'aquarium123';

      await parametersModel.create([
        {
          aquariumId,
          temperature: 25,
          ph: 7.0,
          recordedAt: new Date(),
        },
        {
          aquariumId,
          temperature: 24,
          ph: 7.1,
          recordedAt: new Date(),
        },
        {
          aquariumId: 'other-aquarium',
          temperature: 25,
          ph: 7.0,
          recordedAt: new Date(),
        },
      ]);

      await repository.deleteByAquariumId(aquariumId);

      const remaining = await parametersModel.find({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].aquariumId).toBe('other-aquarium');
    });
  });

  describe('getAverageParameters', () => {
    it('should calculate average parameters over time period', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();

      await parametersModel.create([
        {
          aquariumId,
          temperature: 24,
          ph: 6.8,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
          recordedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        },
        {
          aquariumId,
          temperature: 25,
          ph: 7.0,
          ammonia: 0.25,
          nitrite: 0,
          nitrate: 20,
          recordedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        {
          aquariumId,
          temperature: 26,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0.1,
          nitrate: 30,
          recordedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        },
      ]);

      const result = await repository.getAverageParameters(aquariumId, 7);

      expect(result.temperature).toBeCloseTo(25, 1);
      expect(result.ph).toBeCloseTo(7.0, 1);
      expect(result.ammonia).toBeCloseTo(0.083, 2);
      expect(result.nitrite).toBeCloseTo(0.033, 2);
      expect(result.nitrate).toBeCloseTo(20, 1);
    });

    it('should return zeros for aquarium with no parameters', async () => {
      const result = await repository.getAverageParameters('non-existent', 7);

      expect(result.temperature).toBe(0);
      expect(result.ph).toBe(0);
    });
  });

  describe('getParameterTrends', () => {
    it('should calculate parameter trends', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();

      // Create parameters showing increasing temperature trend
      const parameters = [];
      for (let i = 0; i < 7; i++) {
        parameters.push({
          aquariumId,
          temperature: 24 + i * 0.5, // Increasing from 24 to 27
          ph: 7.0 + (i % 2) * 0.1, // Oscillating between 7.0 and 7.1
          ammonia: 0,
          recordedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        });
      }
      await parametersModel.create(parameters);

      const result = await repository.getParameterTrends(aquariumId, 7);

      expect(result.temperature.trend).toBe('increasing');
      expect(result.temperature.min).toBe(24);
      expect(result.temperature.max).toBe(27);
      expect(result.temperature.avg).toBeCloseTo(25.5, 1);

      expect(result.ph.trend).toBe('stable');
      expect(result.ph.min).toBe(7.0);
      expect(result.ph.max).toBe(7.1);
    });

    it('should detect decreasing trends', async () => {
      const aquariumId = 'aquarium123';
      const now = new Date();

      const parameters = [];
      for (let i = 0; i < 5; i++) {
        parameters.push({
          aquariumId,
          temperature: 27 - i * 0.5, // Decreasing from 27 to 25
          ph: 7.0,
          recordedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        });
      }
      await parametersModel.create(parameters);

      const result = await repository.getParameterTrends(aquariumId, 7);

      expect(result.temperature.trend).toBe('decreasing');
    });

    it('should handle missing parameters', async () => {
      const aquariumId = 'aquarium123';

      await parametersModel.create({
        aquariumId,
        temperature: 25,
        ph: 7.0,
        // No ammonia recorded
        recordedAt: new Date(),
      });

      const result = await repository.getParameterTrends(aquariumId, 7);

      expect(result.ammonia.avg).toBe(0);
      expect(result.ammonia.trend).toBe('stable');
    });
  });

  describe('domain entity mapping', () => {
    it('should correctly map all fields', async () => {
      const now = new Date();
      const waterChangeDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const created = await parametersModel.create({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        ammonia: 0.1,
        nitrite: 0,
        nitrate: 20,
        phosphate: 0.5,
        kh: 6,
        gh: 8,
        salinity: 0,
        co2: 30,
        oxygen: 8,
        tds: 200,
        recordedAt: now,
        recordedBy: 'user123',
        lastWaterChange: waterChangeDate,
        notes: 'Test notes',
      });

      const result = await repository.findById(created._id.toString());

      expect(result).toBeDefined();
      expect(result?.temperature).toBe(25);
      expect(result?.phosphate).toBe(0.5);
      expect(result?.kh).toBe(6);
      expect(result?.gh).toBe(8);
      expect(result?.co2).toBe(30);
      expect(result?.oxygen).toBe(8);
      expect(result?.tds).toBe(200);
      expect(result?.recordedBy).toBe('user123');
      expect(result?.notes).toBe('Test notes');
      expect(result?.getDaysSinceWaterChange()).toBe(3);
    });

    it('should calculate status methods correctly', async () => {
      const created = await parametersModel.create({
        aquariumId: 'aquarium123',
        temperature: 25,
        ph: 7.0,
        ammonia: 0.5, // High
        nitrite: 0,
        nitrate: 20,
        recordedAt: new Date(),
      });

      const result = await repository.findById(created._id.toString());

      expect(result?.hasHighAmmonia()).toBe(true);
      expect(result?.needsWaterChange()).toBe(true);
      expect(result?.getOverallStatus()).toBe('warning');
    });
  });
});