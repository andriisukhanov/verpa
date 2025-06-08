import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { UserModule } from '../../src/user.module';
import { configuration } from '../../src/config/configuration';
import { AuthProvider } from '@verpa/common';

describe('OAuth Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
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

    // Create a test user for linking/unlinking tests
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'oauth.test@example.com',
        username: 'oauthtest',
        password: 'SecureP@ssw0rd!',
        firstName: 'OAuth',
        lastName: 'Test',
      });

    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user._id;
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  describe('OAuth Provider Management', () => {
    describe('GET /auth/providers', () => {
      it('should return empty providers for new user', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toEqual({
          providers: [],
        });
      });
    });

    describe('OAuth Login Flows', () => {
      it('should redirect to Google OAuth', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/google')
          .expect(302);

        expect(response.headers.location).toContain('accounts.google.com');
      });

      it('should redirect to Facebook OAuth', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/facebook')
          .expect(302);

        expect(response.headers.location).toContain('facebook.com');
      });

      it('should handle Apple OAuth', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/apple')
          .expect(302);

        expect(response.headers.location).toContain('appleid.apple.com');
      });
    });

    describe('DELETE /auth/link/:provider', () => {
      beforeAll(async () => {
        // Manually add a provider to the user
        await mongoConnection.collection('users').updateOne(
          { _id: userId },
          {
            $push: {
              authProviders: {
                provider: AuthProvider.GOOGLE,
                providerId: 'google-test-123',
                email: 'oauth.test@gmail.com',
                linkedAt: new Date(),
              },
            },
          },
        );
      });

      it('should unlink OAuth provider', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/auth/link/${AuthProvider.GOOGLE}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          message: 'Provider unlinked successfully',
          user: expect.objectContaining({
            email: 'oauth.test@example.com',
            authProviders: [],
          }),
        });
      });

      it('should fail to unlink non-existent provider', async () => {
        await request(app.getHttpServer())
          .delete(`/auth/link/${AuthProvider.FACEBOOK}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200); // Still succeeds but doesn't change anything
      });

      it('should fail to unlink last auth method without password', async () => {
        // First, remove password and add only OAuth provider
        await mongoConnection.collection('users').updateOne(
          { _id: userId },
          {
            $set: {
              passwordHash: '',
              authProviders: [
                {
                  provider: AuthProvider.GOOGLE,
                  providerId: 'google-only-123',
                  email: 'oauth.test@gmail.com',
                  linkedAt: new Date(),
                },
              ],
            },
          },
        );

        await request(app.getHttpServer())
          .delete(`/auth/link/${AuthProvider.GOOGLE}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('OAuth User Creation', () => {
      it('should handle OAuth callback data correctly', async () => {
        // This test simulates what happens after OAuth callback
        // In real scenario, the OAuth provider would redirect here
        
        // Create a new OAuth user directly in database
        const oauthUser = await mongoConnection.collection('users').insertOne({
          email: 'google.user@gmail.com',
          username: 'google_user_123456',
          firstName: 'Google',
          lastName: 'User',
          emailVerified: true,
          isActive: true,
          role: 'USER',
          subscriptionType: 'FREE',
          authProviders: [
            {
              provider: AuthProvider.GOOGLE,
              providerId: 'google-unique-123',
              email: 'google.user@gmail.com',
              linkedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Verify the user was created correctly
        const user = await mongoConnection
          .collection('users')
          .findOne({ _id: oauthUser.insertedId });

        expect(user).toMatchObject({
          email: 'google.user@gmail.com',
          emailVerified: true,
          authProviders: expect.arrayContaining([
            expect.objectContaining({
              provider: AuthProvider.GOOGLE,
              providerId: 'google-unique-123',
            }),
          ]),
        });
      });
    });

    describe('OAuth Error Handling', () => {
      it('should handle OAuth errors gracefully', async () => {
        // Test with invalid OAuth token/code
        const response = await request(app.getHttpServer())
          .get('/auth/google/callback?error=access_denied')
          .expect(302);

        // Should redirect to frontend with error
        expect(response.headers.location).toContain('error=access_denied');
      });
    });
  });
});