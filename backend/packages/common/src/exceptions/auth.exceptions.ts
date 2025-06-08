import { BaseException } from './base.exception';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants';

export class UnauthorizedException extends BaseException {
  constructor(message?: string, details?: Record<string, unknown>) {
    super(
      ERROR_CODES.UNAUTHORIZED,
      message || ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
      401,
      details
    );
  }
}

export class InvalidCredentialsException extends BaseException {
  constructor(details?: Record<string, unknown>) {
    super(
      ERROR_CODES.INVALID_CREDENTIALS,
      ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS],
      401,
      details
    );
  }
}

export class TokenExpiredException extends BaseException {
  constructor(tokenType: string = 'Authentication') {
    super(
      ERROR_CODES.TOKEN_EXPIRED,
      `${tokenType} token has expired`,
      401,
      { tokenType }
    );
  }
}

export class InvalidTokenException extends BaseException {
  constructor(tokenType: string = 'Authentication', reason?: string) {
    const message = reason 
      ? `Invalid ${tokenType} token: ${reason}`
      : `Invalid ${tokenType} token`;
    
    super(
      ERROR_CODES.TOKEN_INVALID,
      message,
      401,
      { tokenType, reason }
    );
  }
}

export class EmailNotVerifiedException extends BaseException {
  constructor(email?: string) {
    super(
      ERROR_CODES.EMAIL_NOT_VERIFIED,
      ERROR_MESSAGES[ERROR_CODES.EMAIL_NOT_VERIFIED],
      403,
      email ? { email } : undefined
    );
  }
}

export class AccountDisabledException extends BaseException {
  constructor(reason?: string, disabledAt?: Date) {
    const details: Record<string, unknown> = {};
    if (reason) details.reason = reason;
    if (disabledAt) details.disabledAt = disabledAt;
    
    super(
      ERROR_CODES.ACCOUNT_DISABLED,
      ERROR_MESSAGES[ERROR_CODES.ACCOUNT_DISABLED],
      403,
      details
    );
  }
}

export class SessionExpiredException extends BaseException {
  constructor(sessionId?: string, expiredAt?: Date) {
    const details: Record<string, unknown> = {};
    if (sessionId) details.sessionId = sessionId;
    if (expiredAt) details.expiredAt = expiredAt;
    
    super(
      ERROR_CODES.SESSION_EXPIRED,
      ERROR_MESSAGES[ERROR_CODES.SESSION_EXPIRED],
      401,
      details
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(
    requiredPermission: string,
    userRole?: string,
    resource?: string
  ) {
    const message = `Insufficient permissions. Required: ${requiredPermission}`;
    const details: Record<string, unknown> = {
      requiredPermission,
    };
    
    if (userRole) details.userRole = userRole;
    if (resource) details.resource = resource;
    
    super(ERROR_CODES.UNAUTHORIZED, message, 403, details);
  }
}

export class TooManyAttemptsException extends BaseException {
  constructor(
    resource: string,
    maxAttempts: number,
    retryAfter?: number
  ) {
    const message = `Too many ${resource} attempts. Maximum allowed: ${maxAttempts}`;
    const details: Record<string, unknown> = {
      resource,
      maxAttempts,
    };
    
    if (retryAfter) {
      details.retryAfter = retryAfter;
      details.retryAfterSeconds = Math.ceil(retryAfter / 1000);
    }
    
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429, details);
  }
}