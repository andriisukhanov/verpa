import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitStrategy } from './rate-limit.strategy';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

@Injectable()
export class LeakyBucketStrategy extends RateLimitStrategy {
  name = 'leaky-bucket';
  private redisClient: Redis;

  constructor(
    private readonly options: {
      storeClient: Redis;
      capacity: number; // Maximum requests in bucket
      leakRate: number; // Requests leaked per second
      keyPrefix?: string;
    },
  ) {
    super();
    this.redisClient = options.storeClient;
  }

  async consume(key: string, drops: number = 1): Promise<RateLimitResult> {
    const now = Date.now();
    const bucketKey = `${this.options.keyPrefix || 'rl:lb:'}${key}`;
    
    // Lua script for atomic leaky bucket operations
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local leak_rate = tonumber(ARGV[2])
      local drops = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      -- Get current bucket state
      local bucket = redis.call('HMGET', key, 'volume', 'last_leak')
      local current_volume = tonumber(bucket[1]) or 0
      local last_leak = tonumber(bucket[2]) or now
      
      -- Calculate how much has leaked since last check
      local time_elapsed = (now - last_leak) / 1000
      local leaked = time_elapsed * leak_rate
      
      -- Update volume after leak
      current_volume = math.max(0, current_volume - leaked)
      
      -- Check if we can add new drops
      if current_volume + drops <= capacity then
        current_volume = current_volume + drops
        redis.call('HMSET', key, 'volume', current_volume, 'last_leak', now)
        redis.call('EXPIRE', key, 86400) -- Expire after 24 hours
        
        -- Calculate when bucket will be empty enough for next request
        local time_until_space = math.max(0, (current_volume - (capacity - 1)) / leak_rate)
        return {1, capacity - current_volume, time_until_space} -- allowed, remaining space, retry_after
      else
        -- Bucket is full, calculate when there will be space
        local overflow = (current_volume + drops) - capacity
        local time_until_space = overflow / leak_rate
        redis.call('HMSET', key, 'volume', current_volume, 'last_leak', now)
        redis.call('EXPIRE', key, 86400)
        return {0, capacity - current_volume, time_until_space} -- not allowed, remaining space, retry_after
      end
    `;

    const result = await this.redisClient.eval(
      luaScript,
      1,
      bucketKey,
      this.options.capacity,
      this.options.leakRate,
      drops,
      now,
    ) as [number, number, number];

    const [allowed, remainingSpace, retryAfter] = result;

    return {
      allowed: allowed === 1,
      remaining: Math.max(0, remainingSpace),
      retryAfter: Math.ceil(retryAfter),
      limit: this.options.capacity,
      reset: new Date(now + (retryAfter * 1000)),
    };
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const bucketKey = `${this.options.keyPrefix || 'rl:lb:'}${key}`;
    const bucket = await this.redisClient.hgetall(bucketKey);
    
    if (!bucket.volume) return null;

    const now = Date.now();
    const currentVolume = parseFloat(bucket.volume);
    const lastLeak = parseFloat(bucket.last_leak);
    
    // Calculate current volume after leak
    const timeElapsed = (now - lastLeak) / 1000;
    const leaked = timeElapsed * this.options.leakRate;
    const volume = Math.max(0, currentVolume - leaked);
    const remainingSpace = this.options.capacity - volume;

    return {
      allowed: remainingSpace > 0,
      remaining: Math.max(0, remainingSpace),
      retryAfter: remainingSpace > 0 ? 0 : Math.ceil(1 / this.options.leakRate),
      limit: this.options.capacity,
      reset: new Date(now + (volume / this.options.leakRate * 1000)),
    };
  }

  async reset(key: string): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:lb:'}${key}`;
    await this.redisClient.del(bucketKey);
  }

  async block(key: string, duration: number): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:lb:'}${key}`;
    const blockKey = `${bucketKey}:blocked`;
    await this.redisClient.setex(blockKey, duration, '1');
  }

  async delete(key: string): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:lb:'}${key}`;
    await this.redisClient.del(bucketKey);
  }
}