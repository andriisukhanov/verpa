import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { UserModule } from '../../src/user.module';
import { configuration } from '../../src/config/configuration';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('User Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let authToken: string;
  let adminToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        EventEmitterModule.forRoot(),
        UserModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    mongoConnection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  describe('Auth Endpoints', () => {
    describe('POST /auth/register', () => {
      it('should register a new user', async () => {
        const registerDto = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecureP@ssw0rd!',
          firstName: 'Test',
          lastName: 'User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        expect(response.body).toMatchObject({
          user: {
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            role: UserRole.USER,
            subscriptionType: SubscriptionType.FREE,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
        });

        authToken = response.body.accessToken;
        createdUserId = response.body.user._id;
      });

      it('should fail with invalid email', async () => {
        const registerDto = {
          email: 'invalid-email',
          username: 'testuser2',
          password: 'SecureP@ssw0rd!',
          firstName: 'Test',
          lastName: 'User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(400);

        expect(response.body.message).toContain('email must be an email');
      });

      it('should fail with weak password', async () => {
        const registerDto = {
          email: 'test2@example.com',
          username: 'testuser2',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(400);

        expect(response.body.message).toContain('password is not strong enough');
      });

      it('should fail with duplicate email', async () => {
        const registerDto = {
          email: 'test@example.com',
          username: 'testuser3',
          password: 'SecureP@ssw0rd!',
          firstName: 'Test',
          lastName: 'User',
        };

        await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(409);
      });
    });

    describe('POST /auth/login', () => {
      beforeAll(async () => {
        // Create admin user for tests
        const adminDto = {
          email: 'admin@example.com',
          username: 'admin',
          password: 'AdminP@ssw0rd!',
          firstName: 'Admin',
          lastName: 'User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(adminDto)
          .expect(201);

        // Update user role to admin (would normally be done through admin endpoint)
        await mongoConnection.collection('users').updateOne(
          { _id: response.body.user._id },
          { $set: { role: UserRole.ADMIN } },
        );

        // Login as admin
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'admin@example.com',
            password: 'AdminP@ssw0rd!',
          })
          .expect(200);

        adminToken = loginResponse.body.accessToken;
      });

      it('should login with email', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'test@example.com',
            password: 'SecureP@ssw0rd!',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          user: {
            email: 'test@example.com',
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });
      });

      it('should login with username', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'testuser',
            password: 'SecureP@ssw0rd!',
          })
          .expect(200);

        expect(response.body.user.username).toBe('testuser');
      });

      it('should fail with invalid credentials', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'test@example.com',
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });

    describe('POST /auth/refresh', () => {
      let refreshToken: string;

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'test@example.com',
            password: 'SecureP@ssw0rd!',
          });

        refreshToken = response.body.refreshToken;
      });

      it('should refresh tokens', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });

        expect(response.body.refreshToken).not.toBe(refreshToken);
      });

      it('should fail with invalid refresh token', async () => {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: 'invalid.token' })
          .expect(401);
      });
    });
  });

  describe('User Endpoints', () => {
    describe('GET /users/me', () => {
      it('should get current user profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        });
      });

      it('should fail without auth token', async () => {
        await request(app.getHttpServer())
          .get('/users/me')
          .expect(401);
      });
    });

    describe('PUT /users/me', () => {
      it('should update current user profile', async () => {
        const updateDto = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890',
        };

        const response = await request(app.getHttpServer())
          .put('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toMatchObject({
          firstName: 'Updated',
          lastName: 'Name',
          phone: '1234567890',
        });
      });

      it('should fail with invalid data', async () => {
        const updateDto = {
          email: 'invalid-email',
        };

        await request(app.getHttpServer())
          .put('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateDto)
          .expect(400);
      });
    });

    describe('POST /users/me/change-password', () => {
      it('should change password', async () => {
        await request(app.getHttpServer())
          .post('/users/me/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'SecureP@ssw0rd!',
            newPassword: 'NewSecureP@ssw0rd!',
          })
          .expect(204);

        // Verify can login with new password
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrUsername: 'test@example.com',
            password: 'NewSecureP@ssw0rd!',
          })
          .expect(200);
      });

      it('should fail with incorrect current password', async () => {
        await request(app.getHttpServer())
          .post('/users/me/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'wrongpassword',
            newPassword: 'NewSecureP@ssw0rd!',
          })
          .expect(401);
      });
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /users', () => {
      it('should get all users (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ limit: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          totalPages: expect.any(Number),
        });

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should fail for non-admin user', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });

      it('should filter users by search', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ search: 'test' })
          .expect(200);

        expect(response.body.data.every((user: any) => 
          user.email.includes('test') || 
          user.username.includes('test') ||
          user.firstName.includes('Test') ||
          user.lastName.includes('Test')
        )).toBe(true);
      });
    });

    describe('PUT /users/:id', () => {
      it('should update user by id (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .put(`/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            firstName: 'AdminUpdated',
          })
          .expect(200);

        expect(response.body.firstName).toBe('AdminUpdated');
      });
    });

    describe('PATCH /users/:id/role', () => {
      it('should update user role (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/users/${createdUserId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: UserRole.MODERATOR,
          })
          .expect(200);

        expect(response.body.role).toBe(UserRole.MODERATOR);
      });
    });

    describe('DELETE /users/:id', () => {
      it('should soft delete user (admin only)', async () => {
        await request(app.getHttpServer())
          .delete(`/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);

        // Verify user is soft deleted
        const user = await mongoConnection
          .collection('users')
          .findOne({ _id: createdUserId });
        
        expect(user?.isDeleted).toBe(true);
      });
    });

    describe('POST /users/:id/restore', () => {
      it('should restore deleted user (admin only)', async () => {
        const response = await request(app.getHttpServer())
          .post(`/users/${createdUserId}/restore`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.isDeleted).toBe(false);
      });
    });
  });
});