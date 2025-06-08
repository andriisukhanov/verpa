import { BaseException } from './base.exception';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants';

export class NotFoundException extends BaseException {
  constructor(
    resource: string,
    identifier?: string | Record<string, unknown>,
    customMessage?: string
  ) {
    const details = typeof identifier === 'string' 
      ? { id: identifier }
      : identifier;
    
    const message = customMessage || `${resource} not found`;
    
    super(ERROR_CODES.USER_NOT_FOUND, message, 404, details);
  }
}

export class DuplicateException extends BaseException {
  constructor(
    resource: string,
    field: string,
    value?: unknown
  ) {
    const message = `${resource} with this ${field} already exists`;
    const details = { field, value };
    
    super(ERROR_CODES.USER_ALREADY_EXISTS, message, 409, details);
  }
}

export class LimitExceededException extends BaseException {
  constructor(
    resource: string,
    limit: number,
    current?: number
  ) {
    const message = `${resource} limit exceeded. Maximum allowed: ${limit}`;
    const details = { resource, limit, current };
    
    super(ERROR_CODES.AQUARIUM_LIMIT_REACHED, message, 403, details);
  }
}

export class SubscriptionRequiredException extends BaseException {
  constructor(
    feature: string,
    requiredPlan?: string
  ) {
    const message = requiredPlan 
      ? `${feature} requires ${requiredPlan} subscription`
      : `${feature} requires a premium subscription`;
    
    const details = { feature, requiredPlan };
    
    super(ERROR_CODES.SUBSCRIPTION_REQUIRED, message, 403, details);
  }
}

export class InvalidOperationException extends BaseException {
  constructor(
    operation: string,
    reason: string,
    details?: Record<string, unknown>
  ) {
    const message = `Cannot ${operation}: ${reason}`;
    
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }
}

export class ResourceConflictException extends BaseException {
  constructor(
    resource: string,
    operation: string,
    reason: string,
    details?: Record<string, unknown>
  ) {
    const message = `Cannot ${operation} ${resource}: ${reason}`;
    
    super(ERROR_CODES.VALIDATION_ERROR, message, 409, details);
  }
}

export class ExternalServiceException extends BaseException {
  constructor(
    service: string,
    operation: string,
    originalError?: unknown
  ) {
    const message = `External service error: ${service} failed during ${operation}`;
    const details = {
      service,
      operation,
      error: originalError instanceof Error ? originalError.message : String(originalError),
    };
    
    super(ERROR_CODES.EXTERNAL_SERVICE_ERROR, message, 503, details);
  }
}

export class DatabaseException extends BaseException {
  constructor(
    operation: string,
    collection?: string,
    originalError?: unknown
  ) {
    const message = `Database error during ${operation}`;
    const details = {
      operation,
      collection,
      error: originalError instanceof Error ? originalError.message : String(originalError),
    };
    
    super(ERROR_CODES.DATABASE_ERROR, message, 500, details);
  }
}

export class PaymentException extends BaseException {
  constructor(
    operation: string,
    reason: string,
    paymentDetails?: Record<string, unknown>
  ) {
    const message = `Payment failed: ${reason}`;
    const details = {
      operation,
      ...paymentDetails,
    };
    
    super(ERROR_CODES.PAYMENT_FAILED, message, 402, details);
  }
}

export class RateLimitException extends BaseException {
  constructor(
    resource: string,
    limit: number,
    window: string,
    retryAfter?: number
  ) {
    const message = ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED];
    const details = {
      resource,
      limit,
      window,
      retryAfter,
    };
    
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429, details);
  }
}