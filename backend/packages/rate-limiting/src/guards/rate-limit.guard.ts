import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { RATE_LIMIT_OPTIONS, RATE_LIMIT_SKIP, RATE_LIMIT_HEADERS } from '../utils/rate-limit.constants';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';
import { RateLimitResponse, RateLimitHeaders } from '../interfaces/rate-limit-response.interface';
import { RateLimitUtils } from '../utils/rate-limit.utils';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
    private analyticsService: RateLimitAnalyticsService,
    @Inject('RATE_LIMIT_OPTIONS') private moduleOptions: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      RATE_LIMIT_SKIP,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Check if request should skip rate limiting based on module options
    if (RateLimitUtils.shouldSkipRateLimit(
      request,
      this.moduleOptions.whitelist,
      this.moduleOptions.skipPaths,
    )) {
      return true;
    }

    // Get rate limit configuration from decorator
    const rateLimitConfig = this.reflector.getAllAndOverride<Partial<RateLimitConfig>>(
      RATE_LIMIT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );

    // Check rate limit
    const result = await this.rateLimitService.checkLimit(request, rateLimitConfig);

    // Set rate limit headers
    this.setRateLimitHeaders(response, result);

    // Store rate limit info in request for later use
    (request as any).rateLimitInfo = {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };

    if (!result.allowed) {
      // Record analytics
      this.analyticsService.recordExceededEvent({
        userId: request.user?.id,
        ip: RateLimitUtils.getClientIp(request, this.moduleOptions.trustProxy),
        endpoint: request.path,
        method: request.method,
        timestamp: new Date(),
        limit: result.limit,
        windowSize: rateLimitConfig?.duration || 60,
        userAgent: request.headers['user-agent'],
        tier: RateLimitUtils.getTierFromRequest(request),
      });

      // Throw rate limit exception
      throw new HttpException(
        this.buildErrorResponse(result, rateLimitConfig),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private setRateLimitHeaders(response: Response, result: any): void {
    const headers: RateLimitHeaders = {
      [RATE_LIMIT_HEADERS.LIMIT]: result.limit.toString(),
      [RATE_LIMIT_HEADERS.REMAINING]: result.remaining.toString(),
      [RATE_LIMIT_HEADERS.RESET]: result.reset.toISOString(),
    };

    if (result.retryAfter > 0) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });
  }

  private buildErrorResponse(
    result: any,
    config?: Partial<RateLimitConfig>,
  ): RateLimitResponse {
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message: config?.errorMessage || this.moduleOptions.errorMessage || 
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset.toISOString(),
    };
  }
}