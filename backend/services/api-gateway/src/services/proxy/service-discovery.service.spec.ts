import { Test, TestingModule } from '@nestjs/testing';
import { ServiceDiscoveryService } from './service-discovery.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

describe('ServiceDiscoveryService', () => {
  let service: ServiceDiscoveryService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: any = {
        'services.userService': 'http://user-service:3000',
        'services.aquariumService': 'http://aquarium-service:3001',
        'services.eventService': 'http://event-service:3002',
        'services.notificationService': 'http://notification-service:3003',
        'services.analyticsService': 'http://analytics-service:3004',
      };
      return config[key];
    }),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceDiscoveryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ServiceDiscoveryService>(ServiceDiscoveryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceUrl', () => {
    it('should return cached URL if available', async () => {
      mockCacheService.get.mockResolvedValue('http://cached-url:3000');

      const url = await service.getServiceUrl('user-service');

      expect(url).toBe('http://cached-url:3000');
      expect(mockCacheService.get).toHaveBeenCalledWith('service:user-service');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should return URL from config and cache it', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const url = await service.getServiceUrl('user-service');

      expect(url).toBe('http://user-service:3000');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'service:user-service',
        'http://user-service:3000',
        { ttl: 60 }
      );
    });

    it('should throw error for unknown service', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.getServiceUrl('unknown-service'))
        .rejects.toThrow("Service 'unknown-service' not found");
    });
  });

  describe('getHealthyServiceUrl', () => {
    it('should return service URL', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const url = await service.getHealthyServiceUrl('user-service');

      expect(url).toBe('http://user-service:3000');
    });
  });

  describe('getAllServices', () => {
    it('should return all registered services', async () => {
      const services = await service.getAllServices();

      expect(services).toHaveLength(5);
      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'user-service',
            url: 'http://user-service:3000',
            healthEndpoint: '/health',
          }),
          expect.objectContaining({
            name: 'aquarium-service',
            url: 'http://aquarium-service:3001',
            healthEndpoint: '/health',
          }),
        ])
      );
    });
  });

  describe('refreshServiceCache', () => {
    it('should delete service cache', async () => {
      await service.refreshServiceCache('user-service');

      expect(mockCacheService.del).toHaveBeenCalledWith('service:user-service');
    });
  });

  describe('registerService', () => {
    it('should register new service', async () => {
      const newService = {
        name: 'new-service',
        url: 'http://new-service:3005',
        healthEndpoint: '/health',
      };

      await service.registerService(newService);

      const url = await service.getServiceUrl('new-service');
      expect(url).toBe('http://new-service:3005');
    });
  });

  describe('unregisterService', () => {
    it('should unregister service and clear cache', async () => {
      await service.unregisterService('user-service');

      expect(mockCacheService.del).toHaveBeenCalledWith('service:user-service');
      
      mockCacheService.get.mockResolvedValue(null);
      await expect(service.getServiceUrl('user-service'))
        .rejects.toThrow("Service 'user-service' not found");
    });
  });
});