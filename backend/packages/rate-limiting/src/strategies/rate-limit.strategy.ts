import { RateLimitResult } from '../interfaces/rate-limit.interface';

export abstract class RateLimitStrategy {
  abstract name: string;

  abstract consume(
    key: string,
    points: number,
    options?: any,
  ): Promise<RateLimitResult>;

  abstract get(key: string): Promise<RateLimitResult | null>;

  abstract reset(key: string): Promise<void>;

  abstract block(key: string, duration: number): Promise<void>;

  abstract delete(key: string): Promise<void>;
}