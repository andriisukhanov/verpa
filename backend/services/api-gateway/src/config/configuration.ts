export const configuration = () => ({
  service: {
    name: process.env.SERVICE_NAME || 'api-gateway',
    port: parseInt(process.env.SERVICE_PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    aquariumService: process.env.AQUARIUM_SERVICE_URL || 'http://localhost:3002',
    eventService: process.env.EVENT_SERVICE_URL || 'http://localhost:3003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3005',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
  },
  serviceRegistry: {
    url: process.env.SERVICE_REGISTRY_URL || 'http://localhost:8500',
  },
  auth: {
    internalApiKey: process.env.INTERNAL_API_KEY || 'internal-api-key',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
  metrics: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090', 10),
  },
});