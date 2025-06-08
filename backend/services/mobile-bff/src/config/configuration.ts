export default () => ({
  app: {
    name: process.env.SERVICE_NAME || 'mobile-bff',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3100,
    version: process.env.APP_VERSION || '1.0.0',
  },
  services: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3000',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    aquariumService: process.env.AQUARIUM_SERVICE_URL || 'http://localhost:3002',
    eventService: process.env.EVENT_SERVICE_URL || 'http://localhost:3003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3005',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 300, // 5 minutes
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 60, // 1 minute
    max: parseInt(process.env.CACHE_MAX_ITEMS, 10) || 1000,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
  security: {
    apiKey: process.env.INTERNAL_API_KEY || 'verpa_internal_api_key_dev',
  },
  mobile: {
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 50,
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
    imageOptimization: {
      thumbnail: { width: 150, height: 150 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 },
    },
  },
});