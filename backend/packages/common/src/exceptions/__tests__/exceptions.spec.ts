import {
  BaseException,
  NotFoundException,
  DuplicateException,
  LimitExceededException,
  SubscriptionRequiredException,
  InvalidOperationException,
  ResourceConflictException,
  ExternalServiceException,
  DatabaseException,
  PaymentException,
  RateLimitException,
  ValidationException,
  RequiredFieldException,
  InvalidFormatException,
  OutOfRangeException,
  InvalidEnumValueException,
  UnauthorizedException,
  InvalidCredentialsException,
  TokenExpiredException,
  InvalidTokenException,
  EmailNotVerifiedException,
  AccountDisabledException,
  SessionExpiredException,
  InsufficientPermissionsException,
  TooManyAttemptsException,
} from '../index';
import { ERROR_CODES } from '../../constants';

describe('Exceptions', () => {
  describe('BaseException', () => {
    class TestException extends BaseException {
      constructor() {
        super('TEST_CODE', 'Test message', 400, { test: true });
      }
    }

    it('should create exception with all properties', () => {
      const exception = new TestException();
      
      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(BaseException);
      expect(exception.name).toBe('TestException');
      expect(exception.code).toBe('TEST_CODE');
      expect(exception.message).toBe('Test message');
      expect(exception.statusCode).toBe(400);
      expect(exception.details).toEqual({ test: true });
      expect(exception.stack).toBeDefined();
    });

    it('should convert to API error', () => {
      const exception = new TestException();
      const apiError = exception.toApiError();
      
      expect(apiError).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        details: { test: true },
      });
    });

    it('should convert to JSON', () => {
      const exception = new TestException();
      const json = exception.toJSON();
      
      expect(json).toEqual({
        name: 'TestException',
        code: 'TEST_CODE',
        message: 'Test message',
        statusCode: 400,
        details: { test: true },
      });
    });
  });

  describe('NotFoundException', () => {
    it('should create with resource and string identifier', () => {
      const exception = new NotFoundException('User', '123');
      
      expect(exception.message).toBe('User not found');
      expect(exception.statusCode).toBe(404);
      expect(exception.details).toEqual({ id: '123' });
    });

    it('should create with resource and object identifier', () => {
      const exception = new NotFoundException('Aquarium', { userId: '123', name: 'Tank' });
      
      expect(exception.details).toEqual({ userId: '123', name: 'Tank' });
    });

    it('should use custom message', () => {
      const exception = new NotFoundException('User', '123', 'Custom not found message');
      
      expect(exception.message).toBe('Custom not found message');
    });
  });

  describe('DuplicateException', () => {
    it('should create duplicate exception', () => {
      const exception = new DuplicateException('User', 'email', 'test@example.com');
      
      expect(exception.message).toBe('User with this email already exists');
      expect(exception.statusCode).toBe(409);
      expect(exception.details).toEqual({
        field: 'email',
        value: 'test@example.com',
      });
    });
  });

  describe('LimitExceededException', () => {
    it('should create limit exceeded exception', () => {
      const exception = new LimitExceededException('Aquarium', 5, 6);
      
      expect(exception.message).toBe('Aquarium limit exceeded. Maximum allowed: 5');
      expect(exception.statusCode).toBe(403);
      expect(exception.details).toEqual({
        resource: 'Aquarium',
        limit: 5,
        current: 6,
      });
    });
  });

  describe('SubscriptionRequiredException', () => {
    it('should create subscription required exception', () => {
      const exception = new SubscriptionRequiredException('API Access', 'Premium');
      
      expect(exception.message).toBe('API Access requires Premium subscription');
      expect(exception.statusCode).toBe(403);
      expect(exception.details).toEqual({
        feature: 'API Access',
        requiredPlan: 'Premium',
      });
    });

    it('should create without specific plan', () => {
      const exception = new SubscriptionRequiredException('Advanced Analytics');
      
      expect(exception.message).toBe('Advanced Analytics requires a premium subscription');
    });
  });

  describe('ValidationException', () => {
    it('should create with single error', () => {
      const error = {
        field: 'email',
        message: 'Invalid email format',
        value: 'not-an-email',
      };
      
      const exception = new ValidationException(error);
      
      expect(exception.message).toBe('Invalid email format');
      expect(exception.errors).toHaveLength(1);
      expect(exception.errors[0]).toEqual(error);
    });

    it('should create with multiple errors', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' },
      ];
      
      const exception = new ValidationException(errors);
      
      expect(exception.message).toBe('Validation failed for fields: email, password');
      expect(exception.errors).toHaveLength(2);
    });

    it('should create from field error', () => {
      const exception = ValidationException.fromFieldError(
        'username',
        'Username already taken',
        'john123',
        { unique: 'true' }
      );
      
      expect(exception.errors).toHaveLength(1);
      expect(exception.errors[0]).toEqual({
        field: 'username',
        message: 'Username already taken',
        value: 'john123',
        constraints: { unique: 'true' },
      });
    });

    it('should add errors', () => {
      const exception = new ValidationException([]);
      
      exception.addError({
        field: 'email',
        message: 'Email is required',
      });
      
      expect(exception.errors).toHaveLength(1);
    });

    it('should check and get errors by field', () => {
      const exception = new ValidationException([
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ]);
      
      expect(exception.hasError('email')).toBe(true);
      expect(exception.hasError('username')).toBe(false);
      
      const emailError = exception.getError('email');
      expect(emailError?.message).toBe('Invalid email');
      
      expect(exception.getError('username')).toBeUndefined();
    });
  });

  describe('RequiredFieldException', () => {
    it('should create required field exception', () => {
      const exception = new RequiredFieldException('email');
      
      expect(exception.message).toBe('email is required');
      expect(exception.errors[0].constraints).toEqual({ required: 'true' });
    });
  });

  describe('InvalidFormatException', () => {
    it('should create invalid format exception', () => {
      const exception = new InvalidFormatException('date', 'YYYY-MM-DD', '15/01/2024');
      
      expect(exception.message).toBe('date has invalid format. Expected: YYYY-MM-DD');
      expect(exception.errors[0].value).toBe('15/01/2024');
      expect(exception.errors[0].constraints).toEqual({ format: 'YYYY-MM-DD' });
    });
  });

  describe('OutOfRangeException', () => {
    it('should create with min and max', () => {
      const exception = new OutOfRangeException('age', 18, 65, 75);
      
      expect(exception.message).toBe('age must be between 18 and 65');
      expect(exception.errors[0].constraints).toEqual({
        min: '18',
        max: '65',
      });
    });

    it('should create with only min', () => {
      const exception = new OutOfRangeException('volume', 1);
      
      expect(exception.message).toBe('volume must be at least 1');
      expect(exception.errors[0].constraints).toEqual({ min: '1' });
    });

    it('should create with only max', () => {
      const exception = new OutOfRangeException('count', undefined, 100);
      
      expect(exception.message).toBe('count must be at most 100');
      expect(exception.errors[0].constraints).toEqual({ max: '100' });
    });
  });

  describe('InvalidEnumValueException', () => {
    it('should create invalid enum exception', () => {
      const exception = new InvalidEnumValueException(
        'status',
        ['active', 'inactive', 'pending'],
        'deleted'
      );
      
      expect(exception.message).toBe('status must be one of: active, inactive, pending');
      expect(exception.errors[0].value).toBe('deleted');
      expect(exception.errors[0].constraints).toEqual({
        enum: 'active,inactive,pending',
      });
    });
  });

  describe('Authentication Exceptions', () => {
    it('should create UnauthorizedException', () => {
      const exception = new UnauthorizedException();
      
      expect(exception.statusCode).toBe(401);
      expect(exception.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('should create InvalidCredentialsException', () => {
      const exception = new InvalidCredentialsException({ attempts: 3 });
      
      expect(exception.statusCode).toBe(401);
      expect(exception.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
      expect(exception.details).toEqual({ attempts: 3 });
    });

    it('should create TokenExpiredException', () => {
      const exception = new TokenExpiredException('Refresh');
      
      expect(exception.message).toBe('Refresh token has expired');
      expect(exception.statusCode).toBe(401);
      expect(exception.details).toEqual({ tokenType: 'Refresh' });
    });

    it('should create InvalidTokenException', () => {
      const exception = new InvalidTokenException('Access', 'Malformed token');
      
      expect(exception.message).toBe('Invalid Access token: Malformed token');
      expect(exception.details).toEqual({
        tokenType: 'Access',
        reason: 'Malformed token',
      });
    });

    it('should create EmailNotVerifiedException', () => {
      const exception = new EmailNotVerifiedException('test@example.com');
      
      expect(exception.statusCode).toBe(403);
      expect(exception.details).toEqual({ email: 'test@example.com' });
    });

    it('should create AccountDisabledException', () => {
      const disabledAt = new Date();
      const exception = new AccountDisabledException('Terms violation', disabledAt);
      
      expect(exception.statusCode).toBe(403);
      expect(exception.details).toEqual({
        reason: 'Terms violation',
        disabledAt,
      });
    });

    it('should create SessionExpiredException', () => {
      const expiredAt = new Date();
      const exception = new SessionExpiredException('session123', expiredAt);
      
      expect(exception.statusCode).toBe(401);
      expect(exception.details).toEqual({
        sessionId: 'session123',
        expiredAt,
      });
    });

    it('should create InsufficientPermissionsException', () => {
      const exception = new InsufficientPermissionsException(
        'admin',
        'user',
        'settings'
      );
      
      expect(exception.message).toBe('Insufficient permissions. Required: admin');
      expect(exception.statusCode).toBe(403);
      expect(exception.details).toEqual({
        requiredPermission: 'admin',
        userRole: 'user',
        resource: 'settings',
      });
    });

    it('should create TooManyAttemptsException', () => {
      const exception = new TooManyAttemptsException('login', 5, 900000);
      
      expect(exception.message).toBe('Too many login attempts. Maximum allowed: 5');
      expect(exception.statusCode).toBe(429);
      expect(exception.details).toEqual({
        resource: 'login',
        maxAttempts: 5,
        retryAfter: 900000,
        retryAfterSeconds: 900,
      });
    });
  });

  describe('Business Exceptions', () => {
    it('should create ExternalServiceException', () => {
      const originalError = new Error('Connection timeout');
      const exception = new ExternalServiceException('AWS S3', 'upload', originalError);
      
      expect(exception.message).toBe('External service error: AWS S3 failed during upload');
      expect(exception.statusCode).toBe(503);
      expect(exception.details).toEqual({
        service: 'AWS S3',
        operation: 'upload',
        error: 'Connection timeout',
      });
    });

    it('should create DatabaseException', () => {
      const exception = new DatabaseException('insert', 'users', new Error('Duplicate key'));
      
      expect(exception.message).toBe('Database error during insert');
      expect(exception.statusCode).toBe(500);
      expect(exception.details?.collection).toBe('users');
    });

    it('should create PaymentException', () => {
      const exception = new PaymentException(
        'subscription',
        'Card declined',
        { cardLast4: '1234', amount: 9.99 }
      );
      
      expect(exception.message).toBe('Payment failed: Card declined');
      expect(exception.statusCode).toBe(402);
      expect(exception.details).toEqual({
        operation: 'subscription',
        cardLast4: '1234',
        amount: 9.99,
      });
    });

    it('should create RateLimitException', () => {
      const exception = new RateLimitException('API', 100, '1 hour', 3600);
      
      expect(exception.statusCode).toBe(429);
      expect(exception.details).toEqual({
        resource: 'API',
        limit: 100,
        window: '1 hour',
        retryAfter: 3600,
      });
    });
  });
});