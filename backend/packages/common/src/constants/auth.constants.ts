export const AUTH_CONSTANTS = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    REMEMBER_ME_EXPIRY: '30d',
    EMAIL_VERIFICATION_EXPIRY: '24h',
    PASSWORD_RESET_EXPIRY: '1h',
  },
  
  SESSION: {
    MAX_CONCURRENT_SESSIONS: 5,
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  OAUTH: {
    GOOGLE: {
      SCOPES: ['email', 'profile'],
      ACCESS_TYPE: 'offline',
      PROMPT: 'consent',
    },
    APPLE: {
      SCOPES: ['email', 'name'],
      RESPONSE_TYPE: 'code id_token',
      RESPONSE_MODE: 'form_post',
    },
    FACEBOOK: {
      SCOPES: ['email', 'public_profile'],
      FIELDS: 'id,email,first_name,last_name,picture',
    },
  },
  
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    PASSWORD_HISTORY_COUNT: 5,
    MFA_CODE_LENGTH: 6,
    MFA_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  },
  
  HEADERS: {
    AUTHORIZATION: 'authorization',
    API_KEY: 'x-api-key',
    SESSION_ID: 'x-session-id',
    CLIENT_ID: 'x-client-id',
    REQUEST_ID: 'x-request-id',
  },
} as const;