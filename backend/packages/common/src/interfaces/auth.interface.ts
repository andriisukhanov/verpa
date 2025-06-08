import { UserRole } from '../enums';

export interface IAuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ILoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface IRegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  language?: string;
}

export interface IOAuthLoginRequest {
  provider: 'google' | 'apple' | 'facebook';
  idToken: string;
  accessToken?: string;
}

export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface IEmailVerificationRequest {
  token: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}