import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { CacheService } from '../cache/cache.service';
import { EventPublisher } from '../../infrastructure/messaging/event.publisher';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let cacheService: CacheService;
  let eventPublisher: EventPublisher;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password: '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    name: 'Test User',
    isEmailVerified: true,
    isActive: true,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
        tokens: mockTokens,
      });
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('user.logged_in', {
        userId: mockUser.id,
        timestamp: expect.any(Date),
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'invalid@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      mockUserService.findByEmail.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const newUser = {
        ...mockUser,
        id: '456',
        email: registerDto.email,
        name: registerDto.name,
      };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('user.registered', {
        userId: newUser.id,
        email: newUser.email,
      });
    });

    it('should throw BadRequestException for existing email', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: '123', email: 'test@example.com' };
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockCacheService.get.mockResolvedValue(null); // Token not blacklisted
      mockUserService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce(newTokens.accessToken)
        .mockReturnValueOnce(newTokens.refreshToken);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual(newTokens);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:${refreshToken}`,
        true,
        expect.any(Number),
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: '123' });
      mockCacheService.get.mockResolvedValue(true); // Token is blacklisted

      await expect(service.refreshTokens('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout and blacklist tokens', async () => {
      const userId = '123';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      await service.logout(userId, accessToken, refreshToken);

      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:${accessToken}`,
        true,
        expect.any(Number),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:${refreshToken}`,
        true,
        expect.any(Number),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('user.logged_out', {
        userId,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('validateUser', () => {
    it('should return user data for valid token', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should return null for non-existent user', async () => {
      const payload = { sub: '999', email: 'deleted@example.com' };
      
      mockUserService.findById.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});