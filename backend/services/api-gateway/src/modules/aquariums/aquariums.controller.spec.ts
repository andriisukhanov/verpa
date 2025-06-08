import { Test, TestingModule } from '@nestjs/testing';
import { AquariumsController } from './aquariums.controller';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

describe('AquariumsController', () => {
  let controller: AquariumsController;
  let proxyService: ProxyService;
  let cacheService: CacheService;

  const mockProxyService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheService = {
    remember: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AquariumsController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<AquariumsController>(AquariumsController);
    proxyService = module.get<ProxyService>(ProxyService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should get aquariums with caching', async () => {
      const query = { page: 1, limit: 10, waterType: 'freshwater' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: 'user123',
        },
      };
      const expectedResult = {
        aquariums: [{ id: '1', name: 'My Tank' }],
        total: 1,
      };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query, req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'aquariums:user123:{"page":1,"limit":10,"waterType":"freshwater"}',
        expect.any(Function),
        { ttl: 300 }
      );
      expect(proxyService.get).toHaveBeenCalledWith(
        'aquarium-service',
        '/aquariums',
        {
          params: query,
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('create', () => {
    it('should create aquarium and invalidate cache', async () => {
      const createDto = {
        name: 'New Tank',
        waterType: 'freshwater',
        volume: 100,
      };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: 'user123',
        },
      };
      const expectedResult = { id: '1', ...createDto };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto, req);

      expect(proxyService.post).toHaveBeenCalledWith(
        'aquarium-service',
        '/aquariums',
        createDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('aquariums:user123:*');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getStats', () => {
    it('should get aquarium stats with caching', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: 'user123',
        },
      };
      const expectedResult = {
        totalAquariums: 3,
        totalVolume: 500,
        byWaterType: {
          freshwater: 2,
          saltwater: 1,
        },
      };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.getStats(req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'aquarium:stats:user123',
        expect.any(Function),
        { ttl: 600 }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should get aquarium by ID with caching', async () => {
      const id = 'aqua123';
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = {
        id: 'aqua123',
        name: 'My Tank',
        waterType: 'freshwater',
      };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.findById(id, req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'aquarium:aqua123',
        expect.any(Function),
        { ttl: 300 }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update aquarium and invalidate caches', async () => {
      const id = 'aqua123';
      const updateDto = { name: 'Updated Tank' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: 'user123',
        },
      };
      const expectedResult = { id: 'aqua123', name: 'Updated Tank' };
      mockProxyService.put.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto, req);

      expect(proxyService.put).toHaveBeenCalledWith(
        'aquarium-service',
        '/aquariums/aqua123',
        updateDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('aquarium:aqua123');
      expect(cacheService.del).toHaveBeenCalledWith('aquariums:user123:*');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should delete aquarium and invalidate caches', async () => {
      const id = 'aqua123';
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: 'user123',
        },
      };
      mockProxyService.delete.mockResolvedValue(undefined);

      await controller.delete(id, req);

      expect(proxyService.delete).toHaveBeenCalledWith(
        'aquarium-service',
        '/aquariums/aqua123',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('aquarium:aqua123');
      expect(cacheService.del).toHaveBeenCalledWith('aquariums:user123:*');
    });
  });

  describe('uploadImage', () => {
    it('should upload image and invalidate cache', async () => {
      const id = 'aqua123';
      const file = {
        buffer: Buffer.from('image data'),
        originalname: 'tank.jpg',
        mimetype: 'image/jpeg',
      };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { imageUrl: 'https://example.com/tank.jpg' };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.uploadImage(id, file, req);

      expect(proxyService.post).toHaveBeenCalledWith(
        'aquarium-service',
        '/aquariums/aqua123/image',
        expect.any(FormData),
        {
          headers: {
            authorization: 'Bearer token123',
            'content-type': 'multipart/form-data',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('aquarium:aqua123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('equipment operations', () => {
    describe('getEquipment', () => {
      it('should get equipment with caching', async () => {
        const id = 'aqua123';
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = [
          { id: 'eq1', name: 'Filter', type: 'filter' },
          { id: 'eq2', name: 'Heater', type: 'heater' },
        ];

        mockCacheService.remember.mockImplementation((_key, factory) => factory());
        mockProxyService.get.mockResolvedValue(expectedResult);

        const result = await controller.getEquipment(id, req);

        expect(cacheService.remember).toHaveBeenCalledWith(
          'aquarium:aqua123:equipment',
          expect.any(Function),
          { ttl: 300 }
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('addEquipment', () => {
      it('should add equipment and invalidate cache', async () => {
        const id = 'aqua123';
        const addEquipmentDto = {
          name: 'CO2 System',
          type: 'co2',
          brand: 'AquaBrand',
        };
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = { id: 'eq3', ...addEquipmentDto };
        mockProxyService.post.mockResolvedValue(expectedResult);

        const result = await controller.addEquipment(id, addEquipmentDto, req);

        expect(proxyService.post).toHaveBeenCalledWith(
          'aquarium-service',
          '/aquariums/aqua123/equipment',
          addEquipmentDto,
          {
            headers: {
              authorization: 'Bearer token123',
            },
          }
        );
        expect(cacheService.del).toHaveBeenCalledWith('aquarium:aqua123:equipment');
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('inhabitants operations', () => {
    describe('getInhabitants', () => {
      it('should get inhabitants with caching', async () => {
        const id = 'aqua123';
        const query = { type: 'fish' };
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = [
          { id: 'inh1', name: 'Neon Tetra', type: 'fish', quantity: 10 },
        ];

        mockCacheService.remember.mockImplementation((_key, factory) => factory());
        mockProxyService.get.mockResolvedValue(expectedResult);

        const result = await controller.getInhabitants(id, query, req);

        expect(cacheService.remember).toHaveBeenCalledWith(
          'aquarium:aqua123:inhabitants:{"type":"fish"}',
          expect.any(Function),
          { ttl: 300 }
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('addInhabitant', () => {
      it('should add inhabitant and invalidate cache', async () => {
        const id = 'aqua123';
        const addInhabitantDto = {
          name: 'Betta',
          type: 'fish',
          species: 'Betta splendens',
          quantity: 1,
        };
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = { id: 'inh2', ...addInhabitantDto };
        mockProxyService.post.mockResolvedValue(expectedResult);

        const result = await controller.addInhabitant(id, addInhabitantDto, req);

        expect(proxyService.post).toHaveBeenCalledWith(
          'aquarium-service',
          '/aquariums/aqua123/inhabitants',
          addInhabitantDto,
          {
            headers: {
              authorization: 'Bearer token123',
            },
          }
        );
        expect(cacheService.del).toHaveBeenCalledWith('aquarium:aqua123:inhabitants:*');
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('water parameters', () => {
    describe('getParameters', () => {
      it('should get water parameters', async () => {
        const id = 'aqua123';
        const query = { from: '2024-01-01', to: '2024-01-31' };
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = [
          {
            id: 'param1',
            temperature: 25,
            ph: 7.2,
            recordedAt: '2024-01-15T10:00:00Z',
          },
        ];
        mockProxyService.get.mockResolvedValue(expectedResult);

        const result = await controller.getParameters(id, query, req);

        expect(proxyService.get).toHaveBeenCalledWith(
          'aquarium-service',
          '/aquariums/aqua123/parameters',
          {
            params: query,
            headers: {
              authorization: 'Bearer token123',
            },
          }
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('recordParameters', () => {
      it('should record water parameters', async () => {
        const id = 'aqua123';
        const parametersDto = {
          temperature: 26,
          ph: 7.0,
          ammonia: 0,
          nitrite: 0,
          nitrate: 20,
        };
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = { id: 'param2', ...parametersDto };
        mockProxyService.post.mockResolvedValue(expectedResult);

        const result = await controller.recordParameters(id, parametersDto, req);

        expect(proxyService.post).toHaveBeenCalledWith(
          'aquarium-service',
          '/aquariums/aqua123/parameters',
          parametersDto,
          {
            headers: {
              authorization: 'Bearer token123',
            },
          }
        );
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getLatestParameters', () => {
      it('should get latest parameters with caching', async () => {
        const id = 'aqua123';
        const req = {
          headers: {
            authorization: 'Bearer token123',
          },
        };
        const expectedResult = {
          temperature: 25,
          ph: 7.2,
          recordedAt: '2024-01-20T10:00:00Z',
        };

        mockCacheService.remember.mockImplementation((_key, factory) => factory());
        mockProxyService.get.mockResolvedValue(expectedResult);

        const result = await controller.getLatestParameters(id, req);

        expect(cacheService.remember).toHaveBeenCalledWith(
          'aquarium:aqua123:parameters:latest',
          expect.any(Function),
          { ttl: 60 }
        );
        expect(result).toEqual(expectedResult);
      });
    });
  });
});