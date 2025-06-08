import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

describe('UsersController', () => {
  let controller: UsersController;
  let proxyService: ProxyService;
  let cacheService: CacheService;

  const mockProxyService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheService = {
    remember: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
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

    controller = module.get<UsersController>(UsersController);
    proxyService = module.get<ProxyService>(ProxyService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should get users with caching', async () => {
      const query = { page: 1, limit: 10 };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = {
        users: [{ id: '1', name: 'User 1' }],
        total: 1,
      };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query, req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'users:{"page":1,"limit":10}',
        expect.any(Function),
        { ttl: 60 }
      );
      expect(proxyService.get).toHaveBeenCalledWith(
        'user-service',
        '/users',
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

  describe('getProfile', () => {
    it('should get current user profile', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', email: 'test@example.com' };
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.getProfile(req);

      expect(proxyService.get).toHaveBeenCalledWith(
        'user-service',
        '/users/me',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and invalidate cache', async () => {
      const updateDto = { name: 'Updated Name' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
        user: {
          sub: '123',
        },
      };
      const expectedResult = { id: '123', name: 'Updated Name' };
      mockProxyService.put.mockResolvedValue(expectedResult);

      const result = await controller.updateProfile(updateDto, req);

      expect(proxyService.put).toHaveBeenCalledWith(
        'user-service',
        '/users/me',
        updateDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('changePassword', () => {
    it('should proxy change password request', async () => {
      const changePasswordDto = {
        currentPassword: 'old123',
        newPassword: 'new123',
      };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      mockProxyService.post.mockResolvedValue(undefined);

      await controller.changePassword(changePasswordDto, req);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/users/me/change-password',
        changePasswordDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
    });
  });

  describe('getStats', () => {
    it('should get user stats with caching', async () => {
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = {
        totalAquariums: 5,
        totalEvents: 20,
      };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.getStats(req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'user:stats',
        expect.any(Function),
        { ttl: 300 }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should get user by ID with caching', async () => {
      const id = '123';
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', name: 'Test User' };

      mockCacheService.remember.mockImplementation((_key, factory) => factory());
      mockProxyService.get.mockResolvedValue(expectedResult);

      const result = await controller.findById(id, req);

      expect(cacheService.remember).toHaveBeenCalledWith(
        'user:123',
        expect.any(Function),
        { ttl: 300 }
      );
      expect(proxyService.get).toHaveBeenCalledWith(
        'user-service',
        '/users/123',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update user and invalidate cache', async () => {
      const id = '123';
      const updateDto = { name: 'Updated User' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', name: 'Updated User' };
      mockProxyService.put.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto, req);

      expect(proxyService.put).toHaveBeenCalledWith(
        'user-service',
        '/users/123',
        updateDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateRole', () => {
    it('should update user role and invalidate cache', async () => {
      const id = '123';
      const updateRoleDto = { role: 'admin' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', role: 'admin' };
      mockProxyService.patch.mockResolvedValue(expectedResult);

      const result = await controller.updateRole(id, updateRoleDto, req);

      expect(proxyService.patch).toHaveBeenCalledWith(
        'user-service',
        '/users/123/role',
        updateRoleDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateSubscription', () => {
    it('should update user subscription and invalidate cache', async () => {
      const id = '123';
      const updateSubscriptionDto = { type: 'premium' };
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', subscriptionType: 'premium' };
      mockProxyService.patch.mockResolvedValue(expectedResult);

      const result = await controller.updateSubscription(id, updateSubscriptionDto, req);

      expect(proxyService.patch).toHaveBeenCalledWith(
        'user-service',
        '/users/123/subscription',
        updateSubscriptionDto,
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should delete user and invalidate cache', async () => {
      const id = '123';
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      mockProxyService.delete.mockResolvedValue(undefined);

      await controller.delete(id, req);

      expect(proxyService.delete).toHaveBeenCalledWith(
        'user-service',
        '/users/123',
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
    });
  });

  describe('restore', () => {
    it('should restore user and invalidate cache', async () => {
      const id = '123';
      const req = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const expectedResult = { id: '123', deletedAt: null };
      mockProxyService.post.mockResolvedValue(expectedResult);

      const result = await controller.restore(id, req);

      expect(proxyService.post).toHaveBeenCalledWith(
        'user-service',
        '/users/123/restore',
        {},
        {
          headers: {
            authorization: 'Bearer token123',
          },
        }
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(expectedResult);
    });
  });
});