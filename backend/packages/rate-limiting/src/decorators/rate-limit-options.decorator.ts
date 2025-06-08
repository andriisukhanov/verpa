import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RateLimitInfo } from '../interfaces/rate-limit.interface';

export const RateLimitInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RateLimitInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.rateLimitInfo || {
      limit: 0,
      remaining: 0,
      reset: new Date(),
    };
  },
);