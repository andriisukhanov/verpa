import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  RedisHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServiceDiscoveryService } from '../../services/proxy/service-discovery.service';
import { SkipApiKey } from '../../common/decorators/skip-api-key.decorator';

@ApiTags('health')
@Controller('health')
@SkipApiKey()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private redis: RedisHealthIndicator,
    private serviceDiscovery: ServiceDiscoveryService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unhealthy' })
  async check() {
    return this.health.check([
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('services')
  @ApiOperation({ summary: 'Check health of all microservices' })
  @ApiResponse({ status: 200, description: 'Services health status' })
  async checkServices() {
    // Use our service discovery's built-in health checking
    const healthStatus = await this.serviceDiscovery.getServiceHealthStatus();
    
    // Convert to terminus format if needed for consistency
    const formattedStatus = {};
    for (const [serviceName, health] of Object.entries(healthStatus)) {
      formattedStatus[serviceName] = {
        status: health.status === 'healthy' ? 'up' : 'down',
        message: health.message || `Service is ${health.status}`,
        lastCheck: health.timestamp,
        responseTime: health.responseTime,
      };
    }
    
    return {
      status: Object.values(healthStatus).every(h => h.status === 'healthy') ? 'ok' : 'error',
      info: formattedStatus,
      error: {},
      details: formattedStatus,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get basic service metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  async metrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
      },
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external),
      },
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system')
  @ApiOperation({ summary: 'Get complete system health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status',
    schema: {
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        services: { type: 'object' },
        dependencies: { type: 'object' },
      },
    },
  })
  async checkSystemHealth() {
    // Check all services health
    const servicesHealth = await this.serviceDiscovery.getServiceHealthStatus();
    
    // Check Redis health
    let redisHealth;
    try {
      const redisCheck = await this.redis.isHealthy('redis');
      redisHealth = {
        status: 'healthy',
        message: 'Redis is responding',
      };
    } catch (error) {
      redisHealth = {
        status: 'unhealthy',
        message: `Redis connection failed: ${error.message}`,
      };
    }

    // Calculate overall system status
    const serviceStatuses = Object.values(servicesHealth);
    const healthyServices = serviceStatuses.filter(s => s.status === 'healthy').length;
    const totalServices = serviceStatuses.length;
    
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (redisHealth.status === 'unhealthy' || healthyServices === 0) {
      systemStatus = 'unhealthy';
    } else if (healthyServices < totalServices) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'healthy';
    }

    return {
      status: systemStatus,
      timestamp: new Date(),
      services: servicesHealth,
      dependencies: {
        redis: redisHealth,
      },
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}