import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule as ApiGatewayModule } from '../../backend/services/api-gateway/src/app.module';
import { AppModule as UserServiceModule } from '../../backend/services/user-service/src/app.module';
import { AppModule as AquariumServiceModule } from '../../backend/services/aquarium-service/src/app.module';
import { AppModule as SubscriptionServiceModule } from '../../backend/services/subscription-service/src/app.module';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import { SubscriptionType } from '@verpa/common';

describe('Verpa E2E Tests - Complete User Journey', () => {
  let app: INestApplication;
  let apiUrl: string;
  let dockerEnvironment: DockerComposeEnvironment;
  
  // Test data
  let userToken: string;
  let userId: string;
  let aquariumId: string;
  let subscriptionId: string;

  const testUser = {
    email: 'e2e.test@example.com',
    username: 'e2etestuser',
    password: 'TestPassword123!',
    firstName: 'E2E',
    lastName: 'Test',
    phone: '+1234567890',
  };

  beforeAll(async () => {
    // Start Docker containers
    dockerEnvironment = new DockerComposeEnvironment('.', 'docker-compose.test.yml')
      .withWaitStrategy('mongodb', Wait.forLogMessage('Waiting for connections'))
      .withWaitStrategy('redis', Wait.forLogMessage('Ready to accept connections'))
      .withWaitStrategy('kafka', Wait.forLogMessage('Started'))
      .withWaitStrategy('minio', Wait.forHealthCheck());

    await dockerEnvironment.up();

    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get API Gateway URL
    const apiGatewayContainer = dockerEnvironment.getContainer('api-gateway');
    const apiGatewayPort = apiGatewayContainer.getMappedPort(3000);
    apiUrl = `http://localhost:${apiGatewayPort}`;

    // Create test application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 120000); // 2 minutes timeout

  afterAll(async () => {
    await app.close();
    await dockerEnvironment.down();
  });

  describe('1. User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(apiUrl)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.emailVerified).toBe(false);
      
      userId = response.body.user.id;
      userToken = response.body.tokens.accessToken;
    });

    it('should not allow duplicate registration', async () => {
      await request(apiUrl)
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should login with correct credentials', async () => {
      const response = await request(apiUrl)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      userToken = response.body.tokens.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(apiUrl)
        .get('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body.subscriptionType).toBe(SubscriptionType.FREE);
    });
  });

  describe('2. Email Verification Flow', () => {
    let verificationToken: string;

    it('should request email verification', async () => {
      const response = await request(apiUrl)
        .post('/auth/request-verification')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toContain('Verification email sent');
    });

    it('should verify email with valid token', async () => {
      // In real scenario, we would get this from email
      // For testing, we'll fetch it from the database
      const userResponse = await request(apiUrl)
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      verificationToken = userResponse.body.emailVerificationToken;

      const response = await request(apiUrl)
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.emailVerified).toBe(true);
    });
  });

  describe('3. Subscription Management', () => {
    it('should get available subscription plans', async () => {
      const response = await request(apiUrl)
        .get('/subscriptions/plans')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should create premium subscription', async () => {
      const response = await request(apiUrl)
        .post('/subscriptions/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: SubscriptionType.PREMIUM,
          paymentMethodId: 'pm_card_visa', // Test payment method
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(SubscriptionType.PREMIUM);
      expect(response.body.status).toBe('active');
      
      subscriptionId = response.body.id;
    });

    it('should get current subscription', async () => {
      const response = await request(apiUrl)
        .get('/subscriptions/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(subscriptionId);
      expect(response.body.features.maxAquariums).toBe(10);
    });
  });

  describe('4. Aquarium Management', () => {
    it('should create first aquarium', async () => {
      const response = await request(apiUrl)
        .post('/aquariums')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My First Tank',
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
          description: 'E2E test aquarium',
          location: 'Living Room',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('My First Tank');
      expect(response.body.healthScore).toBeDefined();
      
      aquariumId = response.body.id;
    });

    it('should add equipment to aquarium', async () => {
      const response = await request(apiUrl)
        .post(`/aquariums/${aquariumId}/equipment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Fluval 307 Filter',
          type: 'filter',
          brand: 'Fluval',
          model: '307',
          purchaseDate: '2024-01-01',
          warrantyExpiry: '2026-01-01',
          notes: 'Canister filter for 100-220L tanks',
        })
        .expect(201);

      expect(response.body.equipment).toHaveLength(1);
      expect(response.body.equipment[0].name).toBe('Fluval 307 Filter');
    });

    it('should add inhabitants', async () => {
      const response = await request(apiUrl)
        .post(`/aquariums/${aquariumId}/inhabitants`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          species: 'Paracheirodon innesi',
          commonName: 'Neon Tetra',
          category: 'fish',
          quantity: 10,
          sex: 'mixed',
          addedDate: '2024-01-15',
          notes: 'School of neon tetras',
          origin: 'Local fish store',
        })
        .expect(201);

      expect(response.body.inhabitants).toHaveLength(1);
      expect(response.body.inhabitants[0].quantity).toBe(10);
    });

    it('should record water parameters', async () => {
      const response = await request(apiUrl)
        .post(`/aquariums/${aquariumId}/parameters`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          temperature: 78,
          ph: 7.2,
          ammonia: 0,
          nitrite: 0,
          nitrate: 10,
          phosphate: 0.5,
          gh: 8,
          kh: 6,
          notes: 'Weekly water test',
        })
        .expect(201);

      expect(response.body.waterParameters).toBeDefined();
      expect(response.body.healthScore).toBeGreaterThan(0);
    });
  });

  describe('5. Events and Reminders', () => {
    let eventId: string;

    it('should create maintenance event', async () => {
      const response = await request(apiUrl)
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Water Change',
          description: '25% water change',
          type: 'maintenance',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
          aquariumId: aquariumId,
          recurring: true,
          recurrencePattern: 'weekly',
          reminder: {
            enabled: true,
            beforeMinutes: 60,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.recurring).toBe(true);
      eventId = response.body.id;
    });

    it('should get upcoming events', async () => {
      const response = await request(apiUrl)
        .get('/events/upcoming')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].id).toBe(eventId);
    });
  });

  describe('6. Analytics and Insights', () => {
    it('should get aquarium analytics', async () => {
      const response = await request(apiUrl)
        .get(`/analytics/aquarium/${aquariumId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toHaveProperty('healthTrend');
      expect(response.body).toHaveProperty('parameterTrends');
      expect(response.body).toHaveProperty('maintenanceHistory');
    });

    it('should get parameter predictions', async () => {
      const response = await request(apiUrl)
        .get(`/analytics/aquarium/${aquariumId}/predictions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('predictions');
      expect(response.body.predictions).toHaveProperty('nitrate');
      expect(response.body.predictions).toHaveProperty('temperature');
    });
  });

  describe('7. Media Upload', () => {
    it('should upload aquarium photo', async () => {
      const response = await request(apiUrl)
        .post('/media/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('fake image data'), {
          filename: 'aquarium.jpg',
          contentType: 'image/jpeg',
        })
        .field('type', 'aquarium')
        .field('entityId', aquariumId)
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
    });

    it('should get aquarium with image', async () => {
      const response = await request(apiUrl)
        .get(`/aquariums/${aquariumId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.imageUrl).toBeDefined();
    });
  });

  describe('8. Social Features', () => {
    it('should make aquarium public', async () => {
      const response = await request(apiUrl)
        .put(`/aquariums/${aquariumId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isPublic: true })
        .expect(200);

      expect(response.body.isPublic).toBe(true);
    });

    it('should find public aquariums', async () => {
      const response = await request(apiUrl)
        .get('/aquariums/public')
        .expect(200);

      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.some(a => a.id === aquariumId)).toBe(true);
    });

    it('should share aquarium snapshot', async () => {
      const response = await request(apiUrl)
        .post(`/social/share/aquarium/${aquariumId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Check out my aquarium!',
          description: 'My thriving freshwater community tank',
          tags: ['freshwater', 'community', 'planted'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('shareUrl');
      expect(response.body).toHaveProperty('shareId');
    });
  });

  describe('9. Notifications', () => {
    it('should get notification preferences', async () => {
      const response = await request(apiUrl)
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('push');
      expect(response.body).toHaveProperty('sms');
    });

    it('should update notification preferences', async () => {
      const response = await request(apiUrl)
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: {
            maintenance: true,
            parameters: true,
            health: true,
            marketing: false,
          },
          push: {
            maintenance: true,
            parameters: false,
            health: true,
          },
        })
        .expect(200);

      expect(response.body.email.maintenance).toBe(true);
      expect(response.body.email.marketing).toBe(false);
    });
  });

  describe('10. Health Alerts', () => {
    it('should trigger health alert with bad parameters', async () => {
      // Record dangerous parameters
      const response = await request(apiUrl)
        .post(`/aquariums/${aquariumId}/parameters`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          temperature: 85, // Too high
          ph: 6.0, // Too low
          ammonia: 2, // Dangerous
          nitrite: 1, // Dangerous
          nitrate: 80, // Too high
        })
        .expect(201);

      expect(response.body.healthScore).toBeLessThan(50);
    });

    it('should get health alerts', async () => {
      const response = await request(apiUrl)
        .get(`/aquariums/${aquariumId}/alerts`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('severity');
      expect(response.body[0]).toHaveProperty('message');
    });
  });

  describe('11. Data Export', () => {
    it('should export aquarium data', async () => {
      const response = await request(apiUrl)
        .get(`/aquariums/${aquariumId}/export`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.body).toHaveProperty('aquarium');
      expect(response.body).toHaveProperty('equipment');
      expect(response.body).toHaveProperty('inhabitants');
      expect(response.body).toHaveProperty('parameters');
      expect(response.body).toHaveProperty('events');
    });

    it('should export all user data (GDPR)', async () => {
      const response = await request(apiUrl)
        .get('/users/export-data')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('aquariums');
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('12. Account Management', () => {
    it('should update user profile', async () => {
      const response = await request(apiUrl)
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'User',
          bio: 'Aquarium enthusiast',
          location: 'New York, USA',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.bio).toBe('Aquarium enthusiast');
    });

    it('should change password', async () => {
      const newPassword = 'NewPassword123!';
      
      await request(apiUrl)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
        })
        .expect(200);

      // Login with new password
      const loginResponse = await request(apiUrl)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
    });
  });

  describe('13. Cleanup and Deletion', () => {
    it('should delete aquarium', async () => {
      await request(apiUrl)
        .delete(`/aquariums/${aquariumId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });

    it('should cancel subscription', async () => {
      const response = await request(apiUrl)
        .post(`/subscriptions/${subscriptionId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cancelAtPeriodEnd: true })
        .expect(200);

      expect(response.body.cancelAtPeriodEnd).toBe(true);
    });

    it('should delete user account', async () => {
      await request(apiUrl)
        .delete('/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'NewPassword123!',
          reason: 'Testing account deletion',
        })
        .expect(204);
    });

    it('should not be able to login after deletion', async () => {
      await request(apiUrl)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'NewPassword123!',
        })
        .expect(401);
    });
  });
});