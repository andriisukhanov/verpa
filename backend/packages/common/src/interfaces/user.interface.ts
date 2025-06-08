import { UserRole, SubscriptionType, AuthProvider } from '../enums';

export interface IUser {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  subscriptionType: SubscriptionType;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  profilePicture?: string;
  timezone: string;
  language: string;
  authProviders: IAuthProvider[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IAuthProvider {
  provider: AuthProvider;
  providerId: string;
  email?: string;
  linkedAt: Date;
}

export interface IUserSession {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface IUserPreferences {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    eventReminders: boolean;
    marketingEmails: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    temperatureUnit: 'celsius' | 'fahrenheit';
    volumeUnit: 'liters' | 'gallons';
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
}