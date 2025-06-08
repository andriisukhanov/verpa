import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CacheService } from '../cache/cache.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface ServiceInfo {
  name: string;
  url: string;
  healthEndpoint?: string;
  version?: string;
  isHealthy?: boolean;
  lastHealthCheck?: Date;
  healthCheckInterval?: number; // in seconds
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  timestamp: Date;
  responseTime?: number;
}

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly services: Map<string, ServiceInfo> = new Map();
  private readonly cacheTTL = 60; // 1 minute
  private readonly healthCheckTimeout = 5000; // 5 seconds
  private readonly defaultHealthCheckInterval = 30; // 30 seconds
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly httpService: HttpService,
  ) {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices() {
    // Initialize with static configuration
    const services = {
      userService: {
        name: 'user-service',
        url: this.configService.get<string>('services.userService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
      aquariumService: {
        name: 'aquarium-service',
        url: this.configService.get<string>('services.aquariumService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
      eventService: {
        name: 'event-service',
        url: this.configService.get<string>('services.eventService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
      notificationService: {
        name: 'notification-service',
        url: this.configService.get<string>('services.notificationService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
      mediaService: {
        name: 'media-service',
        url: this.configService.get<string>('services.mediaService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
      analyticsService: {
        name: 'analytics-service',
        url: this.configService.get<string>('services.analyticsService'),
        healthEndpoint: '/health',
        healthCheckInterval: 30,
      },
    };

    Object.entries(services).forEach(([key, service]) => {
      if (service.url) {
        this.services.set(service.name, {
          ...service,
          isHealthy: false,
          lastHealthCheck: undefined,
        } as ServiceInfo);
      }
    });
  }

  async getServiceUrl(serviceName: string): Promise<string> {
    // Try to get from cache first
    const cacheKey = `service:${serviceName}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from static configuration
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    // In production, this would query a service registry like Consul
    // For now, we use static configuration
    await this.cacheService.set(cacheKey, service.url, { ttl: this.cacheTTL });
    return service.url;
  }

  async getHealthyServiceUrl(serviceName: string): Promise<string> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    // Check if we have a recent health check
    const now = new Date();
    const healthCheckAge = service.lastHealthCheck
      ? (now.getTime() - service.lastHealthCheck.getTime()) / 1000
      : Infinity;

    // If health check is stale, perform a new one
    if (healthCheckAge > (service.healthCheckInterval || this.defaultHealthCheckInterval)) {
      await this.checkServiceHealth(serviceName);
    }

    // Get the updated service info
    const updatedService = this.services.get(serviceName);
    if (!updatedService || !updatedService.isHealthy) {
      throw new Error(`Service '${serviceName}' is not healthy`);
    }

    return updatedService.url;
  }

  async getAllServices(): Promise<ServiceInfo[]> {
    return Array.from(this.services.values());
  }

  async refreshServiceCache(serviceName: string): Promise<void> {
    const cacheKey = `service:${serviceName}`;
    await this.cacheService.del(cacheKey);
  }

  // For dynamic service registration (future implementation)
  async registerService(service: ServiceInfo): Promise<void> {
    this.services.set(service.name, service);
    this.logger.log(`Service '${service.name}' registered at ${service.url}`);
  }

  async unregisterService(serviceName: string): Promise<void> {
    this.services.delete(serviceName);
    await this.refreshServiceCache(serviceName);
    this.stopHealthCheck(serviceName);
    this.logger.log(`Service '${serviceName}' unregistered`);
  }

  private async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    const service = this.services.get(serviceName);
    if (!service) {
      return {
        status: 'unknown',
        message: 'Service not found',
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();
    try {
      const healthUrl = `${service.url}${service.healthEndpoint || '/health'}`;
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          timeout: this.healthCheckTimeout,
          validateStatus: (status) => status < 500,
        }),
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;

      // Update service info
      this.services.set(serviceName, {
        ...service,
        isHealthy,
        lastHealthCheck: new Date(),
      });

      const result: HealthCheckResult = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: response.data?.message || response.statusText,
        timestamp: new Date(),
        responseTime,
      };

      if (!isHealthy) {
        this.logger.warn(
          `Service '${serviceName}' health check failed: ${response.status} ${response.statusText}`,
        );
      }

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      const responseTime = Date.now() - startTime;

      // Update service as unhealthy
      this.services.set(serviceName, {
        ...service,
        isHealthy: false,
        lastHealthCheck: new Date(),
      });

      const errorMessage = axiosError.code === 'ECONNREFUSED'
        ? 'Connection refused'
        : axiosError.code === 'ETIMEDOUT'
        ? 'Health check timeout'
        : axiosError.message || 'Unknown error';

      this.logger.error(
        `Service '${serviceName}' health check error: ${errorMessage}`,
      );

      return {
        status: 'unhealthy',
        message: errorMessage,
        timestamp: new Date(),
        responseTime,
      };
    }
  }

  private startHealthChecks(): void {
    // Start periodic health checks for all services
    this.services.forEach((service, serviceName) => {
      if (service.healthEndpoint) {
        this.startHealthCheck(serviceName);
      }
    });
  }

  private startHealthCheck(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    // Clear existing interval if any
    this.stopHealthCheck(serviceName);

    // Perform initial health check
    this.checkServiceHealth(serviceName).catch((error) => {
      this.logger.error(`Initial health check failed for ${serviceName}:`, error);
    });

    // Set up periodic health checks
    const intervalMs = (service.healthCheckInterval || this.defaultHealthCheckInterval) * 1000;
    const interval = setInterval(async () => {
      await this.checkServiceHealth(serviceName);
    }, intervalMs);

    this.healthCheckIntervals.set(serviceName, interval);
  }

  private stopHealthCheck(serviceName: string): void {
    const interval = this.healthCheckIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);
    }
  }

  async getServiceHealthStatus(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    
    for (const [serviceName, service] of this.services.entries()) {
      if (service.lastHealthCheck) {
        results[serviceName] = {
          status: service.isHealthy ? 'healthy' : 'unhealthy',
          timestamp: service.lastHealthCheck,
        };
      } else {
        results[serviceName] = {
          status: 'unknown',
          message: 'No health check performed yet',
          timestamp: new Date(),
        };
      }
    }

    return results;
  }

  onModuleDestroy(): void {
    // Clean up all health check intervals
    this.healthCheckIntervals.forEach((interval) => clearInterval(interval));
    this.healthCheckIntervals.clear();
  }
}