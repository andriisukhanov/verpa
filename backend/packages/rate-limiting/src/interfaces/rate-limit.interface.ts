export interface RateLimitConfig {
  // Basic configuration
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
  blockDuration?: number; // Block duration in seconds when limit exceeded

  // Advanced options
  keyPrefix?: string; // Redis key prefix
  execEvenly?: boolean; // Spread requests evenly across duration
  storeClient?: any; // Custom storage client (Redis, Memory, etc.)
  
  // User-specific limits
  skipIf?: (request: any) => boolean | Promise<boolean>; // Skip rate limiting conditionally
  keyGenerator?: (request: any) => string | Promise<string>; // Custom key generation
  
  // Response customization
  errorMessage?: string; // Custom error message
  customResponseSchema?: (rateLimitInfo: RateLimitInfo) => any; // Custom response format
  
  // Whitelisting/Blacklisting
  whitelist?: string[]; // IP addresses or user IDs to whitelist
  blacklist?: string[]; // IP addresses or user IDs to blacklist
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
  reset: Date;
}

export interface UserRateLimit {
  userId: string;
  limits: {
    [endpoint: string]: {
      points: number;
      duration: number;
    };
  };
  tier?: 'free' | 'basic' | 'premium' | 'unlimited';
}

export interface IpRateLimit {
  ip: string;
  blocked?: boolean;
  reason?: string;
  expiresAt?: Date;
}

export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed-window',
  SLIDING_WINDOW = 'sliding-window',
  TOKEN_BUCKET = 'token-bucket',
  LEAKY_BUCKET = 'leaky-bucket',
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  averageResponseTime: number;
  topBlockedIps: Array<{ ip: string; count: number }>;
  topBlockedUsers: Array<{ userId: string; count: number }>;
}