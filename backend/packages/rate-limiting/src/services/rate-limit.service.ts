import { Injectable, Inject, Logger } from '@nestjs/common';
import { Request } from 'express';
import { 
  RateLimitConfig, 
  RateLimitResult, 
  RateLimitStrategy as RateLimitStrategyType,
  UserRateLimit,
} from '../interfaces/rate-limit.interface';
import { RateLimitModuleOptions, RateLimitTier } from '../interfaces/rate-limit-options.interface';
import { RateLimitStrategy } from '../strategies/rate-limit.strategy';
import { FixedWindowStrategy } from '../strategies/fixed-window.strategy';
import { SlidingWindowStrategy } from '../strategies/sliding-window.strategy';
import { TokenBucketStrategy } from '../strategies/token-bucket.strategy';
import { LeakyBucketStrategy } from '../strategies/leaky-bucket.strategy';
import { RateLimitUtils } from '../utils/rate-limit.utils';
import { RATE_LIMIT_TIERS } from '../utils/rate-limit.constants';
import { RateLimitStorageService } from './rate-limit-storage.service';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private strategies: Map<RateLimitStrategyType, RateLimitStrategy> = new Map();
  private tierCache: Map<string, RateLimitTier> = new Map();

  constructor(
    @Inject('RATE_LIMIT_OPTIONS') private readonly options: RateLimitModuleOptions,
    private readonly storageService: RateLimitStorageService,
  ) {
    this.initializeStrategies();
    this.initializeTiers();
  }

  private initializeStrategies() {
    const redisClient = this.storageService.getClient();

    // Fixed Window Strategy
    this.strategies.set(RateLimitStrategyType.FIXED_WINDOW, new FixedWindowStrategy({
      storeClient: redisClient,
      points: 60,
      duration: 60,
      keyPrefix: 'rl:fw:',
    }));

    // Sliding Window Strategy
    this.strategies.set(RateLimitStrategyType.SLIDING_WINDOW, new SlidingWindowStrategy({
      storeClient: redisClient,
      points: 60,
      duration: 60,
      keyPrefix: 'rl:sw:',
    }));

    // Token Bucket Strategy
    this.strategies.set(RateLimitStrategyType.TOKEN_BUCKET, new TokenBucketStrategy({
      storeClient: redisClient,
      capacity: 100,
      refillRate: 1,
      keyPrefix: 'rl:tb:',
    }));

    // Leaky Bucket Strategy
    this.strategies.set(RateLimitStrategyType.LEAKY_BUCKET, new LeakyBucketStrategy({
      storeClient: redisClient,
      capacity: 100,
      leakRate: 1,
      keyPrefix: 'rl:lb:',
    }));
  }

  private initializeTiers() {
    // Load default tiers
    Object.entries(RATE_LIMIT_TIERS).forEach(([key, tier]) => {
      this.tierCache.set(key.toLowerCase(), tier);
    });

    // Load custom tiers from options
    if (this.options.defaultLimits) {
      Object.entries(this.options.defaultLimits).forEach(([key, tier]) => {
        this.tierCache.set(key.toLowerCase(), tier);
      });
    }
  }

  async checkLimit(
    request: Request,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    // Generate rate limit key
    const key = await this.generateKey(request, config);
    
    // Check if blocked
    const isBlocked = await this.storageService.isBlocked(key);
    if (isBlocked) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: await this.storageService.getBlockDuration(key),
        limit: 0,
        reset: new Date(Date.now() + (await this.storageService.getBlockDuration(key) * 1000)),
      };
    }

    // Get user tier and limits
    const tier = await this.getUserTier(request);
    const limits = this.getTierLimits(tier, config);

    // Select strategy
    const strategyType = this.options.strategy || RateLimitStrategyType.SLIDING_WINDOW;
    const strategy = this.strategies.get(strategyType);

    if (!strategy) {
      throw new Error(`Rate limit strategy not found: ${strategyType}`);
    }

    // Check multiple time windows if cascading is enabled
    if (this.options.cascadeLimits) {
      const results = await this.checkCascadingLimits(key, limits, strategy);
      const mostRestrictive = results.find(r => !r.allowed) || results[0];
      return mostRestrictive;
    }

    // Single limit check
    const result = await strategy.consume(key, config?.points || 1);

    // Block if limit exceeded
    if (!result.allowed && config?.blockDuration) {
      await this.storageService.block(key, config.blockDuration);
    }

    // Log rate limit event
    if (!result.allowed) {
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      await this.storageService.recordViolation(key, request);
    }

    return result;
  }

  private async generateKey(
    request: Request,
    config?: Partial<RateLimitConfig>,
  ): Promise<string> {
    if (config?.keyGenerator) {
      return config.keyGenerator(request);
    }

    const parts: string[] = [];

    // Add prefix
    parts.push(config?.keyPrefix || 'rl');

    // Add user ID or IP
    if (request.user?.id) {
      parts.push(`user:${request.user.id}`);
    } else {
      const ip = RateLimitUtils.getClientIp(request, this.options.trustProxy);
      parts.push(`ip:${RateLimitUtils.hashIp(ip)}`);
    }

    // Add endpoint
    const endpoint = `${request.method}:${request.route?.path || request.path}`;
    parts.push(endpoint.replace(/[^a-zA-Z0-9]/g, '_'));

    return parts.join(':');
  }

  private async getUserTier(request: Request): Promise<string> {
    // Check for custom tier
    if (request.user?.id) {
      const customTier = await this.storageService.getUserTier(request.user.id);
      if (customTier) return customTier;
    }

    // Use request-based tier detection
    return RateLimitUtils.getTierFromRequest(request);
  }

  private getTierLimits(
    tierName: string,
    config?: Partial<RateLimitConfig>,
  ): RateLimitTier {
    // Override with config if provided
    if (config?.points && config?.duration) {
      return {
        name: 'custom',
        limits: {
          perSecond: config.duration === 1 ? config.points : undefined,
          perMinute: config.duration === 60 ? config.points : undefined,
          perHour: config.duration === 3600 ? config.points : undefined,
          perDay: config.duration === 86400 ? config.points : undefined,
        },
      };
    }

    // Get tier from cache
    const tier = this.tierCache.get(tierName.toLowerCase());
    if (!tier) {
      this.logger.warn(`Tier not found: ${tierName}, using anonymous`);
      return this.tierCache.get('anonymous')!;
    }

    return tier;
  }

  private async checkCascadingLimits(
    key: string,
    tier: RateLimitTier,
    strategy: RateLimitStrategy,
  ): Promise<RateLimitResult[]> {
    const results: RateLimitResult[] = [];

    // Check each time window
    const windows = [
      { duration: 1, limit: tier.limits.perSecond, suffix: ':1s' },
      { duration: 60, limit: tier.limits.perMinute, suffix: ':1m' },
      { duration: 3600, limit: tier.limits.perHour, suffix: ':1h' },
      { duration: 86400, limit: tier.limits.perDay, suffix: ':1d' },
    ];

    for (const window of windows) {
      if (window.limit) {
        const windowKey = `${key}${window.suffix}`;
        const result = await strategy.consume(windowKey, 1);
        results.push(result);
      }
    }

    return results;
  }

  async resetLimit(key: string): Promise<void> {
    const strategies = Array.from(this.strategies.values());
    await Promise.all(strategies.map(strategy => strategy.reset(key)));
    await this.storageService.unblock(key);
  }

  async blockUser(userId: string, duration: number, reason?: string): Promise<void> {
    await this.storageService.blockUser(userId, duration, reason);
    this.logger.warn(`User blocked: ${userId} for ${duration}s - ${reason}`);
  }

  async blockIp(ip: string, duration: number, reason?: string): Promise<void> {
    const hashedIp = RateLimitUtils.hashIp(ip);
    await this.storageService.blockIp(hashedIp, duration, reason);
    this.logger.warn(`IP blocked: ${hashedIp} for ${duration}s - ${reason}`);
  }

  async setUserTier(userId: string, tier: string): Promise<void> {
    await this.storageService.setUserTier(userId, tier);
    this.logger.log(`User tier updated: ${userId} -> ${tier}`);
  }

  async setCustomLimits(userId: string, limits: UserRateLimit): Promise<void> {
    await this.storageService.setUserLimits(userId, limits);
    this.logger.log(`Custom limits set for user: ${userId}`);
  }

  async getUsage(key: string): Promise<RateLimitResult | null> {
    const strategy = this.strategies.get(
      this.options.strategy || RateLimitStrategyType.SLIDING_WINDOW
    );
    return strategy ? strategy.get(key) : null;
  }

  async getMetrics(): Promise<any> {
    return this.storageService.getMetrics();
  }
}