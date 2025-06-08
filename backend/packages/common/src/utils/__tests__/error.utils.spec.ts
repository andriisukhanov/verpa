import { ErrorUtils } from '../error.utils';
import { ERROR_CODES, ERROR_MESSAGES } from '../../constants';

describe('ErrorUtils', () => {
  describe('createApiError', () => {
    it('should create API error with code and message', () => {
      const error = ErrorUtils.createApiError(
        ERROR_CODES.USER_NOT_FOUND,
        'Custom message'
      );
      
      expect(error.code).toBe(ERROR_CODES.USER_NOT_FOUND);
      expect(error.message).toBe('Custom message');
      expect(error.details).toBeUndefined();
    });

    it('should use default message from constants', () => {
      const error = ErrorUtils.createApiError(ERROR_CODES.USER_NOT_FOUND);
      
      expect(error.message).toBe(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = ErrorUtils.createApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        details
      );
      
      expect(error.details).toEqual(details);
    });

    it('should handle unknown error codes', () => {
      const error = ErrorUtils.createApiError('UNKNOWN_CODE');
      
      expect(error.code).toBe('UNKNOWN_CODE');
      expect(error.message).toBe('An error occurred');
    });
  });

  describe('isKnownError', () => {
    it('should identify known error codes', () => {
      expect(ErrorUtils.isKnownError(ERROR_CODES.USER_NOT_FOUND)).toBe(true);
      expect(ErrorUtils.isKnownError(ERROR_CODES.INVALID_CREDENTIALS)).toBe(true);
      expect(ErrorUtils.isKnownError(ERROR_CODES.INTERNAL_SERVER_ERROR)).toBe(true);
    });

    it('should identify unknown error codes', () => {
      expect(ErrorUtils.isKnownError('UNKNOWN_ERROR')).toBe(false);
      expect(ErrorUtils.isKnownError('')).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for known error codes', () => {
      expect(ErrorUtils.getErrorMessage(ERROR_CODES.USER_NOT_FOUND)).toBe(
        ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]
      );
    });

    it('should return default message for unknown codes', () => {
      expect(ErrorUtils.getErrorMessage('UNKNOWN')).toBe('Unknown error');
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from Error instance', () => {
      const error = new Error('Test error');
      const details = ErrorUtils.extractErrorDetails(error);
      
      expect(details.message).toBe('Test error');
      expect(details.stack).toBeDefined();
      expect(details.stack).toContain('Test error');
    });

    it('should handle string errors', () => {
      const details = ErrorUtils.extractErrorDetails('String error');
      
      expect(details.message).toBe('String error');
      expect(details.stack).toBeUndefined();
    });

    it('should handle object errors', () => {
      const error = {
        message: 'Object error',
        code: 'ERROR_CODE',
        extra: 'data',
      };
      
      const details = ErrorUtils.extractErrorDetails(error);
      
      expect(details.message).toBe('Object error');
      expect(details.details).toEqual(error);
    });

    it('should handle null/undefined errors', () => {
      expect(ErrorUtils.extractErrorDetails(null).message).toBe('Unknown error');
      expect(ErrorUtils.extractErrorDetails(undefined).message).toBe('Unknown error');
    });

    it('should handle objects without message', () => {
      const error = { code: 'ERROR', data: 'test' };
      const details = ErrorUtils.extractErrorDetails(error);
      
      expect(details.message).toBe('Unknown error');
      expect(details.details).toEqual(error);
    });
  });

  describe('sanitizeErrorForClient', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include basic error info in production', () => {
      process.env.NODE_ENV = 'production';
      
      const error = {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
        details: { userId: '123' },
        stack: 'Error stack trace',
      };
      
      const sanitized = ErrorUtils.sanitizeErrorForClient(error);
      
      expect(sanitized.code).toBe(error.code);
      expect(sanitized.message).toBe(error.message);
      expect(sanitized.details).toBeUndefined();
      expect((sanitized as any).stack).toBeUndefined();
    });

    it('should include details in non-production', () => {
      process.env.NODE_ENV = 'development';
      
      const error = {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'email' },
      };
      
      const sanitized = ErrorUtils.sanitizeErrorForClient(error);
      
      expect(sanitized.details).toEqual(error.details);
    });

    it('should always remove stack traces', () => {
      process.env.NODE_ENV = 'development';
      
      const error = {
        code: 'ERROR',
        message: 'Error message',
        stack: 'Stack trace',
      };
      
      const sanitized = ErrorUtils.sanitizeErrorForClient(error);
      
      expect((sanitized as any).stack).toBeUndefined();
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors by code', () => {
      expect(ErrorUtils.isValidationError({
        code: ERROR_CODES.VALIDATION_ERROR,
      })).toBe(true);
    });

    it('should identify validation errors by name', () => {
      expect(ErrorUtils.isValidationError({
        name: 'ValidationError',
      })).toBe(true);
    });

    it('should return false for non-validation errors', () => {
      expect(ErrorUtils.isValidationError({
        code: ERROR_CODES.USER_NOT_FOUND,
      })).toBe(false);
      
      expect(ErrorUtils.isValidationError({
        name: 'TypeError',
      })).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(ErrorUtils.isValidationError(null)).toBe(false);
      expect(ErrorUtils.isValidationError('string')).toBe(false);
      expect(ErrorUtils.isValidationError(undefined)).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should identify authentication errors', () => {
      const authCodes = [
        ERROR_CODES.INVALID_CREDENTIALS,
        ERROR_CODES.TOKEN_EXPIRED,
        ERROR_CODES.UNAUTHORIZED,
      ];

      authCodes.forEach((code) => {
        expect(ErrorUtils.isAuthenticationError({ code })).toBe(true);
      });
    });

    it('should return false for non-auth errors', () => {
      expect(ErrorUtils.isAuthenticationError({
        code: ERROR_CODES.USER_NOT_FOUND,
      })).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(ErrorUtils.isAuthenticationError(null)).toBe(false);
      expect(ErrorUtils.isAuthenticationError('string')).toBe(false);
    });
  });

  describe('isSystemError', () => {
    it('should identify system errors', () => {
      const systemCodes = [
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        ERROR_CODES.DATABASE_ERROR,
      ];

      systemCodes.forEach((code) => {
        expect(ErrorUtils.isSystemError({ code })).toBe(true);
      });
    });

    it('should return false for non-system errors', () => {
      expect(ErrorUtils.isSystemError({
        code: ERROR_CODES.USER_NOT_FOUND,
      })).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(ErrorUtils.isSystemError(null)).toBe(false);
      expect(ErrorUtils.isSystemError('string')).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('should wrap Error instance', () => {
      const originalError = new Error('Original error');
      const wrapped = ErrorUtils.wrapError(
        originalError,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Wrapped error message'
      );
      
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Wrapped error message');
      expect((wrapped as any).code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect((wrapped as any).originalError).toBe(originalError);
    });

    it('should use original message if not provided', () => {
      const originalError = new Error('Original message');
      const wrapped = ErrorUtils.wrapError(
        originalError,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
      
      expect(wrapped.message).toBe('Original message');
    });

    it('should wrap string errors', () => {
      const wrapped = ErrorUtils.wrapError(
        'String error',
        ERROR_CODES.VALIDATION_ERROR
      );
      
      expect(wrapped.message).toBe('String error');
      expect((wrapped as any).code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should wrap object errors', () => {
      const originalError = {
        message: 'Object error',
        data: 'test',
      };
      
      const wrapped = ErrorUtils.wrapError(
        originalError,
        ERROR_CODES.VALIDATION_ERROR
      );
      
      expect(wrapped.message).toBe('Object error');
      expect((wrapped as any).details).toEqual(originalError);
    });
  });
});