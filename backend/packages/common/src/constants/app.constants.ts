export const APP_CONSTANTS = {
  APP_NAME: 'Verpa',
  APP_VERSION: '1.0.0',
  API_VERSION: 'v1',
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_TIMEZONE: 'UTC',
  SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'zh'],
  
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
    MAX_FILES_PER_UPLOAD: 10,
  },
  
  RATE_LIMITS: {
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 5,
    },
    FILE_UPLOAD: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_REQUESTS: 20,
    },
  },
  
  CACHE_TTL: {
    USER_PROFILE: 60 * 60, // 1 hour
    AQUARIUM_LIST: 5 * 60, // 5 minutes
    EVENTS: 2 * 60, // 2 minutes
    STATIC_DATA: 24 * 60 * 60, // 24 hours
  },
} as const;