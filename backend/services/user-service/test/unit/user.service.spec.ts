import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../src/domain/services/user.service';
import { IUserRepository } from '../../src/domain/repositories/user.repository.interface';
import { User } from '../../src/domain/entities/user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from '../../src/application/dto';
import { UserRole, SubscriptionType } from '@verpa/common';
import { UserEvents } from '../../src/application/events/user.events';

describe('UserService', () => {
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
    loginAttempts: 0,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
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
            findByUsername: jest.fn(),
            findByEmailOrUsername: jest.fn(),
            findAll: jest.fn(),
            findPaginated: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
            count: jest.fn(),
            exists: jest.fn(),
            incrementLoginAttempts: jest.fn(),
            resetLoginAttempts: jest.fn(),
            lockAccount: jest.fn(),
            removeAllRefreshTokens: jest.fn(),
            updateLastLogin: jest.fn(),
            verifyEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
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

    configService.get.mockReturnValue(12); // bcrypt rounds
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'SecureP@ssw0rd!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create a new user successfully', async () => {
      userRepository.findByEmailOrUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser as User);

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      const result = await service.create(createUserDto);

      expect(userRepository.findByEmailOrUsername).toHaveBeenCalledWith(createUserDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createUserDto,
          email: createUserDto.email.toLowerCase(),
          passwordHash: 'hashedPassword',
          isActive: true,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.USER_CREATED,
        expect.any(Object),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findByEmailOrUsername.mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);

      const result = await service.findById('123');

      expect(userRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findById('123')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is deleted', async () => {
      userRepository.findById.mockResolvedValue({ ...mockUser, isDeleted: true } as User);

      await expect(service.findById('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      userRepository.update.mockResolvedValue({ ...mockUser, ...updateUserDto } as User);

      const result = await service.update('123', updateUserDto);

      expect(userRepository.update).toHaveBeenCalledWith('123', updateUserDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.USER_UPDATED,
        expect.any(Object),
      );
      expect(result.firstName).toBe('Updated');
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const updateDto = { email: 'existing@example.com' };
      userRepository.findById.mockResolvedValue(mockUser as User);
      userRepository.findByEmail.mockResolvedValue({ ...mockUser, _id: '456' } as User);

      await expect(service.update('123', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldPassword',
      newPassword: 'NewSecureP@ssw0rd!',
    };

    it('should change password successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('newHashedPassword'));

      await service.changePassword('123', changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.passwordHash,
      );
      expect(userRepository.update).toHaveBeenCalledWith('123', {
        passwordHash: 'newHashedPassword',
      });
      expect(userRepository.removeAllRefreshTokens).toHaveBeenCalledWith('123');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.PASSWORD_CHANGED,
        expect.any(Object),
      );
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.changePassword('123', changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      userRepository.findByEmailOrUsername.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(userRepository.resetLoginAttempts).toHaveBeenCalledWith('123');
    });

    it('should return null for invalid password', async () => {
      userRepository.findByEmailOrUsername.mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      userRepository.incrementLoginAttempts.mockResolvedValue({
        ...mockUser,
        loginAttempts: 1,
      } as User);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
      expect(userRepository.incrementLoginAttempts).toHaveBeenCalledWith('123');
    });

    it('should lock account after max failed attempts', async () => {
      const userWithAttempts = { ...mockUser, loginAttempts: 4 } as User;
      userRepository.findByEmailOrUsername.mockResolvedValue(userWithAttempts);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      userRepository.incrementLoginAttempts.mockResolvedValue({
        ...userWithAttempts,
        loginAttempts: 5,
      } as User);

      await service.validateUser('test@example.com', 'wrongpassword');

      expect(userRepository.lockAccount).toHaveBeenCalledWith(
        '123',
        expect.any(Date),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.ACCOUNT_LOCKED,
        expect.any(Object),
      );
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockUntil: new Date(Date.now() + 60000),
        get isLocked() {
          return true;
        },
      } as User;
      userRepository.findByEmailOrUsername.mockResolvedValue(lockedUser);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verificationToken';
      const userWithToken = {
        ...mockUser,
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() + 3600000),
      } as User;

      userRepository.findAll.mockResolvedValue([userWithToken]);
      userRepository.verifyEmail.mockResolvedValue({
        ...userWithToken,
        emailVerified: true,
      } as User);

      const result = await service.verifyEmail(token);

      expect(userRepository.findAll).toHaveBeenCalledWith({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: expect.any(Date) },
      });
      expect(userRepository.verifyEmail).toHaveBeenCalledWith('123');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.EMAIL_VERIFIED,
        expect.any(Object),
      );
      expect(result.emailVerified).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      userRepository.findAll.mockResolvedValue([]);

      await expect(service.verifyEmail('invalidToken')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      userRepository.count.mockResolvedValueOnce(100); // total
      userRepository.count.mockResolvedValueOnce(90); // active
      userRepository.count.mockResolvedValueOnce(80); // verified
      userRepository.findAll.mockResolvedValue([
        { subscriptionType: SubscriptionType.FREE } as User,
        { subscriptionType: SubscriptionType.FREE } as User,
        { subscriptionType: SubscriptionType.PREMIUM } as User,
      ]);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        active: 90,
        verified: 80,
        unverified: 20,
        bySubscription: {
          [SubscriptionType.FREE]: 2,
          [SubscriptionType.PREMIUM]: 1,
        },
      });
    });
  });
});