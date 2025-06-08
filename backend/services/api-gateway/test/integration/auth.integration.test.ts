import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('AuthController Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;

  const testUser = {
    email: 'integration@test.com',
    password: 'TestPassword123!',
    name: 'Integration Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should validate password strength', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'newuser@test.com',
          password: '123', // Weak password
        })
        .expect(400);

      expect(response.body.message).toContain('password');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'anypassword',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens.accessToken).not.toBe(authToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should return 400 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.name).toBe(testUser.name);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          refreshToken,
        })
        .expect(200);
    });

    it('should invalidate tokens after logout', async () => {
      // Try to use the old token after logout
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      // Try to refresh with old refresh token
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);
    });
  });

  describe('OAuth Login', () => {
    describe('GET /api/v1/auth/google', () => {
      it('should redirect to Google OAuth', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/auth/google')
          .expect(302);

        expect(response.headers.location).toContain('accounts.google.com');
      });
    });

    describe('GET /api/v1/auth/apple', () => {
      it('should redirect to Apple OAuth', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/auth/apple')
          .expect(302);

        expect(response.headers.location).toContain('appleid.apple.com');
      });
    });
  });

  describe('Password Reset Flow', () => {
    describe('POST /api/v1/auth/forgot-password', () => {
      it('should send password reset email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({
            email: testUser.email,
          })
          .expect(200);

        expect(response.body.message).toContain('email sent');
      });

      it('should return 200 even for non-existent email (security)', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'nonexistent@test.com',
          })
          .expect(200);
      });
    });

    describe('POST /api/v1/auth/reset-password', () => {
      it('should validate reset token format', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/reset-password')
          .send({
            token: 'invalid-token',
            password: 'NewPassword123!',
          })
          .expect(400);
      });
    });
  });

  describe('Email Verification Flow', () => {
    describe('POST /api/v1/auth/verify-email', () => {
      it('should validate verification token format', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/verify-email')
          .send({
            token: 'invalid-token',
          })
          .expect(400);
      });
    });

    describe('POST /api/v1/auth/resend-verification', () => {
      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/resend-verification')
          .expect(401);
      });
    });
  });
});