import { Injectable } from '@nestjs/common';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { RateLimitStrategy } from './rate-limit.strategy';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

@Injectable()
export class SlidingWindowStrategy extends RateLimitStrategy {
  name = 'sliding-window';
  private limiter: RateLimiterRedis | RateLimiterMemory;

  constructor(
    private readonly options: {
      storeClient?: any;
      points: number;
      duration: number;
      blockDuration?: number;
      keyPrefix?: string;
    },
  ) {
    super();
    
    // rate-limiter-flexible uses sliding window by default for Redis
    if (options.storeClient) {
      this.limiter = new RateLimiterRedis({
        storeClient: options.storeClient,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || 0,
        keyPrefix: options.keyPrefix || 'rl:sw:',
        execEvenly: false, // This enables sliding window behavior
      });
    } else {
      // Memory limiter doesn't support true sliding window, falls back to fixed
      this.limiter = new RateLimiterMemory({
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || 0,
        keyPrefix: options.keyPrefix || 'rl:sw:',
      });
    }
  }

  async consume(key: string, points: number = 1): Promise<RateLimitResult> {
    try {
      const result = await this.limiter.consume(key, points);
      return this.formatResult(result, true);
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        return this.formatResult(error, false);
      }
      throw error;
    }
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const result = await this.limiter.get(key);
    if (!result) return null;
    
    return {
      allowed: result.remainingPoints > 0,
      remaining: result.remainingPoints,
      retryAfter: 0,
      limit: this.options.points,
      reset: new Date(Date.now() + (result.msBeforeNext || 0)),
    };
  }

  async reset(key: string): Promise<void> {
    await this.limiter.delete(key);
  }

  async block(key: string, duration: number): Promise<void> {
    await this.limiter.block(key, duration);
  }

  async delete(key: string): Promise<void> {
    await this.limiter.delete(key);
  }

  private formatResult(result: RateLimiterRes, allowed: boolean): RateLimitResult {
    return {
      allowed,
      remaining: Math.max(0, result.remainingPoints || 0),
      retryAfter: Math.round((result.msBeforeNext || 0) / 1000),
      limit: this.options.points,
      reset: new Date(Date.now() + (result.msBeforeNext || 0)),
    };
  }
}