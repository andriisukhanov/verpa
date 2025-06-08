import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ServiceHealthInfo } from './interfaces';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    return this.health.check([
      // Memory heap check
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      // Memory RSS check  
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      // Disk check
      () => this.disk.checkStorage('disk', {
        thresholdPercent: 0.9,
        path: '/',
      }),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    // This will be overridden by services to include their specific checks
    return this.check();
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service has started' })
  @ApiResponse({ status: 503, description: 'Service is still starting' })
  async startup() {
    const uptime = Date.now() - this.startTime;
    const minStartupTime = 5000; // 5 seconds

    if (uptime < minStartupTime) {
      return {
        status: 'starting',
        uptime: `${uptime}ms`,
        message: `Service needs ${minStartupTime - uptime}ms more to start`,
      };
    }

    return {
      status: 'started',
      uptime: `${uptime}ms`,
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get detailed service information' })
  @ApiResponse({ status: 200, description: 'Service information' })
  async info(): Promise<ServiceHealthInfo> {
    const serviceName = this.configService.get('SERVICE_NAME', 'unknown');
    const version = this.configService.get('SERVICE_VERSION', '1.0.0');
    const uptime = Date.now() - this.startTime;

    const healthCheck = await this.check();
    const status = healthCheck.status === 'ok' ? 'healthy' : 
                   healthCheck.status === 'error' ? 'unhealthy' : 'degraded';

    return {
      service: serviceName,
      version,
      status,
      uptime,
      timestamp: new Date(),
      checks: healthCheck.details || {},
    };
  }
}