import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../src/application/services/auth.service';
import { UserService } from '../../src/domain/services/user.service';
import { IUserRepository } from '../../src/domain/repositories/user.repository.interface';
import { User } from '../../src/domain/entities/user.entity';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../../src/application/dto';
import { UserRole, SubscriptionType } from '@verpa/common';
import { UserEvents } from '../../src/application/events/user.events';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<JwtService>;
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
    refreshTokens: [],
  };

  const mockTokens = {
    accessToken: 'access.token.here',
    refreshToken: 'refresh.token.here',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            validateUser: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: 'IUserRepository',
          useValue: {
            addRefreshToken: jest.fn(),
            removeRefreshToken: jest.fn(),
            removeAllRefreshTokens: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
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

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    userRepository = module.get('IUserRepository');
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);

    // Setup default mocks
    configService.get.mockImplementation((key: string) => {
      const config = {
        'auth.jwt.secret': 'test-secret',
        'auth.jwt.accessTokenExpiry': '15m',
        'auth.jwt.refreshTokenExpiry': '7d',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'SecureP@ssw0rd!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register a new user and return tokens', async () => {
      userService.create.mockResolvedValue(mockUser as User);
      jwtService.sign.mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);
      userRepository.addRefreshToken.mockResolvedValue(mockUser as User);

      const result = await service.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith(registerDto);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(userRepository.addRefreshToken).toHaveBeenCalledWith(
        '123',
        mockTokens.refreshToken,
      );
      expect(result).toMatchObject({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: 900, // 15 minutes
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      emailOrUsername: 'test@example.com',
      password: 'password',
    };

    it('should login user successfully', async () => {
      userService.validateUser.mockResolvedValue(mockUser as User);
      userService.updateLastLogin.mockResolvedValue();
      jwtService.sign.mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);
      userRepository.addRefreshToken.mockResolvedValue(mockUser as User);

      const result = await service.login(loginDto, '127.0.0.1', 'Chrome');

      expect(userService.validateUser).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
        loginDto.password,
      );
      expect(userService.updateLastLogin).toHaveBeenCalledWith('123', '127.0.0.1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.LOGIN_SUCCESS,
        expect.objectContaining({
          userId: '123',
          email: 'test@example.com',
          ip: '127.0.0.1',
          userAgent: 'Chrome',
        }),
      );
      expect(result).toMatchObject({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      userService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        UserEvents.LOGIN_FAILED,
        expect.objectContaining({
          emailOrUsername: loginDto.emailOrUsername,
          reason: 'Invalid credentials',
        }),
      );
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      userService.validateUser.mockResolvedValue(unverifiedUser as User);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userService.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid.refresh.token',
    };

    it('should refresh tokens successfully', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      const userWithToken = { ...mockUser, refreshTokens: [refreshTokenDto.refreshToken] };

      jwtService.verify.mockReturnValue(payload);
      userService.findById.mockResolvedValue(userWithToken as User);
      userRepository.removeRefreshToken.mockResolvedValue(userWithToken as User);
      jwtService.sign.mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');
      userRepository.addRefreshToken.mockResolvedValue(userWithToken as User);

      const result = await service.refreshToken(refreshTokenDto);

      expect(jwtService.verify).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
        { secret: 'test-secret' },
      );
      expect(userService.findById).toHaveBeenCalledWith('123');
      expect(userRepository.removeRefreshToken).toHaveBeenCalledWith(
        '123',
        refreshTokenDto.refreshToken,
      );
      expect(result).toMatchObject({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token not in user tokens', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      const userWithoutToken = { ...mockUser, refreshTokens: [] };

      jwtService.verify.mockReturnValue(payload);
      userService.findById.mockResolvedValue(userWithoutToken as User);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user and remove specific refresh token', async () => {
      await service.logout('123', 'refresh.token');

      expect(userRepository.removeRefreshToken).toHaveBeenCalledWith('123', 'refresh.token');
      expect(eventEmitter.emit).toHaveBeenCalledWith(UserEvents.LOGOUT, { userId: '123' });
    });

    it('should logout user and remove all refresh tokens', async () => {
      await service.logout('123');

      expect(userRepository.removeAllRefreshTokens).toHaveBeenCalledWith('123');
      expect(eventEmitter.emit).toHaveBeenCalledWith(UserEvents.LOGOUT, { userId: '123' });
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      jwtService.verify.mockReturnValue(payload);

      const result = await service.validateToken('valid.token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid.token', { secret: 'test-secret' });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getTokenExpiryInSeconds', () => {
    it('should calculate expiry correctly for different units', () => {
      const testCases = [
        { expiry: '30s', expected: 30 },
        { expiry: '15m', expected: 900 },
        { expiry: '2h', expected: 7200 },
        { expiry: '7d', expected: 604800 },
        { expiry: 'invalid', expected: 900 }, // default
      ];

      testCases.forEach(({ expiry, expected }) => {
        // Access private method through prototype
        const result = (service as any).getTokenExpiryInSeconds(expiry);
        expect(result).toBe(expected);
      });
    });
  });
});