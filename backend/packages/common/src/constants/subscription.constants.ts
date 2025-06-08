import { SubscriptionType } from '../enums';

export const SUBSCRIPTION_LIMITS = {
  [SubscriptionType.BASIC]: {
    AQUARIUMS: 3,
    EVENTS_PER_AQUARIUM: 50,
    PHOTOS_PER_AQUARIUM: 10,
    PHOTO_SIZE_MB: 5,
    REMINDERS_PER_EVENT: 1,
    EXPORT_FORMATS: ['csv'],
    API_CALLS_PER_HOUR: 100,
    SUPPORT_LEVEL: 'community',
  },
  [SubscriptionType.PREMIUM]: {
    AQUARIUMS: 10,
    EVENTS_PER_AQUARIUM: -1, // unlimited
    PHOTOS_PER_AQUARIUM: -1, // unlimited
    PHOTO_SIZE_MB: 10,
    REMINDERS_PER_EVENT: 5,
    EXPORT_FORMATS: ['csv', 'pdf', 'excel'],
    API_CALLS_PER_HOUR: 1000,
    SUPPORT_LEVEL: 'priority',
  },
  [SubscriptionType.PROFESSIONAL]: {
    AQUARIUMS: -1, // unlimited
    EVENTS_PER_AQUARIUM: -1, // unlimited
    PHOTOS_PER_AQUARIUM: -1, // unlimited
    PHOTO_SIZE_MB: 25,
    REMINDERS_PER_EVENT: -1, // unlimited
    EXPORT_FORMATS: ['csv', 'pdf', 'excel', 'json'],
    API_CALLS_PER_HOUR: -1, // unlimited
    SUPPORT_LEVEL: 'dedicated',
    CUSTOM_BRANDING: true,
    TEAM_MEMBERS: -1, // unlimited
  },
} as const;

export const SUBSCRIPTION_FEATURES = {
  BASIC_AQUARIUM_MANAGEMENT: [SubscriptionType.BASIC, SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  EVENT_SCHEDULING: [SubscriptionType.BASIC, SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  PHOTO_UPLOAD: [SubscriptionType.BASIC, SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  EMAIL_REMINDERS: [SubscriptionType.BASIC, SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  PUSH_NOTIFICATIONS: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  SMS_NOTIFICATIONS: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  ADVANCED_ANALYTICS: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  DATA_EXPORT: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  API_ACCESS: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  CUSTOM_EVENTS: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  TEAM_COLLABORATION: [SubscriptionType.PROFESSIONAL],
  WHITE_LABEL: [SubscriptionType.PROFESSIONAL],
  PRIORITY_SUPPORT: [SubscriptionType.PREMIUM, SubscriptionType.PROFESSIONAL],
  DEDICATED_SUPPORT: [SubscriptionType.PROFESSIONAL],
} as const;

export const SUBSCRIPTION_PRICES = {
  [SubscriptionType.BASIC]: {
    MONTHLY: 0,
    YEARLY: 0,
  },
  [SubscriptionType.PREMIUM]: {
    MONTHLY: 9.99,
    YEARLY: 99.99, // ~17% discount
  },
  [SubscriptionType.PROFESSIONAL]: {
    MONTHLY: 49.99,
    YEARLY: 499.99, // ~17% discount
  },
} as const;