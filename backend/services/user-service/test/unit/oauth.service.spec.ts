import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UserService } from '../../src/domain/services/user.service';
import { IUserRepository } from '../../src/domain/repositories/user.repository.interface';
import { User } from '../../src/domain/entities/user.entity';
import { AuthProvider, UserRole, SubscriptionType } from '@verpa/common';
import * as bcrypt from 'bcrypt';

describe('UserService - OAuth', () => {
  let service: UserService;
  let userRepository: jest.Mocked<IUserRepository>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser: Partial<User> = {
    _id: '123' as any,
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    subscriptionType: SubscriptionType.FREE,
    emailVerified: true,
    isActive: true,
    isDeleted: false,
    authProviders: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'IUserRepository',
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByAuthProvider: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(12),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get('IUserRepository');
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOAuthUser', () => {
    const oauthUserDto = {
      email: 'oauth@example.com',
      username: 'oauthuser',
      firstName: 'OAuth',
      lastName: 'User',
      emailVerified: true,
      authProviders: [
        {
          provider: AuthProvider.GOOGLE,
          providerId: 'google-123',
          email: 'oauth@example.com',
          linkedAt: new Date(),
        },
      ],
    };

    it('should create OAuth user successfully', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ ...mockUser, ...oauthUserDto } as User);

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      const result = await service.createOAuthUser(oauthUserDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith('oauth@example.com');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'oauth@example.com',
          username: 'oauthuser',
          emailVerified: true,
          authProviders: oauthUserDto.authProviders,
          isActive: true,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.created', expect.any(Object));
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as User);

      await expect(service.createOAuthUser(oauthUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByAuthProvider', () => {
    it('should find user by auth provider', async () => {
      const userWithProvider = {
        ...mockUser,
        authProviders: [
          {
            provider: AuthProvider.GOOGLE,
            providerId: 'google-123',
            linkedAt: new Date(),
          },
        ],
      };
      userRepository.findByAuthProvider.mockResolvedValue(userWithProvider as User);

      const result = await service.findByAuthProvider(AuthProvider.GOOGLE, 'google-123');

      expect(userRepository.findByAuthProvider).toHaveBeenCalledWith('GOOGLE', 'google-123');
      expect(result).toEqual(userWithProvider);
    });

    it('should return null for deleted user', async () => {
      userRepository.findByAuthProvider.mockResolvedValue({ ...mockUser, isDeleted: true } as User);

      const result = await service.findByAuthProvider(AuthProvider.GOOGLE, 'google-123');

      expect(result).toBeNull();
    });
  });

  describe('linkAuthProvider', () => {
    const authProvider = {
      provider: AuthProvider.FACEBOOK,
      providerId: 'fb-123',
      email: 'test@facebook.com',
      linkedAt: new Date(),
    };

    it('should link auth provider successfully', async () => {
      const userWithGoogle = {
        ...mockUser,
        authProviders: [
          {
            provider: AuthProvider.GOOGLE,
            providerId: 'google-123',
            linkedAt: new Date(),
          },
        ],
      };

      userRepository.findById.mockResolvedValue(userWithGoogle as User);
      userRepository.findByAuthProvider.mockResolvedValue(null);
      userRepository.update.mockResolvedValue({
        ...userWithGoogle,
        authProviders: [...userWithGoogle.authProviders, authProvider],
      } as User);

      const result = await service.linkAuthProvider('123', authProvider);

      expect(userRepository.update).toHaveBeenCalledWith('123', {
        authProviders: expect.arrayContaining([
          expect.objectContaining({ provider: AuthProvider.GOOGLE }),
          expect.objectContaining({ provider: AuthProvider.FACEBOOK }),
        ]),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.updated', expect.any(Object));
    });

    it('should throw ConflictException if provider already linked', async () => {
      const userWithProvider = {
        ...mockUser,
        authProviders: [authProvider],
      };
      userRepository.findById.mockResolvedValue(userWithProvider as User);

      await expect(service.linkAuthProvider('123', authProvider)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if provider linked to another account', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      userRepository.findByAuthProvider.mockResolvedValue({ _id: '456' } as User);

      await expect(service.linkAuthProvider('123', authProvider)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('unlinkAuthProvider', () => {
    it('should unlink auth provider successfully', async () => {
      const userWithProviders = {
        ...mockUser,
        passwordHash: 'hashedPassword',
        authProviders: [
          {
            provider: AuthProvider.GOOGLE,
            providerId: 'google-123',
            linkedAt: new Date(),
          },
          {
            provider: AuthProvider.FACEBOOK,
            providerId: 'fb-123',
            linkedAt: new Date(),
          },
        ],
      };

      userRepository.findById.mockResolvedValue(userWithProviders as User);
      userRepository.update.mockResolvedValue({
        ...userWithProviders,
        authProviders: userWithProviders.authProviders.filter(
          (ap) => ap.provider !== AuthProvider.FACEBOOK,
        ),
      } as User);

      const result = await service.unlinkAuthProvider('123', AuthProvider.FACEBOOK);

      expect(userRepository.update).toHaveBeenCalledWith('123', {
        authProviders: expect.arrayContaining([
          expect.objectContaining({ provider: AuthProvider.GOOGLE }),
        ]),
      });
      expect(result.authProviders).toHaveLength(1);
    });

    it('should throw BadRequestException when unlinking last auth method', async () => {
      const userWithOneProvider = {
        ...mockUser,
        passwordHash: '',
        authProviders: [
          {
            provider: AuthProvider.GOOGLE,
            providerId: 'google-123',
            linkedAt: new Date(),
          },
        ],
      };

      userRepository.findById.mockResolvedValue(userWithOneProvider as User);

      await expect(
        service.unlinkAuthProvider('123', AuthProvider.GOOGLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow unlinking when user has password', async () => {
      const userWithPasswordAndProvider = {
        ...mockUser,
        passwordHash: 'hashedPassword',
        authProviders: [
          {
            provider: AuthProvider.GOOGLE,
            providerId: 'google-123',
            linkedAt: new Date(),
          },
        ],
      };

      userRepository.findById.mockResolvedValue(userWithPasswordAndProvider as User);
      userRepository.update.mockResolvedValue({
        ...userWithPasswordAndProvider,
        authProviders: [],
      } as User);

      const result = await service.unlinkAuthProvider('123', AuthProvider.GOOGLE);

      expect(result.authProviders).toHaveLength(0);
    });
  });
});