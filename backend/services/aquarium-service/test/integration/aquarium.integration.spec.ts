import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../../src/app.module';
import { AquariumService } from '../../src/application/services/aquarium.service';
import { AquariumRepository } from '../../src/infrastructure/database/repositories/aquarium.repository';
import { EventPublisher } from '../../src/infrastructure/messaging/event.publisher';
import { AquariumType, WaterType, EquipmentType, InhabitantCategory, SubscriptionType } from '@verpa/common';

describe('Aquarium Service Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let aquariumService: AquariumService;
  let aquariumRepository: AquariumRepository;
  let eventPublisher: EventPublisher;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    subscriptionType: SubscriptionType.PREMIUM,
  };

  const testAquarium = {
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
    description: 'Integration test aquarium',
    location: 'Living Room',
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();

    aquariumService = moduleFixture.get<AquariumService>(AquariumService);
    aquariumRepository = moduleFixture.get<AquariumRepository>(AquariumRepository);
    eventPublisher = moduleFixture.get<EventPublisher>(EventPublisher);

    // Mock event publisher
    jest.spyOn(eventPublisher, 'publish').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = await mongoServer.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    jest.clearAllMocks();
  });

  describe('Aquarium Creation', () => {
    it('should create a new aquarium successfully', async () => {
      const result = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(testAquarium.name);
      expect(result.userId).toBe(mockUser.id);
      expect(result.type).toBe(testAquarium.type);
      expect(result.volume).toBe(testAquarium.volume);
      expect(result.healthScore).toBeDefined();
      expect(result.isActive).toBe(true);
    });

    it('should publish aquarium created event', async () => {
      await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'aquarium.created',
          data: expect.objectContaining({
            userId: mockUser.id,
            aquariumId: expect.any(String),
          }),
        }),
      );
    });

    it('should enforce subscription limits', async () => {
      // Create maximum allowed aquariums for premium
      for (let i = 0; i < 10; i++) {
        await aquariumService.create(
          mockUser.id,
          { ...testAquarium, name: `Tank ${i}` },
          mockUser.subscriptionType,
        );
      }

      // Try to create one more
      await expect(
        aquariumService.create(
          mockUser.id,
          { ...testAquarium, name: 'Excess Tank' },
          mockUser.subscriptionType,
        ),
      ).rejects.toThrow('Aquarium limit reached for your subscription');
    });

    it('should prevent duplicate aquarium names for same user', async () => {
      await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );

      await expect(
        aquariumService.create(
          mockUser.id,
          testAquarium,
          mockUser.subscriptionType,
        ),
      ).rejects.toThrow('Aquarium with this name already exists');
    });
  });

  describe('Aquarium Retrieval', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should find aquarium by ID', async () => {
      const result = await aquariumService.findOne(aquariumId, mockUser.id);

      expect(result.id).toBe(aquariumId);
      expect(result.name).toBe(testAquarium.name);
    });

    it('should not find aquarium of another user', async () => {
      await expect(
        aquariumService.findOne(aquariumId, 'other-user'),
      ).rejects.toThrow('Aquarium not found');
    });

    it('should find all user aquariums', async () => {
      // Create additional aquariums
      await aquariumService.create(
        mockUser.id,
        { ...testAquarium, name: 'Tank 2' },
        mockUser.subscriptionType,
      );

      const result = await aquariumService.findAll({
        userId: mockUser.id,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter aquariums by water type', async () => {
      await aquariumService.create(
        mockUser.id,
        {
          ...testAquarium,
          name: 'Saltwater Tank',
          type: AquariumType.SALTWATER,
          waterType: WaterType.SALTWATER,
        },
        mockUser.subscriptionType,
      );

      const result = await aquariumService.findAll({
        userId: mockUser.id,
        waterType: WaterType.FRESHWATER,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].waterType).toBe(WaterType.FRESHWATER);
    });
  });

  describe('Aquarium Updates', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should update aquarium details', async () => {
      const updateData = {
        name: 'Updated Tank',
        description: 'Updated description',
        location: 'Bedroom',
      };

      const result = await aquariumService.update(
        aquariumId,
        mockUser.id,
        updateData,
      );

      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(result.location).toBe(updateData.location);
    });

    it('should not update protected fields', async () => {
      const updateData = {
        userId: 'different-user',
        healthScore: 100,
      };

      const result = await aquariumService.update(
        aquariumId,
        mockUser.id,
        updateData,
      );

      expect(result.userId).toBe(mockUser.id);
      expect(result.healthScore).not.toBe(100);
    });

    it('should publish aquarium updated event', async () => {
      await aquariumService.update(
        aquariumId,
        mockUser.id,
        { name: 'Updated' },
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'aquarium.updated',
          data: expect.objectContaining({
            aquariumId,
          }),
        }),
      );
    });
  });

  describe('Equipment Management', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should add equipment to aquarium', async () => {
      const equipment = {
        name: 'Test Filter',
        type: EquipmentType.FILTER,
        brand: 'TestBrand',
        model: 'TB-100',
        purchaseDate: new Date('2024-01-01'),
        warrantyExpiry: new Date('2025-01-01'),
        notes: 'High performance filter',
      };

      const result = await aquariumService.addEquipment(
        aquariumId,
        mockUser.id,
        equipment,
      );

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0]).toMatchObject({
        name: equipment.name,
        type: equipment.type,
        brand: equipment.brand,
      });
      expect(result.equipment[0]).toHaveProperty('id');
    });

    it('should update equipment', async () => {
      // Add equipment first
      const equipment = {
        name: 'Test Filter',
        type: EquipmentType.FILTER,
      };

      let result = await aquariumService.addEquipment(
        aquariumId,
        mockUser.id,
        equipment,
      );
      const equipmentId = result.equipment[0].id;

      // Update equipment
      result = await aquariumService.updateEquipment(
        aquariumId,
        mockUser.id,
        equipmentId,
        { name: 'Updated Filter', notes: 'Updated notes' },
      );

      const updatedEquipment = result.equipment.find(e => e.id === equipmentId);
      expect(updatedEquipment.name).toBe('Updated Filter');
      expect(updatedEquipment.notes).toBe('Updated notes');
    });

    it('should perform equipment maintenance', async () => {
      // Add equipment
      const equipment = {
        name: 'Test Filter',
        type: EquipmentType.FILTER,
        nextMaintenance: new Date('2024-02-01'),
      };

      let result = await aquariumService.addEquipment(
        aquariumId,
        mockUser.id,
        equipment,
      );
      const equipmentId = result.equipment[0].id;

      // Perform maintenance
      result = await aquariumService.performEquipmentMaintenance(
        aquariumId,
        mockUser.id,
        equipmentId,
        'Cleaned filter media',
      );

      const maintainedEquipment = result.equipment.find(e => e.id === equipmentId);
      expect(maintainedEquipment.lastMaintenance).toBeDefined();
      expect(maintainedEquipment.nextMaintenance).toBeDefined();
      expect(new Date(maintainedEquipment.nextMaintenance)).toBeInstanceOf(Date);
    });

    it('should remove equipment', async () => {
      // Add equipment
      let result = await aquariumService.addEquipment(
        aquariumId,
        mockUser.id,
        { name: 'Test Filter', type: EquipmentType.FILTER },
      );
      const equipmentId = result.equipment[0].id;

      // Remove equipment
      await aquariumService.removeEquipment(
        aquariumId,
        mockUser.id,
        equipmentId,
      );

      const aquarium = await aquariumService.findOne(aquariumId, mockUser.id);
      expect(aquarium.equipment).toHaveLength(0);
    });
  });

  describe('Inhabitant Management', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should add inhabitant to aquarium', async () => {
      const inhabitant = {
        species: 'Betta splendens',
        commonName: 'Siamese Fighting Fish',
        category: InhabitantCategory.FISH,
        quantity: 1,
        sex: 'male',
        addedDate: new Date('2024-01-01'),
        notes: 'Beautiful blue halfmoon',
        origin: 'Local pet store',
      };

      const result = await aquariumService.addInhabitant(
        aquariumId,
        mockUser.id,
        inhabitant,
      );

      expect(result.inhabitants).toHaveLength(1);
      expect(result.inhabitants[0]).toMatchObject({
        species: inhabitant.species,
        commonName: inhabitant.commonName,
        category: inhabitant.category,
        quantity: inhabitant.quantity,
      });
      expect(result.inhabitants[0]).toHaveProperty('id');
    });

    it('should check compatibility when adding inhabitants', async () => {
      // Add aggressive fish
      await aquariumService.addInhabitant(
        aquariumId,
        mockUser.id,
        {
          species: 'Betta splendens',
          commonName: 'Betta',
          category: InhabitantCategory.FISH,
          quantity: 1,
          sex: 'male',
        },
      );

      // Try to add another male betta (incompatible)
      await expect(
        aquariumService.addInhabitant(
          aquariumId,
          mockUser.id,
          {
            species: 'Betta splendens',
            commonName: 'Betta',
            category: InhabitantCategory.FISH,
            quantity: 1,
            sex: 'male',
          },
        ),
      ).rejects.toThrow('Incompatible with existing inhabitants');
    });

    it('should update inhabitant', async () => {
      // Add inhabitant
      let result = await aquariumService.addInhabitant(
        aquariumId,
        mockUser.id,
        {
          species: 'Corydoras paleatus',
          commonName: 'Peppered Cory',
          category: InhabitantCategory.FISH,
          quantity: 3,
        },
      );
      const inhabitantId = result.inhabitants[0].id;

      // Update inhabitant
      result = await aquariumService.updateInhabitant(
        aquariumId,
        mockUser.id,
        inhabitantId,
        { quantity: 6, notes: 'Added 3 more' },
      );

      const updatedInhabitant = result.inhabitants.find(i => i.id === inhabitantId);
      expect(updatedInhabitant.quantity).toBe(6);
      expect(updatedInhabitant.notes).toBe('Added 3 more');
    });

    it('should track inhabitant health changes', async () => {
      // Add inhabitant
      let result = await aquariumService.addInhabitant(
        aquariumId,
        mockUser.id,
        {
          species: 'Test Fish',
          category: InhabitantCategory.FISH,
          quantity: 1,
          healthStatus: 'healthy',
        },
      );
      const inhabitantId = result.inhabitants[0].id;

      // Update health status
      result = await aquariumService.updateInhabitant(
        aquariumId,
        mockUser.id,
        inhabitantId,
        { healthStatus: 'sick', notes: 'Showing signs of ich' },
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inhabitant.health_changed',
          data: expect.objectContaining({
            aquariumId,
            inhabitantId,
            healthStatus: 'sick',
          }),
        }),
      );
    });
  });

  describe('Water Parameters', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should record water parameters', async () => {
      const parameters = {
        temperature: 78,
        ph: 7.2,
        ammonia: 0,
        nitrite: 0,
        nitrate: 10,
        phosphate: 0.5,
        gh: 8,
        kh: 6,
        notes: 'Weekly test',
      };

      const result = await aquariumService.recordWaterParameters(
        aquariumId,
        mockUser.id,
        parameters,
      );

      expect(result.waterParameters).toBeDefined();
      expect(result.healthScore).toBeDefined();
    });

    it('should update health score based on parameters', async () => {
      const initialAquarium = await aquariumService.findOne(aquariumId, mockUser.id);
      const initialHealthScore = initialAquarium.healthScore;

      // Record good parameters
      await aquariumService.recordWaterParameters(
        aquariumId,
        mockUser.id,
        {
          temperature: 78,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
        },
      );

      let updatedAquarium = await aquariumService.findOne(aquariumId, mockUser.id);
      expect(updatedAquarium.healthScore).toBeGreaterThanOrEqual(initialHealthScore);

      // Record bad parameters
      await aquariumService.recordWaterParameters(
        aquariumId,
        mockUser.id,
        {
          temperature: 90, // Too high
          ph: 5.0, // Too low
          ammonia: 2, // Dangerous
          nitrite: 1, // Dangerous
          nitrate: 80, // Too high
        },
      );

      updatedAquarium = await aquariumService.findOne(aquariumId, mockUser.id);
      expect(updatedAquarium.healthScore).toBeLessThan(initialHealthScore);
    });

    it('should retrieve parameter history', async () => {
      // Record multiple parameters
      for (let i = 0; i < 5; i++) {
        await aquariumService.recordWaterParameters(
          aquariumId,
          mockUser.id,
          {
            temperature: 78 + i * 0.5,
            ph: 7.2,
            ammonia: 0,
            nitrite: 0,
            nitrate: 10 + i,
          },
        );
      }

      const history = await aquariumService.getParameterHistory(
        aquariumId,
        mockUser.id,
        { limit: 3 },
      );

      expect(history).toHaveLength(3);
      expect(history[0].temperature).toBe(80); // Most recent
    });

    it('should get parameter trends', async () => {
      // Record parameters over time
      const baseDate = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        
        await aquariumService.recordWaterParameters(
          aquariumId,
          mockUser.id,
          {
            temperature: 78 + Math.sin(i) * 2,
            ph: 7.2 + Math.cos(i) * 0.2,
            ammonia: 0,
            nitrite: 0,
            nitrate: 10 + i * 2,
          },
        );
      }

      const trends = await aquariumService.getParameterTrends(
        aquariumId,
        mockUser.id,
        7,
      );

      expect(trends).toHaveProperty('temperature');
      expect(trends).toHaveProperty('ph');
      expect(trends).toHaveProperty('nitrate');
      expect(trends.temperature).toHaveProperty('average');
      expect(trends.temperature).toHaveProperty('trend');
      expect(trends.temperature).toHaveProperty('data');
    });
  });

  describe('Health Status', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should calculate comprehensive health status', async () => {
      // Add equipment
      await aquariumService.addEquipment(
        aquariumId,
        mockUser.id,
        {
          name: 'Filter',
          type: EquipmentType.FILTER,
          nextMaintenance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      );

      // Add inhabitants
      await aquariumService.addInhabitant(
        aquariumId,
        mockUser.id,
        {
          species: 'Test Fish',
          category: InhabitantCategory.FISH,
          quantity: 5,
          healthStatus: 'healthy',
        },
      );

      // Record good water parameters
      await aquariumService.recordWaterParameters(
        aquariumId,
        mockUser.id,
        {
          temperature: 78,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
        },
      );

      const healthStatus = await aquariumService.getHealthStatus(
        aquariumId,
        mockUser.id,
      );

      expect(healthStatus).toHaveProperty('score');
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('issues');
      expect(healthStatus).toHaveProperty('recommendations');
      expect(healthStatus.score).toBeGreaterThan(80);
      expect(healthStatus.status).toBe('good');
    });

    it('should identify health issues', async () => {
      // Record problematic parameters
      await aquariumService.recordWaterParameters(
        aquariumId,
        mockUser.id,
        {
          temperature: 85, // Too high
          ph: 6.0, // Too low
          ammonia: 1, // Dangerous
          nitrite: 0.5, // Dangerous
          nitrate: 60, // High
        },
      );

      const healthStatus = await aquariumService.getHealthStatus(
        aquariumId,
        mockUser.id,
      );

      expect(healthStatus.issues).toContain('High temperature');
      expect(healthStatus.issues).toContain('Low pH');
      expect(healthStatus.issues).toContain('Ammonia detected');
      expect(healthStatus.issues).toContain('Nitrite detected');
      expect(healthStatus.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Public Aquarium Features', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        { ...testAquarium, isPublic: true },
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should find public aquariums', async () => {
      // Create private aquarium
      await aquariumService.create(
        mockUser.id,
        { ...testAquarium, name: 'Private Tank', isPublic: false },
        mockUser.subscriptionType,
      );

      const publicAquariums = await aquariumService.findPublicAquariums({});

      expect(publicAquariums.items).toHaveLength(1);
      expect(publicAquariums.items[0].isPublic).toBe(true);
    });

    it('should allow viewing public aquarium by other users', async () => {
      const otherUserId = 'other-user';
      
      // Should be able to view public aquarium
      const aquarium = await aquariumRepository.findById(aquariumId);
      expect(aquarium.isPublic).toBe(true);

      // But not modify it
      await expect(
        aquariumService.update(aquariumId, otherUserId, { name: 'Hacked' }),
      ).rejects.toThrow('Aquarium not found');
    });
  });

  describe('Soft Delete and Restore', () => {
    let aquariumId: string;

    beforeEach(async () => {
      const aquarium = await aquariumService.create(
        mockUser.id,
        testAquarium,
        mockUser.subscriptionType,
      );
      aquariumId = aquarium.id;
    });

    it('should soft delete aquarium', async () => {
      await aquariumService.delete(aquariumId, mockUser.id);

      // Should not be found in normal queries
      const result = await aquariumService.findAll({
        userId: mockUser.id,
      });
      expect(result.items).toHaveLength(0);

      // But should exist in database
      const aquarium = await aquariumRepository.findById(aquariumId);
      expect(aquarium.deletedAt).toBeDefined();
      expect(aquarium.isActive).toBe(false);
    });

    it('should restore soft deleted aquarium', async () => {
      await aquariumService.delete(aquariumId, mockUser.id);
      
      const restored = await aquariumService.restore(aquariumId, mockUser.id);

      expect(restored.deletedAt).toBeNull();
      expect(restored.isActive).toBe(true);

      // Should be found in normal queries again
      const result = await aquariumService.findAll({
        userId: mockUser.id,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should include deleted aquariums when requested', async () => {
      await aquariumService.delete(aquariumId, mockUser.id);

      const result = await aquariumService.findAll({
        userId: mockUser.id,
        includeDeleted: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].deletedAt).toBeDefined();
    });
  });
});