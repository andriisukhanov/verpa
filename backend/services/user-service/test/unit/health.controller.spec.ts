import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../src/health/health.controller';
import {
  HealthCheckService,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let mongooseHealthIndicator: jest.Mocked<MongooseHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;
  let diskHealthIndicator: jest.Mocked<DiskHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: MongooseHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
            checkRSS: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    mongooseHealthIndicator = module.get(MongooseHealthIndicator);
    memoryHealthIndicator = module.get(MemoryHealthIndicator);
    diskHealthIndicator = module.get(DiskHealthIndicator);
  });

  describe('check', () => {
    it('should return health check results', async () => {
      const healthCheckResult = {
        status: 'ok',
        info: {
          mongodb: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          storage: { status: 'up' },
        },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(healthCheckResult as any);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(healthCheckResult);
    });

    it('should call all health indicators', async () => {
      mongooseHealthIndicator.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } } as any);
      memoryHealthIndicator.checkHeap.mockResolvedValue({ memory_heap: { status: 'up' } } as any);
      memoryHealthIndicator.checkRSS.mockResolvedValue({ memory_rss: { status: 'up' } } as any);
      diskHealthIndicator.checkStorage.mockResolvedValue({ storage: { status: 'up' } } as any);

      healthCheckService.check.mockImplementation(async (indicators) => {
        const results = await Promise.all(indicators.map((fn: any) => fn()));
        return {
          status: 'ok',
          info: Object.assign({}, ...results),
          error: {},
          details: {},
        } as any;
      });

      await controller.check();

      expect(mongooseHealthIndicator.pingCheck).toHaveBeenCalledWith('mongodb');
      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith('memory_heap', 150 * 1024 * 1024);
      expect(memoryHealthIndicator.checkRSS).toHaveBeenCalledWith('memory_rss', 150 * 1024 * 1024);
      expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith('storage', {
        path: '/',
        threshold: 250 * 1024 * 1024 * 1024,
      });
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();

      expect(result).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('readiness', () => {
    it('should check MongoDB readiness', async () => {
      const readinessResult = {
        status: 'ok',
        info: { mongodb: { status: 'up' } },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(readinessResult as any);
      mongooseHealthIndicator.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } } as any);

      const result = await controller.readiness();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(readinessResult);
    });

    it('should return error status when MongoDB is down', async () => {
      const errorResult = {
        status: 'error',
        info: {},
        error: { mongodb: { status: 'down' } },
        details: { mongodb: { status: 'down' } },
      };

      healthCheckService.check.mockResolvedValue(errorResult as any);

      const result = await controller.readiness();

      expect(result.status).toBe('error');
    });
  });
});