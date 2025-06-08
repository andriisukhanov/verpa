export const ERROR_CODES = {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS: 'AUTH_1001',
  TOKEN_EXPIRED: 'AUTH_1002',
  TOKEN_INVALID: 'AUTH_1003',
  UNAUTHORIZED: 'AUTH_1004',
  EMAIL_NOT_VERIFIED: 'AUTH_1005',
  ACCOUNT_DISABLED: 'AUTH_1006',
  SESSION_EXPIRED: 'AUTH_1007',
  
  // User errors (2xxx)
  USER_NOT_FOUND: 'USER_2001',
  USER_ALREADY_EXISTS: 'USER_2002',
  EMAIL_ALREADY_IN_USE: 'USER_2003',
  USERNAME_ALREADY_TAKEN: 'USER_2004',
  INVALID_PASSWORD: 'USER_2005',
  
  // Aquarium errors (3xxx)
  AQUARIUM_NOT_FOUND: 'AQUARIUM_3001',
  AQUARIUM_LIMIT_REACHED: 'AQUARIUM_3002',
  INVALID_WATER_TYPE: 'AQUARIUM_3003',
  
  // Event errors (4xxx)
  EVENT_NOT_FOUND: 'EVENT_4001',
  INVALID_EVENT_TYPE: 'EVENT_4002',
  EVENT_ALREADY_COMPLETED: 'EVENT_4003',
  
  // Subscription errors (5xxx)
  SUBSCRIPTION_REQUIRED: 'SUB_5001',
  FEATURE_NOT_AVAILABLE: 'SUB_5002',
  PAYMENT_FAILED: 'SUB_5003',
  
  // Validation errors (6xxx)
  VALIDATION_ERROR: 'VAL_6001',
  INVALID_INPUT: 'VAL_6002',
  MISSING_REQUIRED_FIELD: 'VAL_6003',
  INVALID_FORMAT: 'VAL_6004',
  
  // System errors (9xxx)
  INTERNAL_SERVER_ERROR: 'SYS_9001',
  SERVICE_UNAVAILABLE: 'SYS_9002',
  DATABASE_ERROR: 'SYS_9003',
  EXTERNAL_SERVICE_ERROR: 'SYS_9004',
  RATE_LIMIT_EXCEEDED: 'SYS_9005',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email address',
  [ERROR_CODES.ACCOUNT_DISABLED]: 'Your account has been disabled',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired',
  
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.USER_ALREADY_EXISTS]: 'User already exists',
  [ERROR_CODES.EMAIL_ALREADY_IN_USE]: 'Email address is already in use',
  [ERROR_CODES.USERNAME_ALREADY_TAKEN]: 'Username is already taken',
  [ERROR_CODES.INVALID_PASSWORD]: 'Password does not meet requirements',
  
  [ERROR_CODES.AQUARIUM_NOT_FOUND]: 'Aquarium not found',
  [ERROR_CODES.AQUARIUM_LIMIT_REACHED]: 'You have reached your aquarium limit',
  [ERROR_CODES.INVALID_WATER_TYPE]: 'Invalid water type specified',
  
  [ERROR_CODES.EVENT_NOT_FOUND]: 'Event not found',
  [ERROR_CODES.INVALID_EVENT_TYPE]: 'Invalid event type',
  [ERROR_CODES.EVENT_ALREADY_COMPLETED]: 'Event has already been completed',
  
  [ERROR_CODES.SUBSCRIPTION_REQUIRED]: 'Premium subscription required',
  [ERROR_CODES.FEATURE_NOT_AVAILABLE]: 'This feature is not available in your subscription',
  [ERROR_CODES.PAYMENT_FAILED]: 'Payment processing failed',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Missing required field',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid format',
  
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests, please try again later',
} as const;