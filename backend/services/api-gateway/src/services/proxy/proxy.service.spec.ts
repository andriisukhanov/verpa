import { Test, TestingModule } from '@nestjs/testing';
import { ProxyService } from './proxy.service';
import { ServiceDiscoveryService } from './service-discovery.service';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('ProxyService', () => {
  let service: ProxyService;
  let serviceDiscovery: ServiceDiscoveryService;
  let httpService: HttpService;

  const mockServiceDiscovery = {
    getServiceUrl: jest.fn(),
    getHealthyServiceUrl: jest.fn(),
  };

  const mockHttpService = {
    request: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ServiceDiscoveryService,
          useValue: mockServiceDiscovery,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    serviceDiscovery = module.get<ServiceDiscoveryService>(ServiceDiscoveryService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forward', () => {
    const mockOptions = {
      service: 'user-service',
      path: '/users',
      method: 'GET' as any,
    };

    const mockResponse: AxiosResponse = {
      data: { users: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should forward request successfully', async () => {
      mockServiceDiscovery.getServiceUrl.mockResolvedValue('http://user-service:3000');
      mockHttpService.request.mockReturnValue(of(mockResponse));

      const result = await service.forward(mockOptions);

      expect(serviceDiscovery.getServiceUrl).toHaveBeenCalledWith('user-service');
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'http://user-service:3000/users',
        headers: {},
      });
      expect(result).toEqual({ users: [] });
    });

    it('should handle circuit breaker open state', async () => {
      // Simulate multiple failures to open circuit
      mockServiceDiscovery.getServiceUrl.mockResolvedValue('http://user-service:3000');
      const error = new Error('Connection failed');
      mockHttpService.request.mockReturnValue(throwError(() => error));

      // Try multiple times to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.forward(mockOptions);
        } catch (e) {
          // Expected to fail
        }
      }

      // Next call should fail with circuit open
      await expect(service.forward(mockOptions)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle service discovery failure', async () => {
      mockServiceDiscovery.getServiceUrl.mockRejectedValue(new Error('Service not found'));

      await expect(service.forward(mockOptions)).rejects.toThrow(BadGatewayException);
    });

    it('should handle HTTP errors', async () => {
      mockServiceDiscovery.getServiceUrl.mockResolvedValue('http://user-service:3000');
      const axiosError: Partial<AxiosError> = {
        response: {
          data: { error: 'Not found' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
      };
      mockHttpService.request.mockReturnValue(throwError(() => axiosError));

      const result = await service.forward(mockOptions);
      expect(result).toEqual({ error: 'Not found' });
    });
  });

  describe('HTTP method helpers', () => {
    beforeEach(() => {
      mockServiceDiscovery.getServiceUrl.mockResolvedValue('http://user-service:3000');
      mockHttpService.request.mockReturnValue(of({ data: { success: true } } as AxiosResponse));
    });

    it('should make GET request', async () => {
      await service.get('user-service', '/users', { params: { page: 1 } });

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'http://user-service:3000/users',
        headers: {},
        params: { page: 1 },
      });
    });

    it('should make POST request', async () => {
      const data = { name: 'Test' };
      await service.post('user-service', '/users', data);

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'http://user-service:3000/users',
        headers: {},
        data,
      });
    });

    it('should make PUT request', async () => {
      const data = { name: 'Updated' };
      await service.put('user-service', '/users/1', data);

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: 'http://user-service:3000/users/1',
        headers: {},
        data,
      });
    });

    it('should make PATCH request', async () => {
      const data = { status: 'active' };
      await service.patch('user-service', '/users/1', data);

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: 'http://user-service:3000/users/1',
        headers: {},
        data,
      });
    });

    it('should make DELETE request', async () => {
      await service.delete('user-service', '/users/1');

      expect(httpService.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: 'http://user-service:3000/users/1',
        headers: {},
      });
    });
  });

  describe('Circuit breaker', () => {
    it('should track failures per service', async () => {
      mockServiceDiscovery.getServiceUrl.mockImplementation((serviceName) => 
        Promise.resolve(`http://${serviceName}:3000`)
      );
      
      const error = new Error('Connection failed');
      mockHttpService.request.mockReturnValue(throwError(() => error));

      // Fail requests for user-service
      for (let i = 0; i < 3; i++) {
        try {
          await service.forward({ service: 'user-service', path: '/', method: 'GET' });
        } catch (e) {
          // Expected
        }
      }

      // Other service should still work
      mockHttpService.request.mockReturnValue(of({ data: { ok: true } } as AxiosResponse));
      const result = await service.forward({ service: 'other-service', path: '/', method: 'GET' });
      expect(result).toEqual({ ok: true });
    });

    it('should reset circuit after timeout', async () => {
      jest.useFakeTimers();
      
      mockServiceDiscovery.getServiceUrl.mockResolvedValue('http://user-service:3000');
      const error = new Error('Connection failed');
      mockHttpService.request.mockReturnValue(throwError(() => error));

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.forward({ service: 'user-service', path: '/', method: 'GET' });
        } catch (e) {
          // Expected
        }
      }

      // Should be in open state
      await expect(service.forward({ service: 'user-service', path: '/', method: 'GET' }))
        .rejects.toThrow(ServiceUnavailableException);

      // Advance time past reset timeout
      jest.advanceTimersByTime(60000);

      // Should allow retry (half-open state)
      mockHttpService.request.mockReturnValue(of({ data: { ok: true } } as AxiosResponse));
      const result = await service.forward({ service: 'user-service', path: '/', method: 'GET' });
      expect(result).toEqual({ ok: true });

      jest.useRealTimers();
    });
  });
});