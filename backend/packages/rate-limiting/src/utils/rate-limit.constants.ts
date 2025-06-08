export const RATE_LIMIT_OPTIONS = 'RATE_LIMIT_OPTIONS';
export const RATE_LIMIT_SKIP = 'RATE_LIMIT_SKIP';
export const RATE_LIMIT_KEY = 'RATE_LIMIT_KEY';

export const DEFAULT_WINDOW_SIZE = 60; // 1 minute
export const DEFAULT_LIMIT = 60; // 60 requests per minute
export const DEFAULT_BLOCK_DURATION = 60; // 1 minute block

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  BURST: 'X-RateLimit-Burst',
  POLICY: 'X-RateLimit-Policy',
};

export const RATE_LIMIT_TIERS = {
  ANONYMOUS: {
    name: 'anonymous',
    limits: {
      perMinute: 30,
      perHour: 500,
      perDay: 2000,
    },
    burst: 10,
  },
  FREE: {
    name: 'free',
    limits: {
      perMinute: 60,
      perHour: 1000,
      perDay: 5000,
    },
    burst: 20,
  },
  BASIC: {
    name: 'basic',
    limits: {
      perMinute: 120,
      perHour: 2000,
      perDay: 10000,
    },
    burst: 40,
  },
  PREMIUM: {
    name: 'premium',
    limits: {
      perMinute: 300,
      perHour: 5000,
      perDay: 50000,
    },
    burst: 100,
  },
  UNLIMITED: {
    name: 'unlimited',
    limits: {
      perMinute: Number.MAX_SAFE_INTEGER,
      perHour: Number.MAX_SAFE_INTEGER,
      perDay: Number.MAX_SAFE_INTEGER,
    },
    burst: Number.MAX_SAFE_INTEGER,
  },
};

export const ERROR_MESSAGES = {
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  IP_BLOCKED: 'Your IP address has been temporarily blocked due to excessive requests.',
  USER_BLOCKED: 'Your account has been temporarily suspended due to excessive requests.',
  INVALID_API_KEY: 'Invalid or missing API key.',
  SUBSCRIPTION_REQUIRED: 'This endpoint requires a paid subscription.',
};