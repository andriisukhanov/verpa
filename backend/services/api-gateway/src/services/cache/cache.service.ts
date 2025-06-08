import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes
  private readonly prefix = 'cache:';

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisService.get(this.getKey(key));
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTTL;
      const cacheKey = this.getKey(key, options?.prefix);
      await this.redisService.set(cacheKey, JSON.stringify(value), ttl);
    } catch (error) {
      this.logger.error(`Failed to set cache for key ${key}:`, error);
    }
  }

  async del(key: string, prefix?: string): Promise<void> {
    try {
      await this.redisService.del(this.getKey(key, prefix));
    } catch (error) {
      this.logger.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      return await this.redisService.exists(this.getKey(key, prefix));
    } catch (error) {
      this.logger.error(`Failed to check cache existence for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = `${this.prefix}${pattern}`;
      let cursor = '0';
      const batchSize = 100;

      do {
        // Use SCAN for production-safe pattern matching
        const result = await this.redisService.scan(cursor, fullPattern, batchSize);
        cursor = result.cursor;
        
        if (result.keys.length > 0) {
          // Delete keys in batches
          await this.redisService.delMany(result.keys);
          this.logger.log(`Invalidated ${result.keys.length} cache keys matching pattern: ${pattern}`);
        }
      } while (cursor !== '0');
      
    } catch (error) {
      this.logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  private getKey(key: string, customPrefix?: string): string {
    const prefix = customPrefix ?? this.prefix;
    return `${prefix}${key}`;
  }
}