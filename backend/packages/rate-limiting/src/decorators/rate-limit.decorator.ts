import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_OPTIONS } from '../utils/rate-limit.constants';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';

export const RateLimit = (options: Partial<RateLimitConfig>): MethodDecorator => {
  return SetMetadata(RATE_LIMIT_OPTIONS, options);
};

export const RateLimitPerSecond = (points: number): MethodDecorator => {
  return RateLimit({ points, duration: 1 });
};

export const RateLimitPerMinute = (points: number): MethodDecorator => {
  return RateLimit({ points, duration: 60 });
};

export const RateLimitPerHour = (points: number): MethodDecorator => {
  return RateLimit({ points, duration: 3600 });
};

export const RateLimitPerDay = (points: number): MethodDecorator => {
  return RateLimit({ points, duration: 86400 });
};