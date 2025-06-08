export interface RateLimitResponse {
  statusCode: number;
  message: string;
  error: string;
  retryAfter: number;
  limit: number;
  remaining: number;
  reset: string;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
  'X-RateLimit-Burst'?: string;
  'X-RateLimit-Policy'?: string;
}

export interface RateLimitExceededEvent {
  userId?: string;
  ip: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  limit: number;
  windowSize: number;
  userAgent?: string;
  tier?: string;
}