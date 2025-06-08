import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

// Business Logic Exceptions
export class BusinessRuleViolationException extends BaseException {
  constructor(message: string, details?: any, correlationId?: string) {
    super('BUSINESS_RULE_VIOLATION', message, HttpStatus.UNPROCESSABLE_ENTITY, details, correlationId);
  }
}

export class ResourceNotFoundException extends BaseException {
  constructor(resource: string, id?: string, correlationId?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super('RESOURCE_NOT_FOUND', message, HttpStatus.NOT_FOUND, { resource, id }, correlationId);
  }
}

export class DuplicateResourceException extends BaseException {
  constructor(resource: string, field: string, value: string, correlationId?: string) {
    super(
      'DUPLICATE_RESOURCE',
      `${resource} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
      { resource, field, value },
      correlationId,
    );
  }
}

export class InvalidOperationException extends BaseException {
  constructor(operation: string, reason: string, correlationId?: string) {
    super(
      'INVALID_OPERATION',
      `Cannot perform '${operation}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      { operation, reason },
      correlationId,
    );
  }
}

// Validation Exceptions
export class ValidationException extends BaseException {
  constructor(errors: any[], correlationId?: string) {
    super(
      'VALIDATION_ERROR',
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      { errors },
      correlationId,
    );
  }
}

export class InvalidInputException extends BaseException {
  constructor(field: string, value: any, reason: string, correlationId?: string) {
    super(
      'INVALID_INPUT',
      `Invalid value for field '${field}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      { field, value, reason },
      correlationId,
    );
  }
}

// Authorization Exceptions
export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized', correlationId?: string) {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED, undefined, correlationId);
  }
}

export class ForbiddenException extends BaseException {
  constructor(resource?: string, action?: string, correlationId?: string) {
    const message = resource && action
      ? `You don't have permission to ${action} ${resource}`
      : 'You don\'t have permission to access this resource';
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN, { resource, action }, correlationId);
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(requiredPermissions: string[], correlationId?: string) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions to perform this action',
      HttpStatus.FORBIDDEN,
      { requiredPermissions },
      correlationId,
    );
  }
}

// Rate Limiting Exceptions
export class RateLimitExceededException extends BaseException {
  constructor(limit: number, window: string, correlationId?: string) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded: ${limit} requests per ${window}`,
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, window },
      correlationId,
    );
  }
}

// External Service Exceptions
export class ExternalServiceException extends BaseException {
  constructor(service: string, operation: string, error?: any, correlationId?: string) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `External service error: ${service} failed during ${operation}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { service, operation, error },
      correlationId,
    );
  }
}

export class TimeoutException extends BaseException {
  constructor(operation: string, timeout: number, correlationId?: string) {
    super(
      'OPERATION_TIMEOUT',
      `Operation '${operation}' timed out after ${timeout}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      { operation, timeout },
      correlationId,
    );
  }
}

// Payment Exceptions
export class PaymentFailedException extends BaseException {
  constructor(reason: string, paymentId?: string, correlationId?: string) {
    super(
      'PAYMENT_FAILED',
      `Payment failed: ${reason}`,
      HttpStatus.PAYMENT_REQUIRED,
      { reason, paymentId },
      correlationId,
    );
  }
}

export class SubscriptionLimitExceededException extends BaseException {
  constructor(resource: string, limit: number, current: number, correlationId?: string) {
    super(
      'SUBSCRIPTION_LIMIT_EXCEEDED',
      `Subscription limit exceeded for ${resource}: ${current}/${limit}`,
      HttpStatus.FORBIDDEN,
      { resource, limit, current },
      correlationId,
    );
  }
}

// File/Media Exceptions
export class InvalidFileException extends BaseException {
  constructor(reason: string, filename?: string, correlationId?: string) {
    super(
      'INVALID_FILE',
      `Invalid file: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { reason, filename },
      correlationId,
    );
  }
}

export class FileSizeLimitExceededException extends BaseException {
  constructor(maxSize: number, actualSize: number, correlationId?: string) {
    super(
      'FILE_SIZE_LIMIT_EXCEEDED',
      `File size exceeds limit: ${actualSize} bytes (max: ${maxSize} bytes)`,
      HttpStatus.PAYLOAD_TOO_LARGE,
      { maxSize, actualSize },
      correlationId,
    );
  }
}