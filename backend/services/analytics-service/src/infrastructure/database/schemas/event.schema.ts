import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({
  collection: 'analytics_events',
  timestamps: true,
  indexes: [
    { userId: 1, timestamp: -1 },
    { eventType: 1, timestamp: -1 },
    { entityType: 1, entityId: 1 },
    { processed: 1 },
    { createdAt: 1 },
  ],
})
export class Event {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true })
  eventCategory: string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object, default: {} })
  properties: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata: {
    sessionId?: string;
    deviceId?: string;
    platform?: string;
    version?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };

  @Prop({ default: false })
  processed: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);