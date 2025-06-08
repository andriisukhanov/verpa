export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  },
  
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
    RESERVED_WORDS: ['admin', 'api', 'app', 'www', 'mail', 'ftp', 'root', 'verpa'],
  },
  
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^\+?[1-9]\d{9,14}$/,
  },
  
  AQUARIUM: {
    NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 100,
    },
    DESCRIPTION: {
      MAX_LENGTH: 500,
    },
    VOLUME: {
      MIN: 1,
      MAX: 100000, // liters
    },
    DIMENSIONS: {
      MIN: 1,
      MAX: 10000, // cm
    },
  },
  
  EVENT: {
    TITLE: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 200,
    },
    DESCRIPTION: {
      MAX_LENGTH: 1000,
    },
    REMINDER: {
      MIN_MINUTES_BEFORE: 0,
      MAX_MINUTES_BEFORE: 10080, // 1 week
    },
  },
  
  FILE: {
    IMAGE: {
      MAX_SIZE: 10 * 1024 * 1024, // 10MB
      ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      MAX_DIMENSION: 5000, // pixels
    },
    DOCUMENT: {
      MAX_SIZE: 25 * 1024 * 1024, // 25MB
      ALLOWED_TYPES: ['application/pdf'],
    },
  },
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
  PASSWORD_TOO_LONG: `Password must not exceed ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`,
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, number and special character',
  USERNAME_TOO_SHORT: `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`,
  USERNAME_TOO_LONG: `Username must not exceed ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`,
  USERNAME_INVALID: 'Username can only contain letters, numbers, hyphens and underscores',
  USERNAME_RESERVED: 'This username is reserved',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed size',
  FILE_TYPE_NOT_ALLOWED: 'This file type is not allowed',
  INVALID_DATE: 'Please enter a valid date',
  DATE_IN_PAST: 'Date cannot be in the past',
  INVALID_NUMBER: 'Please enter a valid number',
  NUMBER_TOO_SMALL: 'Value is too small',
  NUMBER_TOO_LARGE: 'Value is too large',
} as const;