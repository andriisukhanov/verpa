export const LOGGING_CONFIG = Symbol('LOGGING_CONFIG');
export const WINSTON_MODULE_PROVIDER = 'winston';

export const DEFAULT_LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

export const DEFAULT_REDACT_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'creditCard',
  'credit_card',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
];