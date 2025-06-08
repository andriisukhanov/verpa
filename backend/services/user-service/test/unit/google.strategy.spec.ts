import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy, GoogleProfile } from '../../src/application/strategies/oauth/google.strategy';
import { AuthService } from '../../src/application/services/auth.service';
import { UserService } from '../../src/domain/services/user.service';
import { User } from '../../src/domain/entities/user.entity';
import { AuthProvider, UserRole, SubscriptionType } from '@verpa/common';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: Partial<User> = {
    _id: '123' as any,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    subscriptionType: SubscriptionType.FREE,
    emailVerified: true,
    authProviders: [],
  };

  const mockGoogleProfile: GoogleProfile = {
    id: 'google-123',
    emails: [{ value: 'test@gmail.com', verified: true }],
    name: {
      givenName: 'John',
      familyName: 'Doe',
    },
    photos: [{ value: 'https://example.com/photo.jpg' }],
    provider: 'google',
  };

  const mockTokens = {
    user: mockUser as User,
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    expiresIn: 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'oauth.google.clientId': 'test-client-id',
                'oauth.google.clientSecret': 'test-client-secret',
                'oauth.google.callbackUrl': 'http://localhost:3001/auth/google/callback',
              };
              return config[key];
            }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            generateTokensForUser: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findByAuthProvider: jest.fn(),
            findByEmail: jest.fn(),
            linkAuthProvider: jest.fn(),
            createOAuthUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get(AuthService);
    userService = module.get(UserService);
    configService = module.get(ConfigService);
  });

  describe('validate', () => {
    const done = jest.fn();

    beforeEach(() => {
      done.mockReset();
    });

    it('should return existing user with Google provider', async () => {
      userService.findByAuthProvider.mockResolvedValue(mockUser as User);
      authService.generateTokensForUser.mockResolvedValue(mockTokens);

      await strategy.validate('access-token', 'refresh-token', mockGoogleProfile, done);

      expect(userService.findByAuthProvider).toHaveBeenCalledWith(
        AuthProvider.GOOGLE,
        'google-123',
      );
      expect(authService.generateTokensForUser).toHaveBeenCalledWith(mockUser);
      expect(done).toHaveBeenCalledWith(null, mockTokens);
    });

    it('should link Google to existing email user', async () => {
      userService.findByAuthProvider.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser as User);
      userService.linkAuthProvider.mockResolvedValue(undefined);
      authService.generateTokensForUser.mockResolvedValue(mockTokens);

      await strategy.validate('access-token', 'refresh-token', mockGoogleProfile, done);

      expect(userService.findByEmail).toHaveBeenCalledWith('test@gmail.com');
      expect(userService.linkAuthProvider).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          provider: AuthProvider.GOOGLE,
          providerId: 'google-123',
          email: 'test@gmail.com',
        }),
      );
      expect(done).toHaveBeenCalledWith(null, mockTokens);
    });

    it('should create new user when not found', async () => {
      const newUser = { ...mockUser, email: 'test@gmail.com' };
      userService.findByAuthProvider.mockResolvedValue(null);
      userService.findByEmail.mockRejectedValue(new Error('Not found'));
      userService.createOAuthUser.mockResolvedValue(newUser as User);
      authService.generateTokensForUser.mockResolvedValue({ ...mockTokens, user: newUser as User });

      await strategy.validate('access-token', 'refresh-token', mockGoogleProfile, done);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@gmail.com',
          username: expect.stringContaining('test_'),
          firstName: 'John',
          lastName: 'Doe',
          avatar: 'https://example.com/photo.jpg',
          emailVerified: true,
          authProviders: expect.arrayContaining([
            expect.objectContaining({
              provider: AuthProvider.GOOGLE,
              providerId: 'google-123',
            }),
          ]),
        }),
      );
      expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ user: newUser }));
    });

    it('should handle missing email', async () => {
      const profileWithoutEmail: GoogleProfile = {
        ...mockGoogleProfile,
        emails: [],
      };

      await strategy.validate('access-token', 'refresh-token', profileWithoutEmail, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), null);
      expect(done.mock.calls[0][0].message).toBe('No email found');
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      userService.findByAuthProvider.mockRejectedValue(error);

      await strategy.validate('access-token', 'refresh-token', mockGoogleProfile, done);

      expect(done).toHaveBeenCalledWith(error, null);
    });
  });
});