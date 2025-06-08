export class UserEvents {
  static readonly USER_CREATED = 'user.created';
  static readonly USER_UPDATED = 'user.updated';
  static readonly USER_DELETED = 'user.deleted';
  static readonly EMAIL_VERIFIED = 'user.email.verified';
  static readonly PHONE_VERIFIED = 'user.phone.verified';
  static readonly PASSWORD_CHANGED = 'user.password.changed';
  static readonly PASSWORD_RESET_REQUESTED = 'user.password.reset.requested';
  static readonly PASSWORD_RESET = 'user.password.reset';
  static readonly PASSWORD_RESET_COMPLETED = 'user.password.reset.completed';
  static readonly ACCOUNT_LOCKED = 'user.account.locked';
  static readonly ACCOUNT_UNLOCKED = 'user.account.unlocked';
  static readonly LOGIN_SUCCESS = 'user.login.success';
  static readonly LOGIN_FAILED = 'user.login.failed';
  static readonly LOGOUT = 'user.logout';
  static readonly SUBSCRIPTION_UPDATED = 'user.subscription.updated';
}

export interface UserCreatedEvent {
  userId: string;
  email: string;
  username: string;
  emailVerificationToken: string;
}

export interface UserUpdatedEvent {
  userId: string;
  changes: Record<string, any>;
}

export interface UserDeletedEvent {
  userId: string;
  email: string;
}

export interface EmailVerifiedEvent {
  userId: string;
  email: string;
}

export interface PasswordChangedEvent {
  userId: string;
  email: string;
}

export interface PasswordResetRequestedEvent {
  userId: string;
  email: string;
  resetToken: string;
}

export interface PasswordResetEvent {
  userId: string;
  email: string;
}

export interface AccountLockedEvent {
  userId: string;
  email: string;
  lockUntil: Date;
}

export interface LoginSuccessEvent {
  userId: string;
  email: string;
  ip?: string;
  userAgent?: string;
}

export interface LoginFailedEvent {
  emailOrUsername: string;
  ip?: string;
  reason: string;
}