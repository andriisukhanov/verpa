import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitStrategy } from './rate-limit.strategy';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

@Injectable()
export class TokenBucketStrategy extends RateLimitStrategy {
  name = 'token-bucket';
  private redisClient: Redis;

  constructor(
    private readonly options: {
      storeClient: Redis;
      capacity: number; // Maximum tokens in bucket
      refillRate: number; // Tokens per second
      refillAmount?: number; // Tokens to add per refill (default: 1)
      keyPrefix?: string;
    },
  ) {
    super();
    this.redisClient = options.storeClient;
  }

  async consume(key: string, tokens: number = 1): Promise<RateLimitResult> {
    const now = Date.now();
    const bucketKey = `${this.options.keyPrefix || 'rl:tb:'}${key}`;
    
    // Lua script for atomic token bucket operations
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local refill_amount = tonumber(ARGV[3])
      local requested_tokens = tonumber(ARGV[4])
      local now = tonumber(ARGV[5])
      
      -- Get current bucket state
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local current_tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local time_elapsed = (now - last_refill) / 1000
      local tokens_to_add = math.floor(time_elapsed * refill_rate) * refill_amount
      
      -- Update tokens (cap at capacity)
      if tokens_to_add > 0 then
        current_tokens = math.min(capacity, current_tokens + tokens_to_add)
        last_refill = now
      end
      
      -- Check if we can consume requested tokens
      if current_tokens >= requested_tokens then
        current_tokens = current_tokens - requested_tokens
        redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', last_refill)
        redis.call('EXPIRE', key, 86400) -- Expire after 24 hours
        return {1, current_tokens, 0} -- allowed, remaining, retry_after
      else
        -- Calculate when enough tokens will be available
        local tokens_needed = requested_tokens - current_tokens
        local seconds_until_refill = tokens_needed / (refill_rate * refill_amount)
        redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', last_refill)
        redis.call('EXPIRE', key, 86400)
        return {0, current_tokens, math.ceil(seconds_until_refill)} -- not allowed, remaining, retry_after
      end
    `;

    const result = await this.redisClient.eval(
      luaScript,
      1,
      bucketKey,
      this.options.capacity,
      this.options.refillRate,
      this.options.refillAmount || 1,
      tokens,
      now,
    ) as [number, number, number];

    const [allowed, remaining, retryAfter] = result;

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter,
      limit: this.options.capacity,
      reset: new Date(now + (retryAfter * 1000)),
    };
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const bucketKey = `${this.options.keyPrefix || 'rl:tb:'}${key}`;
    const bucket = await this.redisClient.hgetall(bucketKey);
    
    if (!bucket.tokens) return null;

    const now = Date.now();
    const currentTokens = parseFloat(bucket.tokens);
    const lastRefill = parseFloat(bucket.last_refill);
    
    // Calculate current tokens with refill
    const timeElapsed = (now - lastRefill) / 1000;
    const tokensToAdd = Math.floor(timeElapsed * this.options.refillRate) * (this.options.refillAmount || 1);
    const tokens = Math.min(this.options.capacity, currentTokens + tokensToAdd);

    return {
      allowed: tokens > 0,
      remaining: tokens,
      retryAfter: tokens > 0 ? 0 : Math.ceil(1 / this.options.refillRate),
      limit: this.options.capacity,
      reset: new Date(now + 1000), // Tokens refill continuously
    };
  }

  async reset(key: string): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:tb:'}${key}`;
    await this.redisClient.del(bucketKey);
  }

  async block(key: string, duration: number): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:tb:'}${key}`;
    const blockKey = `${bucketKey}:blocked`;
    await this.redisClient.setex(blockKey, duration, '1');
  }

  async delete(key: string): Promise<void> {
    const bucketKey = `${this.options.keyPrefix || 'rl:tb:'}${key}`;
    await this.redisClient.del(bucketKey);
  }
}