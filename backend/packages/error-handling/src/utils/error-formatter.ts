import { HttpStatus } from '@nestjs/common';

export interface FormattedError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  path?: string;
  method?: string;
  correlationId?: string;
  statusCode: number;
}

export class ErrorFormatter {
  static format(
    error: any,
    context?: {
      path?: string;
      method?: string;
      correlationId?: string;
    },
  ): FormattedError {
    const timestamp = new Date();
    const baseError: FormattedError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      timestamp,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...context,
    };

    if (!error) {
      return baseError;
    }

    // Handle different error types
    if (error.code && error.message) {
      return {
        ...baseError,
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode || error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    if (error instanceof Error) {
      return {
        ...baseError,
        code: error.name || 'ERROR',
        message: error.message,
        details: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      };
    }

    if (typeof error === 'string') {
      return {
        ...baseError,
        message: error,
      };
    }

    return {
      ...baseError,
      details: error,
    };
  }

  static toJSON(error: FormattedError): string {
    return JSON.stringify(error, null, 2);
  }

  static toUserFriendly(error: FormattedError): string {
    const userFriendlyMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      UNAUTHORIZED: 'Please log in to continue.',
      FORBIDDEN: 'You don\'t have permission to perform this action.',
      RESOURCE_NOT_FOUND: 'The requested item could not be found.',
      DUPLICATE_RESOURCE: 'This item already exists.',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
      PAYMENT_FAILED: 'Payment could not be processed. Please check your payment details.',
      SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
      INTERNAL_ERROR: 'Something went wrong. Please try again later.',
    };

    return userFriendlyMessages[error.code] || error.message || 'An error occurred. Please try again.';
  }

  static getHttpStatus(errorCode: string): HttpStatus {
    const statusMap: Record<string, HttpStatus> = {
      VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
      INVALID_INPUT: HttpStatus.BAD_REQUEST,
      INVALID_OPERATION: HttpStatus.BAD_REQUEST,
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      FORBIDDEN: HttpStatus.FORBIDDEN,
      INSUFFICIENT_PERMISSIONS: HttpStatus.FORBIDDEN,
      RESOURCE_NOT_FOUND: HttpStatus.NOT_FOUND,
      DUPLICATE_RESOURCE: HttpStatus.CONFLICT,
      RATE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
      PAYMENT_FAILED: HttpStatus.PAYMENT_REQUIRED,
      OPERATION_TIMEOUT: HttpStatus.REQUEST_TIMEOUT,
      SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
      EXTERNAL_SERVICE_ERROR: HttpStatus.SERVICE_UNAVAILABLE,
      CIRCUIT_BREAKER_OPEN: HttpStatus.SERVICE_UNAVAILABLE,
      INTEGRATION_ERROR: HttpStatus.BAD_GATEWAY,
      FILE_SIZE_LIMIT_EXCEEDED: HttpStatus.PAYLOAD_TOO_LARGE,
    };

    return statusMap[errorCode] || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}