import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../backend/services/api-gateway/src/app.module';
import * as jwt from 'jsonwebtoken';

describe('Security Tests', () => {
  let app: INestApplication;
  let validToken: string;
  let userId: string;

  const testUser = {
    email: 'security.test@example.com',
    username: 'securitytest',
    password: 'SecurePassword123!',
    firstName: 'Security',
    lastName: 'Test',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and login test user
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    userId = registerRes.body.user.id;
    validToken = registerRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: userId, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject requests with tampered token', async () => {
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection attempts in search queries', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM aquariums WHERE 1=1; --",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await request(app.getHttpServer())
          .get('/aquariums')
          .set('Authorization', `Bearer ${validToken}`)
          .query({ search: attempt })
          .expect(200);

        // Should return empty results, not execute malicious SQL
        expect(response.body.items).toEqual([]);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent NoSQL injection in MongoDB queries', async () => {
      const noSqlInjectionAttempts = [
        { $ne: null },
        { $gt: '' },
        { $where: 'this.password.length > 0' },
      ];

      for (const attempt of noSqlInjectionAttempts) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: attempt,
            password: 'anypassword',
          })
          .expect(400); // Should be rejected by validation
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize XSS attempts in user input', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      for (const attempt of xssAttempts) {
        const response = await request(app.getHttpServer())
          .post('/aquariums')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            name: attempt,
            description: attempt,
            type: 'freshwater',
            volume: 100,
            volumeUnit: 'liters',
            waterType: 'freshwater',
          })
          .expect(201);

        // Check that script tags are sanitized
        expect(response.body.name).not.toContain('<script>');
        expect(response.body.description).not.toContain('<script>');
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should validate origin header for state-changing requests', async () => {
      await request(app.getHttpServer())
        .post('/aquariums')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', 'http://malicious-site.com')
        .send({
          name: 'Test Tank',
          type: 'freshwater',
          volume: 100,
          volumeUnit: 'liters',
          waterType: 'freshwater',
        })
        .expect(403);
    });
  });

  describe('Authorization and Access Control', () => {
    let otherUserToken: string;
    let otherUserId: string;
    let privateAquariumId: string;

    beforeAll(async () => {
      // Create another user
      const otherUser = {
        email: 'other.user@example.com',
        username: 'otheruser',
        password: 'OtherPassword123!',
        firstName: 'Other',
        lastName: 'User',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUser);

      otherUserId = res.body.user.id;
      otherUserToken = res.body.tokens.accessToken;

      // Create a private aquarium
      const aquariumRes = await request(app.getHttpServer())
        .post('/aquariums')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Private Tank',
          type: 'freshwater',
          volume: 100,
          volumeUnit: 'liters',
          waterType: 'freshwater',
          isPublic: false,
        });

      privateAquariumId = aquariumRes.body.id;
    });

    it('should prevent access to other users private resources', async () => {
      await request(app.getHttpServer())
        .get(`/aquariums/${privateAquariumId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should prevent modification of other users resources', async () => {
      await request(app.getHttpServer())
        .put(`/aquariums/${privateAquariumId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('should prevent deletion of other users resources', async () => {
      await request(app.getHttpServer())
        .delete(`/aquariums/${privateAquariumId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should enforce role-based access control', async () => {
      // Try to access admin endpoints as regular user
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .put(`/admin/users/${otherUserId}/role`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const promises = [];

      // Make 100 rapid login attempts
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'rate.limit@example.com',
              password: 'wrong',
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should reject oversized payloads', async () => {
      const largePayload = {
        name: 'A'.repeat(10000), // 10KB name
        description: 'B'.repeat(1000000), // 1MB description
        type: 'freshwater',
        volume: 100,
        volumeUnit: 'liters',
        waterType: 'freshwater',
      };

      await request(app.getHttpServer())
        .post('/aquariums')
        .set('Authorization', `Bearer ${validToken}`)
        .send(largePayload)
        .expect(413); // Payload too large
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'email@',
        'email@domain..com',
      ];

      for (const email of invalidEmails) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            username: `user_${Date.now()}`,
            password: 'ValidPassword123!',
          })
          .expect(400);
      }
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'Password',
        'Password1',
        'Pass1!',
        'password123!',
        'PASSWORD123!',
      ];

      for (const password of weakPasswords) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `weak.${Date.now()}@example.com`,
            username: `weak_${Date.now()}`,
            password,
          })
          .expect(400);
      }
    });
  });

  describe('File Upload Security', () => {
    it('should reject non-image files', async () => {
      await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('<?php echo "hacked"; ?>'), 'malicious.php')
        .field('type', 'aquarium')
        .field('entityId', 'test123')
        .expect(400);
    });

    it('should reject files with double extensions', async () => {
      await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('fake image'), 'image.jpg.php')
        .field('type', 'aquarium')
        .field('entityId', 'test123')
        .expect(400);
    });

    it('should reject oversized files', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await request(app.getHttpServer())
        .post('/media/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', largeBuffer, 'large.jpg')
        .field('type', 'aquarium')
        .field('entityId', 'test123')
        .expect(413);
    });
  });

  describe('API Versioning Security', () => {
    it('should not expose deprecated API versions', async () => {
      await request(app.getHttpServer())
        .get('/api/v0/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });

    it('should handle version mismatches gracefully', async () => {
      await request(app.getHttpServer())
        .get('/api/v999/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose sensitive error details', async () => {
      const response = await request(app.getHttpServer())
        .get('/aquariums/invalid-id-format')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      // Should not expose database details
      expect(response.body.message).not.toContain('MongoDB');
      expect(response.body.message).not.toContain('Cast to ObjectId');
    });

    it('should not reveal user existence on login failure', async () => {
      const nonExistentResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        })
        .expect(401);

      const wrongPasswordResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      // Both should return the same generic message
      expect(nonExistentResponse.body.message).toBe(wrongPasswordResponse.body.message);
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      // Login to get a token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginRes.body.tokens.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use the token after logout
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should rotate refresh tokens', async () => {
      // Login to get tokens
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginRes.body.tokens.refreshToken;

      // Refresh tokens
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.tokens.refreshToken).not.toBe(refreshToken);

      // Old refresh token should not work
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});