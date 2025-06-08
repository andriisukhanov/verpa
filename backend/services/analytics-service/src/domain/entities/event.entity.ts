export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  platform?: string;
  version?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export class AnalyticsEvent {
  id: string;
  eventType: string;
  eventCategory: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: Date;
  properties: Record<string, any>;
  metadata: EventMetadata;
  processed: boolean;
  createdAt: Date;

  constructor(partial: Partial<AnalyticsEvent>) {
    Object.assign(this, partial);
    this.createdAt = this.createdAt || new Date();
    this.processed = this.processed || false;
  }

  static create(data: {
    eventType: string;
    eventCategory: string;
    entityType: string;
    entityId: string;
    userId: string;
    properties?: Record<string, any>;
    metadata?: EventMetadata;
  }): AnalyticsEvent {
    return new AnalyticsEvent({
      ...data,
      timestamp: new Date(),
      properties: data.properties || {},
      metadata: data.metadata || {},
    });
  }
}