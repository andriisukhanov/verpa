import { IApiError } from '../interfaces';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants';

export class ErrorUtils {
  static createApiError(
    code: string,
    message?: string,
    details?: Record<string, unknown>
  ): IApiError {
    const apiError: IApiError = {
      code,
      message: message || (ERROR_MESSAGES as any)[code] || 'An error occurred',
    };
    if (details) {
      apiError.details = details;
    }
    return apiError;
  }

  static isKnownError(code: string): boolean {
    return Object.values(ERROR_CODES).includes(code as any);
  }

  static getErrorMessage(code: string): string {
    return (ERROR_MESSAGES as any)[code] || 'Unknown error';
  }

  static extractErrorDetails(error: unknown): {
    message: string;
    stack?: string;
    details?: Record<string, unknown>;
  } {
    if (error instanceof Error) {
      const result: {
        message: string;
        stack?: string;
        details?: Record<string, unknown>;
      } = {
        message: error.message,
      };
      if (error.stack) {
        result.stack = error.stack;
      }
      return result;
    }
    
    if (typeof error === 'string') {
      return { message: error };
    }
    
    if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      return {
        message: (obj['message'] as string) || 'Unknown error',
        details: obj,
      };
    }
    
    return { message: 'Unknown error' };
  }

  static sanitizeErrorForClient(error: IApiError): IApiError {
    const sanitized: IApiError = {
      code: error.code,
      message: error.message,
    };
    
    // Only include details in non-production environments
    if (process.env['NODE_ENV'] !== 'production' && error.details) {
      sanitized.details = error.details;
    }
    
    // Never send stack traces to client
    delete (sanitized as any).stack;
    
    return sanitized;
  }

  static isValidationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const err = error as Record<string, unknown>;
    return err['code'] === ERROR_CODES.VALIDATION_ERROR || err['name'] === 'ValidationError';
  }

  static isAuthenticationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const err = error as Record<string, unknown>;
    const authCodes = Object.values(ERROR_CODES).filter((code) => code.startsWith('AUTH_'));
    return authCodes.includes(err['code'] as any);
  }

  static isSystemError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const err = error as Record<string, unknown>;
    const systemCodes = Object.values(ERROR_CODES).filter((code) => code.startsWith('SYS_'));
    return systemCodes.includes(err['code'] as any);
  }

  static wrapError(error: unknown, code: string, message?: string): Error {
    const details = this.extractErrorDetails(error);
    const wrappedError = new Error(message || details.message);
    
    (wrappedError as any).code = code;
    (wrappedError as any).originalError = error;
    (wrappedError as any).details = details.details;
    
    return wrappedError;
  }
}