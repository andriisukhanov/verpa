import { RateLimitStrategy } from './rate-limit.interface';

export interface RateLimitModuleOptions {
  // Global settings
  strategy?: RateLimitStrategy;
  storage?: 'redis' | 'memory' | 'custom';
  redisClient?: any;
  
  // Default limits
  defaultLimits?: {
    anonymous: RateLimitTier;
    authenticated: RateLimitTier;
    premium?: RateLimitTier;
  };
  
  // Security
  trustProxy?: boolean;
  skipSuccessfulRequests?: boolean;
  ignoreUserAgents?: RegExp[];
  
  // Response
  errorMessage?: string;
  headers?: {
    limit?: string;
    remaining?: string;
    reset?: string;
    retryAfter?: string;
  };
  
  // Analytics
  enableAnalytics?: boolean;
  analyticsInterval?: number; // ms
  
  // Advanced
  cascadeLimits?: boolean; // Apply multiple limits
  distributeLoad?: boolean; // Distribute limits across instances
}

export interface RateLimitTier {
  name: string;
  limits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  burst?: number; // Allow burst requests
  penalty?: number; // Penalty duration for violations
}

export interface EndpointRateLimit {
  path: string;
  method?: string;
  limits: {
    anonymous?: Partial<RateLimitTier>;
    authenticated?: Partial<RateLimitTier>;
    [key: string]: Partial<RateLimitTier> | undefined;
  };
  skipIf?: (request: any) => boolean | Promise<boolean>;
}

export interface DynamicRateLimit {
  getUserTier: (userId: string) => Promise<string>;
  getCustomLimits: (userId: string, endpoint: string) => Promise<RateLimitTier | null>;
  onLimitExceeded?: (userId: string, endpoint: string) => Promise<void>;
}

export interface RateLimitStorageOptions {
  keyPrefix?: string;
  tableName?: string;
  cleanupInterval?: number;
  maxKeys?: number;
}