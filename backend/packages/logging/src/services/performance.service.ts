import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LOGGING_CONFIG } from '../utils/constants';
import { LoggingConfig } from '../interfaces/log-config.interface';
import { PerformanceContext } from '../interfaces/log-context.interface';

@Injectable()
export class PerformanceService {
  constructor(
    @Inject(LOGGING_CONFIG) private readonly config: LoggingConfig,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PerformanceService');
  }

  startTimer(): PerformanceTimer {
    return new PerformanceTimer(this.logger, this.config);
  }

  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const timer = this.startTimer();
    try {
      const result = await fn();
      timer.end(name, metadata);
      return result;
    } catch (error) {
      timer.error(name, error, metadata);
      throw error;
    }
  }

  measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>,
  ): T {
    const timer = this.startTimer();
    try {
      const result = fn();
      timer.end(name, metadata);
      return result;
    } catch (error) {
      timer.error(name, error, metadata);
      throw error;
    }
  }

  checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;

    const threshold = this.config.performance?.memoryThreshold || 500; // Default 500MB

    if (heapUsedMB > threshold) {
      this.logger.warn('High memory usage detected', {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        heapTotal: `${heapTotalMB.toFixed(2)} MB`,
        rss: `${rssMB.toFixed(2)} MB`,
        threshold: `${threshold} MB`,
      });
    }
  }

  checkCpuUsage(): void {
    const usage = process.cpuUsage();
    const userCPU = usage.user / 1000000; // Convert to seconds
    const systemCPU = usage.system / 1000000;
    const totalCPU = userCPU + systemCPU;

    this.logger.debug('CPU usage', {
      user: `${userCPU.toFixed(2)}s`,
      system: `${systemCPU.toFixed(2)}s`,
      total: `${totalCPU.toFixed(2)}s`,
    });
  }
}

export class PerformanceTimer {
  private startTime: number;
  private startCpuUsage: NodeJS.CpuUsage;
  private startMemoryUsage: NodeJS.MemoryUsage;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: LoggingConfig,
  ) {
    this.startTime = Date.now();
    this.startCpuUsage = process.cpuUsage();
    this.startMemoryUsage = process.memoryUsage();
  }

  end(operation: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    const endCpuUsage = process.cpuUsage(this.startCpuUsage);
    const endMemoryUsage = process.memoryUsage();

    const context: PerformanceContext = {
      startTime: this.startTime,
      endTime: Date.now(),
      duration,
      cpuUsage: endCpuUsage,
      memoryUsage: endMemoryUsage,
    };

    const slowThreshold = this.config.performance?.slowRequestThreshold || 1000; // Default 1 second

    if (duration > slowThreshold) {
      this.logger.warn(`Slow operation detected: ${operation}`, {
        ...metadata,
        performance: context,
      });
    } else {
      this.logger.debug(`Operation completed: ${operation}`, {
        ...metadata,
        performance: context,
      });
    }
  }

  error(operation: string, error: Error, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;

    this.logger.error(`Operation failed: ${operation}`, error, {
      ...metadata,
      performance: {
        duration,
        failed: true,
      },
    });
  }

  checkpoint(name: string): void {
    const duration = Date.now() - this.startTime;
    this.logger.debug(`Checkpoint: ${name}`, {
      duration,
      checkpoint: name,
    });
  }
}