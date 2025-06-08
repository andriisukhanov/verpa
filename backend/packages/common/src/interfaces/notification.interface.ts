import { NotificationType, NotificationPriority } from '../enums';

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationType[];
  read: boolean;
  readAt?: Date;
  sentAt?: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationTemplate {
  _id: string;
  name: string;
  type: string;
  subject?: string;
  bodyHtml?: string;
  bodyText: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPushToken {
  _id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreferences {
  userId: string;
  email: IChannelPreference;
  push: IChannelPreference;
  sms: IChannelPreference;
  inApp: IChannelPreference;
}

interface IChannelPreference {
  enabled: boolean;
  eventTypes: {
    reminders: boolean;
    updates: boolean;
    alerts: boolean;
    marketing: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
}