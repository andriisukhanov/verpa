import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitStorageService } from '../services/rate-limit-storage.service';
import { RateLimitUtils } from '../utils/rate-limit.utils';
import { DynamicRateLimit } from '../interfaces/rate-limit-options.interface';
import { ERROR_MESSAGES } from '../utils/rate-limit.constants';

@Injectable()
export class AdvancedRateLimitGuard implements CanActivate {
  constructor(
    private rateLimitService: RateLimitService,
    private storageService: RateLimitStorageService,
    @Inject('DYNAMIC_RATE_LIMIT') private dynamicConfig?: DynamicRateLimit,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check IP blocking
    const ip = RateLimitUtils.getClientIp(request);
    const ipBlocked = await this.checkIpBlock(ip);
    if (ipBlocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
          message: ERROR_MESSAGES.IP_BLOCKED,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check user blocking
    if (request.user?.id) {
      const userBlocked = await this.checkUserBlock(request.user.id);
      if (userBlocked) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            error: 'Forbidden',
            message: ERROR_MESSAGES.USER_BLOCKED,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Bot detection
    if (RateLimitUtils.isBot(request.headers['user-agent'])) {
      // Apply stricter limits for bots
      const botConfig = {
        points: 10,
        duration: 60,
        blockDuration: 300,
      };

      const result = await this.rateLimitService.checkLimit(request, botConfig);
      if (!result.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: 'Bot rate limit exceeded',
            retryAfter: result.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Dynamic rate limiting
    if (this.dynamicConfig && request.user?.id) {
      const customLimits = await this.dynamicConfig.getCustomLimits(
        request.user.id,
        request.path,
      );

      if (customLimits) {
        const result = await this.rateLimitService.checkLimit(request, {
          points: customLimits.limits.perMinute || 60,
          duration: 60,
        });

        if (!result.allowed) {
          // Call custom handler if provided
          if (this.dynamicConfig.onLimitExceeded) {
            await this.dynamicConfig.onLimitExceeded(
              request.user.id,
              request.path,
            );
          }

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              error: 'Too Many Requests',
              message: 'Custom rate limit exceeded',
              retryAfter: result.retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // Distributed rate limiting check
    if (await this.isDistributedAttack(request)) {
      // Block the IP temporarily
      await this.rateLimitService.blockIp(ip, 3600, 'Suspected distributed attack');
      
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
          message: 'Suspicious activity detected',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private async checkIpBlock(ip: string): Promise<boolean> {
    const hashedIp = RateLimitUtils.hashIp(ip);
    return this.storageService.isBlocked(`blocked:ip:${hashedIp}`);
  }

  private async checkUserBlock(userId: string): Promise<boolean> {
    return this.storageService.isBlocked(`blocked:user:${userId}`);
  }

  private async isDistributedAttack(request: Request): Promise<boolean> {
    // Check if multiple IPs are hitting the same endpoint rapidly
    const endpoint = `${request.method}:${request.path}`;
    const key = `distributed:${endpoint}`;
    
    // This is a simplified check - in production, you'd want more sophisticated detection
    const recentIps = await this.storageService.getClient()?.scard(key);
    
    if (recentIps && recentIps > 100) {
      // More than 100 different IPs hitting same endpoint in short time
      return true;
    }

    // Add current IP to the set (with expiration)
    const ip = RateLimitUtils.getClientIp(request);
    await this.storageService.getClient()?.sadd(key, ip);
    await this.storageService.getClient()?.expire(key, 60); // 1 minute window

    return false;
  }
}