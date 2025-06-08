import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

// System Exceptions
export class SystemException extends BaseException {
  constructor(message: string, details?: any, correlationId?: string) {
    super('SYSTEM_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, details, correlationId);
  }
}

export class DatabaseException extends BaseException {
  constructor(operation: string, error: any, correlationId?: string) {
    super(
      'DATABASE_ERROR',
      `Database error during ${operation}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, error: error.message || error },
      correlationId,
    );
  }
}

export class ConfigurationException extends BaseException {
  constructor(config: string, reason: string, correlationId?: string) {
    super(
      'CONFIGURATION_ERROR',
      `Configuration error for '${config}': ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { config, reason },
      correlationId,
    );
  }
}

export class ServiceUnavailableException extends BaseException {
  constructor(service: string, reason?: string, correlationId?: string) {
    super(
      'SERVICE_UNAVAILABLE',
      `Service '${service}' is currently unavailable${reason ? `: ${reason}` : ''}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { service, reason },
      correlationId,
    );
  }
}

// Integration Exceptions
export class IntegrationException extends BaseException {
  constructor(integration: string, operation: string, error: any, correlationId?: string) {
    super(
      'INTEGRATION_ERROR',
      `Integration error with ${integration} during ${operation}`,
      HttpStatus.BAD_GATEWAY,
      { integration, operation, error: error.message || error },
      correlationId,
    );
  }
}

export class MessageQueueException extends BaseException {
  constructor(queue: string, operation: string, error: any, correlationId?: string) {
    super(
      'MESSAGE_QUEUE_ERROR',
      `Message queue error in ${queue} during ${operation}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { queue, operation, error: error.message || error },
      correlationId,
    );
  }
}

// Cache Exceptions
export class CacheException extends BaseException {
  constructor(operation: string, key?: string, error?: any, correlationId?: string) {
    super(
      'CACHE_ERROR',
      `Cache error during ${operation}${key ? ` for key '${key}'` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, key, error: error?.message || error },
      correlationId,
    );
  }
}

// Circuit Breaker Exception
export class CircuitBreakerOpenException extends BaseException {
  constructor(service: string, correlationId?: string) {
    super(
      'CIRCUIT_BREAKER_OPEN',
      `Circuit breaker is open for service '${service}'`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { service },
      correlationId,
    );
  }
}