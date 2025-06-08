import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { ProxyService } from '../../services/proxy/proxy.service';

describe('AuthController', () => {
  let controller: AuthController;
  let proxyService: ProxyService;

  const mockProxyService = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    proxyService = module.get<ProxyService>(ProxyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should proxy register request', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      const expectedResult = { id: '123', email: 'test@example.com' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/register',
        registerDto
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should proxy login request with headers', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const expectedResult = { accessToken: 'token123' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, ip, userAgent);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/login',
        loginDto,
        {
          headers: {
            'x-forwarded-for': ip,
            'user-agent': userAgent,
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should proxy refresh token request', async () => {
      const refreshDto = { refreshToken: 'refresh123' };
      const expectedResult = { accessToken: 'newtoken123' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/refresh',
        refreshDto
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should proxy logout request with auth header', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const body = { refreshToken: 'refresh123' };
      mockProxyService.post.mockResolvedValue(undefined);

      await controller.logout(req, body);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/logout',
        body,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
    });
  });

  describe('forgotPassword', () => {
    it('should proxy forgot password request', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };
      mockProxyService.post.mockResolvedValue(undefined);

      await controller.forgotPassword(forgotPasswordDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/forgot-password',
        forgotPasswordDto
      );
    });
  });

  describe('resetPassword', () => {
    it('should proxy reset password request', async () => {
      const resetPasswordDto = {
        token: 'reset123',
        password: 'newpassword123',
      };
      mockProxyService.post.mockResolvedValue(undefined);

      await controller.resetPassword(resetPasswordDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/reset-password',
        resetPasswordDto
      );
    });
  });

  describe('verifyEmail', () => {
    it('should proxy verify email request', async () => {
      const verifyEmailDto = { token: 'verify123' };
      const expectedResult = { message: 'Email verified' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/verify-email',
        verifyEmailDto
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCurrentUser', () => {
    it('should proxy get current user request', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', email: 'test@example.com' };
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.getCurrentUser(req);

      expect(proxyService.get).toHaveBeenCalledWith(
        'user-service',
        '/auth/me',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('OAuth endpoints', () => {
    it('should return Google OAuth redirect URL', async () => {
      process.env.USER_SERVICE_URL = 'http://user-service:3000';
      
      const result = await controller.googleAuth();
      
      expect(result).toEqual({
        redirectUrl: 'http://user-service:3000/auth/google',
      });
    });

    it('should return Apple OAuth redirect URL', async () => {
      process.env.USER_SERVICE_URL = 'http://user-service:3000';
      
      const result = await controller.appleAuth();
      
      expect(result).toEqual({
        redirectUrl: 'http://user-service:3000/auth/apple',
      });
    });

    it('should return Facebook OAuth redirect URL', async () => {
      process.env.USER_SERVICE_URL = 'http://user-service:3000';
      
      const result = await controller.facebookAuth();
      
      expect(result).toEqual({
        redirectUrl: 'http://user-service:3000/auth/facebook',
      });
    });
  });

  describe('getLinkedProviders', () => {
    it('should proxy get linked providers request', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = [
        { provider: 'google', linked: true },
        { provider: 'apple', linked: false },
      ];
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.getLinkedProviders(req);

      expect(proxyService.get).toHaveBeenCalledWith(
        'user-service',
        '/auth/providers',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('linkProvider', () => {
    it('should proxy link provider request', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const provider = 'google';
      const expectedResult = { message: 'Provider linked' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.linkProvider(provider, req);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/auth/link/google',
        {},
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('unlinkProvider', () => {
    it('should proxy unlink provider request', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const provider = 'google';
      mockProxyService.delete.mockResolvedValue(undefined);

      await controller.unlinkProvider(provider, req);

      expect(proxyService.delete).toHaveBeenCalledWith(
        'user-service',
        '/auth/link/google',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
    });
  });
});