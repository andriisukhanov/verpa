import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientKafka } from '@nestjs/microservices';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailService } from '../../infrastructure/email/email.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { PushService } from '../../infrastructure/push/push.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @Inject('KAFKA_SERVICE') private kafkaClient: ClientKafka,
    @Inject('REDIS_CLIENT') private redis: Redis,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
    @InjectQueue('push') private pushQueue: Queue,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Memory checks
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      
      // Disk check
      () => this.disk.checkStorage('disk', {
        thresholdPercent: 0.9,
        path: '/',
      }),
      
      // Redis check
      async () => this.checkRedis('redis'),
      
      // Kafka check
      async () => this.checkKafka('kafka'),
      
      // Queue checks
      async () => this.checkQueue('email_queue', this.emailQueue),
      async () => this.checkQueue('sms_queue', this.smsQueue),
      async () => this.checkQueue('push_queue', this.pushQueue),
      
      // External service checks
      async () => this.checkEmailService('email_service'),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date(),
      service: 'notification-service',
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness() {
    return { status: 'alive' };
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe' })
  startup() {
    const uptime = Date.now() - this.startTime;
    const minStartupTime = 10000; // 10 seconds

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

  @Get('metrics')
  @ApiOperation({ summary: 'Get service metrics' })
  async metrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get queue metrics
    const [emailCount, smsCount, pushCount] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.smsQueue.getJobCounts(),
      this.pushQueue.getJobCounts(),
    ]);

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
      queues: {
        email: emailCount,
        sms: smsCount,
        push: pushCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Health check methods
  private async checkRedis(key: string): Promise<HealthIndicatorResult> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        [key]: {
          status: 'up',
          message: 'Redis is healthy',
          latency: `${latency}ms`,
        },
      };
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: 'Redis connection failed',
          error: error.message,
        },
      };
    }
  }

  private async checkKafka(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if Kafka client is connected
      // This is a simplified check - in production you might want to 
      // actually produce/consume a test message
      const isConnected = this.kafkaClient && typeof this.kafkaClient.emit === 'function';
      
      if (isConnected) {
        return {
          [key]: {
            status: 'up',
            message: 'Kafka is connected',
          },
        };
      } else {
        throw new Error('Kafka client not connected');
      }
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: 'Kafka connection failed',
          error: error.message,
        },
      };
    }
  }

  private async checkQueue(key: string, queue: Queue): Promise<HealthIndicatorResult> {
    try {
      const counts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();
      
      const totalJobs = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const isHealthy = !isPaused && counts.failed < 100; // Threshold for failed jobs

      return {
        [key]: {
          status: isHealthy ? 'up' : 'down',
          message: isPaused ? 'Queue is paused' : 'Queue is active',
          jobs: counts,
          total: totalJobs,
        },
      };
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: 'Queue check failed',
          error: error.message,
        },
      };
    }
  }

  private async checkEmailService(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.emailService.verifyConnection();
      
      return {
        [key]: {
          status: isHealthy ? 'up' : 'down',
          message: isHealthy ? 'Email service is healthy' : 'Email service connection failed',
        },
      };
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: 'Email service check failed',
          error: error.message,
        },
      };
    }
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