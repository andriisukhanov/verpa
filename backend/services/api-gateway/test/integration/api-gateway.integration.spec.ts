import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('API Gateway Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;
  let adminToken: string;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    role: UserRole.USER,
    subscriptionType: SubscriptionType.PREMIUM,
  };

  const mockAdmin = {
    id: 'admin123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    subscriptionType: SubscriptionType.PROFESSIONAL,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    authToken = jwtService.sign(mockUser);
    adminToken = jwtService.sign(mockAdmin);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return detailed health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/check')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('Authentication Flow', () => {
    describe('POST /auth/register', () => {
      it('should register a new user', async () => {
        const newUser = {
          email: 'newuser@example.com',
          password: 'Password123!',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(newUser)
          .expect(201);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.user.email).toBe(newUser.email);
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
      });

      it('should reject invalid registration data', async () => {
        const invalidUser = {
          email: 'invalid-email',
          password: '123',
          username: 'a',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(invalidUser)
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /auth/login', () => {
      it('should login with valid credentials', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'Password123!',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(credentials)
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
      });

      it('should reject invalid credentials', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'WrongPassword',
        };

        await request(app.getHttpServer())
          .post('/auth/login')
          .send(credentials)
          .expect(401);
      });
    });

    describe('POST /auth/refresh', () => {
      it('should refresh tokens with valid refresh token', async () => {
        const refreshToken = 'valid-refresh-token';

        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toHaveProperty('tokens');
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout authenticated user', async () => {
        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      it('should reject logout without authentication', async () => {
        await request(app.getHttpServer())
          .post('/auth/logout')
          .expect(401);
      });
    });
  });

  describe('User Management', () => {
    describe('GET /users/profile', () => {
      it('should return authenticated user profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', mockUser.id);
        expect(response.body).toHaveProperty('email', mockUser.email);
      });

      it('should reject unauthenticated request', async () => {
        await request(app.getHttpServer())
          .get('/users/profile')
          .expect(401);
      });
    });

    describe('PUT /users/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890',
        };

        const response = await request(app.getHttpServer())
          .put('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.firstName).toBe(updateData.firstName);
        expect(response.body.lastName).toBe(updateData.lastName);
      });
    });

    describe('Admin User Management', () => {
      it('should list all users (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page', 1);
        expect(response.body).toHaveProperty('limit', 10);
      });

      it('should reject non-admin access to user list', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });
    });
  });

  describe('Aquarium Management', () => {
    let aquariumId: string;

    describe('POST /aquariums', () => {
      it('should create a new aquarium', async () => {
        const newAquarium = {
          name: 'Test Tank',
          type: 'freshwater',
          volume: 100,
          volumeUnit: 'liters',
          dimensions: {
            length: 100,
            width: 40,
            height: 50,
            unit: 'cm',
          },
          waterType: 'freshwater',
          description: 'Integration test aquarium',
          location: 'Living Room',
        };

        const response = await request(app.getHttpServer())
          .post('/aquariums')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newAquarium)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newAquarium.name);
        expect(response.body.userId).toBe(mockUser.id);
        
        aquariumId = response.body.id;
      });
    });

    describe('GET /aquariums', () => {
      it('should list user aquariums', async () => {
        const response = await request(app.getHttpServer())
          .get('/aquariums')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(Array.isArray(response.body.items)).toBe(true);
      });

      it('should filter aquariums by water type', async () => {
        const response = await request(app.getHttpServer())
          .get('/aquariums')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ waterType: 'freshwater' })
          .expect(200);

        expect(response.body.items).toBeInstanceOf(Array);
        response.body.items.forEach((aquarium: any) => {
          expect(aquarium.waterType).toBe('freshwater');
        });
      });
    });

    describe('GET /aquariums/:id', () => {
      it('should get aquarium details', async () => {
        const response = await request(app.getHttpServer())
          .get(`/aquariums/${aquariumId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(aquariumId);
        expect(response.body).toHaveProperty('equipment');
        expect(response.body).toHaveProperty('inhabitants');
      });

      it('should reject access to other user aquarium', async () => {
        await request(app.getHttpServer())
          .get(`/aquariums/${aquariumId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(403);
      });
    });

    describe('Water Parameters', () => {
      it('should record water parameters', async () => {
        const parameters = {
          temperature: 78,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
          notes: 'Weekly test',
        };

        const response = await request(app.getHttpServer())
          .post(`/aquariums/${aquariumId}/parameters`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(parameters)
          .expect(201);

        expect(response.body).toHaveProperty('waterParameters');
        expect(response.body).toHaveProperty('healthScore');
      });

      it('should get parameter history', async () => {
        const response = await request(app.getHttpServer())
          .get(`/aquariums/${aquariumId}/parameters`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 10 })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('Equipment Management', () => {
      let equipmentId: string;

      it('should add equipment', async () => {
        const equipment = {
          name: 'Test Filter',
          type: 'filter',
          brand: 'TestBrand',
          model: 'TB-100',
          purchaseDate: '2024-01-01',
          warrantyExpiry: '2025-01-01',
        };

        const response = await request(app.getHttpServer())
          .post(`/aquariums/${aquariumId}/equipment`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(equipment)
          .expect(201);

        expect(response.body.equipment).toBeInstanceOf(Array);
        equipmentId = response.body.equipment[0].id;
      });

      it('should update equipment', async () => {
        const update = { name: 'Updated Filter' };

        const response = await request(app.getHttpServer())
          .put(`/aquariums/${aquariumId}/equipment/${equipmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(update)
          .expect(200);

        const updatedEquipment = response.body.equipment.find(
          (e: any) => e.id === equipmentId,
        );
        expect(updatedEquipment.name).toBe(update.name);
      });
    });

    describe('Inhabitant Management', () => {
      let inhabitantId: string;

      it('should add inhabitant', async () => {
        const inhabitant = {
          species: 'Betta splendens',
          commonName: 'Siamese Fighting Fish',
          category: 'fish',
          quantity: 1,
          sex: 'male',
          addedDate: '2024-01-01',
          notes: 'Beautiful blue halfmoon',
        };

        const response = await request(app.getHttpServer())
          .post(`/aquariums/${aquariumId}/inhabitants`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(inhabitant)
          .expect(201);

        expect(response.body.inhabitants).toBeInstanceOf(Array);
        inhabitantId = response.body.inhabitants[0].id;
      });

      it('should update inhabitant', async () => {
        const update = { quantity: 2, notes: 'Added another' };

        const response = await request(app.getHttpServer())
          .put(`/aquariums/${aquariumId}/inhabitants/${inhabitantId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(update)
          .expect(200);

        const updatedInhabitant = response.body.inhabitants.find(
          (i: any) => i.id === inhabitantId,
        );
        expect(updatedInhabitant.quantity).toBe(update.quantity);
      });
    });
  });

  describe('Event Management', () => {
    let eventId: string;

    it('should create an event', async () => {
      const event = {
        title: 'Water Change',
        description: 'Weekly 25% water change',
        type: 'maintenance',
        startDate: '2024-01-20T10:00:00Z',
        endDate: '2024-01-20T11:00:00Z',
        aquariumId: 'aquarium123',
        reminder: {
          enabled: true,
          beforeMinutes: 30,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(event)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(event.title);
      eventId = response.body.id;
    });

    it('should get user events', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ from: '2024-01-01', to: '2024-01-31' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Media Upload', () => {
    it('should handle file upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test image data'), 'test.jpg')
        .field('type', 'aquarium')
        .field('entityId', 'aquarium123')
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('size');
    });

    it('should reject invalid file types', async () => {
      await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test data'), 'test.exe')
        .field('type', 'aquarium')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const promises = [];
      
      // Make 100 requests rapidly
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.100'),
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('API Versioning', () => {
    it('should handle v1 API requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('version', 'v1');
    });

    it('should handle v2 API requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('apiVersion', 'v2');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/aquariums')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'a' }) // Invalid data
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should handle internal server errors gracefully', async () => {
      // This would require mocking a service to throw an error
      // For now, we'll test the error response format
      const response = await request(app.getHttpServer())
        .post('/aquariums')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          volume: -100, // This might trigger a domain error
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});