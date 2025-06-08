import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Request } from 'express';
import { UserRateLimit, IpRateLimit, RateLimitMetrics } from '../interfaces/rate-limit.interface';
import { RateLimitUtils } from '../utils/rate-limit.utils';

@Injectable()
export class RateLimitStorageService {
  private readonly logger = new Logger(RateLimitStorageService.name);
  private redisClient: Redis;
  private memoryStorage: Map<string, any> = new Map();

  constructor(private readonly options: { storage: 'redis' | 'memory'; redisClient?: Redis }) {
    if (options.storage === 'redis' && options.redisClient) {
      this.redisClient = options.redisClient;
    }
  }

  getClient(): Redis | null {
    return this.redisClient || null;
  }

  async isBlocked(key: string): Promise<boolean> {
    if (this.redisClient) {
      const blocked = await this.redisClient.get(`${key}:blocked`);
      return blocked !== null;
    } else {
      return this.memoryStorage.has(`${key}:blocked`);
    }
  }

  async getBlockDuration(key: string): Promise<number> {
    if (this.redisClient) {
      const ttl = await this.redisClient.ttl(`${key}:blocked`);
      return ttl > 0 ? ttl : 0;
    } else {
      const blocked = this.memoryStorage.get(`${key}:blocked`);
      if (blocked && blocked.expiresAt > Date.now()) {
        return Math.ceil((blocked.expiresAt - Date.now()) / 1000);
      }
      return 0;
    }
  }

  async block(key: string, duration: number): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.setex(`${key}:blocked`, duration, '1');
    } else {
      this.memoryStorage.set(`${key}:blocked`, {
        expiresAt: Date.now() + (duration * 1000),
      });
    }
  }

  async unblock(key: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.del(`${key}:blocked`);
    } else {
      this.memoryStorage.delete(`${key}:blocked`);
    }
  }

  async blockUser(userId: string, duration: number, reason?: string): Promise<void> {
    const key = `blocked:user:${userId}`;
    const data: IpRateLimit = {
      ip: userId,
      blocked: true,
      reason,
      expiresAt: new Date(Date.now() + (duration * 1000)),
    };

    if (this.redisClient) {
      await this.redisClient.setex(key, duration, JSON.stringify(data));
    } else {
      this.memoryStorage.set(key, data);
    }
  }

  async blockIp(ip: string, duration: number, reason?: string): Promise<void> {
    const key = `blocked:ip:${ip}`;
    const data: IpRateLimit = {
      ip,
      blocked: true,
      reason,
      expiresAt: new Date(Date.now() + (duration * 1000)),
    };

    if (this.redisClient) {
      await this.redisClient.setex(key, duration, JSON.stringify(data));
    } else {
      this.memoryStorage.set(key, data);
    }
  }

  async getUserTier(userId: string): Promise<string | null> {
    const key = `user:tier:${userId}`;
    
    if (this.redisClient) {
      return await this.redisClient.get(key);
    } else {
      return this.memoryStorage.get(key) || null;
    }
  }

  async setUserTier(userId: string, tier: string): Promise<void> {
    const key = `user:tier:${userId}`;
    
    if (this.redisClient) {
      await this.redisClient.set(key, tier, 'EX', 86400); // 24 hour cache
    } else {
      this.memoryStorage.set(key, tier);
    }
  }

  async setUserLimits(userId: string, limits: UserRateLimit): Promise<void> {
    const key = `user:limits:${userId}`;
    
    if (this.redisClient) {
      await this.redisClient.set(key, JSON.stringify(limits), 'EX', 86400);
    } else {
      this.memoryStorage.set(key, limits);
    }
  }

  async getUserLimits(userId: string): Promise<UserRateLimit | null> {
    const key = `user:limits:${userId}`;
    
    if (this.redisClient) {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStorage.get(key) || null;
    }
  }

  async recordViolation(key: string, request: Request): Promise<void> {
    const ip = RateLimitUtils.getClientIp(request);
    const userId = request.user?.id;
    const endpoint = `${request.method}:${request.path}`;
    
    const violation = {
      key,
      ip,
      userId,
      endpoint,
      timestamp: Date.now(),
      userAgent: request.headers['user-agent'],
    };

    // Store violation
    if (this.redisClient) {
      const violationKey = `violations:${new Date().toISOString().split('T')[0]}`;
      await this.redisClient.lpush(violationKey, JSON.stringify(violation));
      await this.redisClient.expire(violationKey, 604800); // 7 days
      
      // Increment counters
      await this.redisClient.hincrby('metrics:violations', 'total', 1);
      await this.redisClient.hincrby('metrics:violations:ip', ip, 1);
      if (userId) {
        await this.redisClient.hincrby('metrics:violations:user', userId, 1);
      }
      await this.redisClient.hincrby('metrics:violations:endpoint', endpoint, 1);
    } else {
      // Memory storage (limited metrics)
      const metrics = this.memoryStorage.get('metrics') || {
        totalViolations: 0,
        violations: [],
      };
      metrics.totalViolations++;
      metrics.violations.push(violation);
      // Keep only last 1000 violations in memory
      if (metrics.violations.length > 1000) {
        metrics.violations = metrics.violations.slice(-1000);
      }
      this.memoryStorage.set('metrics', metrics);
    }
  }

  async getMetrics(): Promise<RateLimitMetrics> {
    if (this.redisClient) {
      const [total, ipViolations, userViolations, endpointViolations] = await Promise.all([
        this.redisClient.hget('metrics:violations', 'total'),
        this.redisClient.hgetall('metrics:violations:ip'),
        this.redisClient.hgetall('metrics:violations:user'),
        this.redisClient.hgetall('metrics:violations:endpoint'),
      ]);

      // Get top violators
      const topIps = Object.entries(ipViolations || {})
        .map(([ip, count]) => ({ ip, count: parseInt(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topUsers = Object.entries(userViolations || {})
        .map(([userId, count]) => ({ userId, count: parseInt(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalRequests: 0, // Would need separate tracking
        allowedRequests: 0, // Would need separate tracking
        blockedRequests: parseInt(total || '0'),
        averageResponseTime: 0, // Would need separate tracking
        topBlockedIps: topIps,
        topBlockedUsers: topUsers,
      };
    } else {
      const metrics = this.memoryStorage.get('metrics') || {
        totalViolations: 0,
        violations: [],
      };

      return {
        totalRequests: 0,
        allowedRequests: 0,
        blockedRequests: metrics.totalViolations,
        averageResponseTime: 0,
        topBlockedIps: [],
        topBlockedUsers: [],
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.redisClient) {
      // Clean up expired keys
      const pattern = 'rl:*';
      let cursor = '0';
      
      do {
        const result = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        
        for (const key of keys) {
          const ttl = await this.redisClient.ttl(key);
          if (ttl === -1) {
            // Key has no expiration, check if it's old
            await this.redisClient.expire(key, 86400); // Set 24h expiration
          }
        }
      } while (cursor !== '0');
    } else {
      // Clean up memory storage
      const now = Date.now();
      for (const [key, value] of this.memoryStorage.entries()) {
        if (value.expiresAt && value.expiresAt < now) {
          this.memoryStorage.delete(key);
        }
      }
    }
  }
}