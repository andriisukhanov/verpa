import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    on: jest.fn(),
    ping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              const config: any = {
                'redis.host': 'localhost',
                'redis.port': 6379,
                'cache.defaultTtl': 300,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    (Redis as any).mockImplementation(() => mockRedis);
    
    service = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const data = { id: 1, name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.get('test-key');

      expect(result).toBe('invalid-json');
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const data = { id: 1, name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', data, { ttl: 600 });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        600,
        JSON.stringify(data)
      );
    });

    it('should set value with default TTL', async () => {
      const data = { id: 1, name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', data);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify(data)
      );
    });

    it('should set value without TTL', async () => {
      const data = { id: 1, name: 'Test' };
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test-key', data, { ttl: 0 });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data)
      );
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });


    it('should delete keys by pattern', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['user:1', 'user:2']]);
      mockRedis.del.mockResolvedValue(2);

      await service.del('user:*');

      expect(mockRedis.scan).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2');
    });

    it('should handle pattern with no matches', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.del('nonexistent:*');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('remember', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const factory = jest.fn().mockResolvedValue({ id: 1, name: 'Fresh' });
      const result = await service.remember('test-key', factory);

      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not cached', async () => {
      const freshData = { id: 1, name: 'Fresh' };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue(freshData);
      const result = await service.remember('test-key', factory, { ttl: 600 });

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        600,
        JSON.stringify(freshData)
      );
    });

    it('should not cache null results', async () => {
      mockRedis.get.mockResolvedValue(null);

      const factory = jest.fn().mockResolvedValue(null);
      const result = await service.remember('test-key', factory);

      expect(result).toBeNull();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

});