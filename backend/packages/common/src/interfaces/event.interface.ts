import { EventType } from '../enums';

export interface IEvent {
  _id: string;
  userId: string;
  aquariumId: string;
  type: EventType;
  title: string;
  description?: string;
  scheduledFor: Date;
  completedAt?: Date;
  isRecurring: boolean;
  recurringPattern?: IRecurringPattern;
  reminder?: IEventReminder;
  attachments: IEventAttachment[];
  parameters?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval?: number;
  daysOfWeek?: number[]; // 0-6, where 0 is Sunday
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface IEventReminder {
  enabled: boolean;
  minutesBefore: number;
  notificationTypes: Array<'push' | 'email' | 'sms'>;
}

export interface IEventAttachment {
  _id: string;
  type: 'photo' | 'document';
  url: string;
  thumbnail?: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface IQuickEvent {
  aquariumId: string;
  type: 'temperature' | 'photo' | 'feeding';
  value?: number | string;
  photo?: string;
  notes?: string;
  timestamp?: Date;
}