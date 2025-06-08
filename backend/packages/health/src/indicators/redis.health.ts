import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async checkRedis(key: string, redis: Redis): Promise<HealthIndicatorResult> {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      return this.getStatus(key, true, { 
        status: 'connected',
        latency: `${latency}ms`,
        mode: redis.mode || 'standalone',
        host: redis.options.host,
        port: redis.options.port,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: 'disconnected',
          error: error.message,
        }),
      );
    }
  }

  async checkRedisMemory(key: string, redis: Redis, threshold = 0.9): Promise<HealthIndicatorResult> {
    try {
      const info = await redis.info('memory');
      const memoryInfo = this.parseRedisInfo(info);
      
      const usedMemory = parseInt(memoryInfo.used_memory || '0');
      const maxMemory = parseInt(memoryInfo.maxmemory || '0');
      
      if (maxMemory > 0) {
        const usage = usedMemory / maxMemory;
        const isHealthy = usage < threshold;
        
        return this.getStatus(key, isHealthy, {
          used: this.formatBytes(usedMemory),
          max: this.formatBytes(maxMemory),
          usage: `${(usage * 100).toFixed(2)}%`,
          threshold: `${(threshold * 100)}%`,
        });
      }

      return this.getStatus(key, true, {
        used: this.formatBytes(usedMemory),
        message: 'No memory limit set',
      });
    } catch (error) {
      throw new HealthCheckError(
        'Redis memory check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}