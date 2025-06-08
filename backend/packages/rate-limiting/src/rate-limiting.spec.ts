import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitingModule } from './rate-limiting.module';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitStrategy } from './interfaces/rate-limit.interface';
import { RATE_LIMIT_OPTIONS } from './utils/rate-limit.constants';

describe('RateLimiting', () => {
  let module: TestingModule;
  let rateLimitService: RateLimitService;
  let rateLimitGuard: RateLimitGuard;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        RateLimitingModule.forRoot({
          strategy: RateLimitStrategy.FIXED_WINDOW,
          storage: 'memory',
          defaultLimits: {
            anonymous: {
              name: 'anonymous',
              limits: {
                perMinute: 10,
              },
            },
            authenticated: {
              name: 'authenticated',
              limits: {
                perMinute: 20,
              },
            },
          },
        }),
      ],
    }).compile();

    rateLimitService = module.get<RateLimitService>(RateLimitService);
    rateLimitGuard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('RateLimitService', () => {
    it('should be defined', () => {
      expect(rateLimitService).toBeDefined();
    });

    it('should allow requests within limit', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        method: 'GET',
        path: '/test',
        headers: {},
      };

      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.checkLimit(mockRequest as any);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('should block requests exceeding limit', async () => {
      const mockRequest = {
        ip: '127.0.0.2',
        method: 'GET',
        path: '/test',
        headers: {},
      };

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(mockRequest as any);
      }

      // Next request should be blocked
      const result = await rateLimitService.checkLimit(mockRequest as any);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should apply different limits for authenticated users', async () => {
      const mockRequest = {
        ip: '127.0.0.3',
        method: 'GET',
        path: '/test',
        headers: {},
        user: { id: 'user-123' },
      };

      // Authenticated users get 20 requests per minute
      for (let i = 0; i < 15; i++) {
        const result = await rateLimitService.checkLimit(mockRequest as any);
        expect(result.allowed).toBe(true);
      }
    });

    it('should reset limits after duration', async () => {
      jest.useFakeTimers();

      const mockRequest = {
        ip: '127.0.0.4',
        method: 'GET',
        path: '/test',
        headers: {},
      };

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(mockRequest as any);
      }

      // Should be blocked
      let result = await rateLimitService.checkLimit(mockRequest as any);
      expect(result.allowed).toBe(false);

      // Fast forward 61 seconds
      jest.advanceTimersByTime(61000);

      // Should be allowed again
      result = await rateLimitService.checkLimit(mockRequest as any);
      expect(result.allowed).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('RateLimitGuard', () => {
    it('should allow requests within limit', async () => {
      const mockExecutionContext = createMockExecutionContext({
        ip: '127.0.0.5',
        method: 'GET',
        path: '/test',
      });

      const result = await rateLimitGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should throw HttpException when limit exceeded', async () => {
      const mockExecutionContext = createMockExecutionContext({
        ip: '127.0.0.6',
        method: 'GET',
        path: '/test',
      });

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await rateLimitGuard.canActivate(mockExecutionContext);
      }

      // Next request should throw
      await expect(rateLimitGuard.canActivate(mockExecutionContext))
        .rejects
        .toThrow(HttpException);
    });

    it('should set rate limit headers', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockExecutionContext = createMockExecutionContext({
        ip: '127.0.0.7',
        method: 'GET',
        path: '/test',
      }, mockResponse);

      await rateLimitGuard.canActivate(mockExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should respect decorator configuration', async () => {
      const reflector = module.get<Reflector>(Reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        points: 5,
        duration: 60,
      });

      const mockExecutionContext = createMockExecutionContext({
        ip: '127.0.0.8',
        method: 'GET',
        path: '/test',
      });

      // Should only allow 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitGuard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
      }

      // 6th request should fail
      await expect(rateLimitGuard.canActivate(mockExecutionContext))
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('Strategies', () => {
    it('should support different strategies', async () => {
      const strategies = [
        RateLimitStrategy.FIXED_WINDOW,
        RateLimitStrategy.SLIDING_WINDOW,
        RateLimitStrategy.TOKEN_BUCKET,
        RateLimitStrategy.LEAKY_BUCKET,
      ];

      for (const strategy of strategies) {
        const testModule = await Test.createTestingModule({
          imports: [
            RateLimitingModule.forRoot({
              strategy,
              storage: 'memory',
              defaultLimits: {
                anonymous: {
                  name: 'anonymous',
                  limits: { perMinute: 10 },
                },
              },
            }),
          ],
        }).compile();

        const service = testModule.get<RateLimitService>(RateLimitService);
        expect(service).toBeDefined();

        await testModule.close();
      }
    });
  });

  describe('User Tiers', () => {
    it('should apply tier-based limits', async () => {
      // Test different user tiers
      const tiers = [
        { tier: 'free', limit: 60 },
        { tier: 'basic', limit: 120 },
        { tier: 'premium', limit: 300 },
      ];

      for (const { tier, limit } of tiers) {
        await rateLimitService.setUserTier(`user-${tier}`, tier);

        const mockRequest = {
          ip: `127.0.0.${tier}`,
          method: 'GET',
          path: '/test',
          headers: {},
          user: { id: `user-${tier}`, subscription: { tier } },
        };

        // Should be able to make requests up to the tier limit
        const result = await rateLimitService.checkLimit(mockRequest as any);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBeGreaterThanOrEqual(limit);
      }
    });
  });

  describe('Blocking', () => {
    it('should block IP addresses', async () => {
      const ip = '192.168.1.100';
      await rateLimitService.blockIp(ip, 3600, 'Test block');

      const mockRequest = {
        ip,
        method: 'GET',
        path: '/test',
        headers: {},
      };

      const result = await rateLimitService.checkLimit(mockRequest as any);
      expect(result.allowed).toBe(false);
    });

    it('should block users', async () => {
      const userId = 'user-blocked';
      await rateLimitService.blockUser(userId, 3600, 'Test block');

      const mockRequest = {
        ip: '127.0.0.1',
        method: 'GET',
        path: '/test',
        headers: {},
        user: { id: userId },
      };

      const result = await rateLimitService.checkLimit(mockRequest as any);
      expect(result.allowed).toBe(false);
    });
  });
});

function createMockExecutionContext(request: any, response: any = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ...request,
        headers: request.headers || {},
        route: { path: request.path },
      }),
      getResponse: () => ({
        setHeader: jest.fn(),
        ...response,
      }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as any;
}