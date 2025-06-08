import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.http.pingCheck(
        'api-gateway',
        `${this.configService.get('services.apiGateway')}/health`,
      ),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date(),
      service: 'mobile-bff',
      version: this.configService.get('app.version'),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return { status: 'alive' };
  }
}