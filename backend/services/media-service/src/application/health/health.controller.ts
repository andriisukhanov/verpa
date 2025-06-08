import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date(),
      service: 'media-service',
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return { status: 'alive' };
  }
}