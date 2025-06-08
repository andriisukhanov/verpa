import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EventType, EventStatus } from '@verpa/common';

export type EventDocument = Event & Document;

@Schema({
  timestamps: true,
  collection: 'events',
})
export class Event {
  @Prop({ required: true, index: true })
  aquariumId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: EventType })
  type: EventType;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, index: true })
  scheduledDate: Date;

  @Prop()
  duration?: number; // in minutes

  @Prop({ default: false })
  recurring: boolean;

  @Prop({ type: Object })
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };

  @Prop()
  recurrenceEndDate?: Date;

  @Prop({ type: [Object], default: [] })
  reminders: {
    id: string;
    type: string;
    timeBefore: number;
    sent: boolean;
    sentAt?: Date;
    error?: string;
    createdAt: Date;
  }[];

  @Prop({ 
    required: true, 
    enum: EventStatus, 
    default: EventStatus.SCHEDULED,
    index: true 
  })
  status: EventStatus;

  @Prop()
  completedAt?: Date;

  @Prop()
  completedBy?: string;

  @Prop()
  notes?: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Indexes
EventSchema.index({ userId: 1, scheduledDate: 1 });
EventSchema.index({ aquariumId: 1, scheduledDate: 1 });
EventSchema.index({ status: 1, scheduledDate: 1 });
EventSchema.index({ 'reminders.sent': 1, scheduledDate: 1 });
EventSchema.index({ recurring: 1, status: 1 });

// Virtual for checking if event is overdue
EventSchema.virtual('isOverdue').get(function() {
  return this.status === EventStatus.SCHEDULED && 
         this.scheduledDate < new Date();
});

// Virtual for checking if event is due soon
EventSchema.virtual('isDue').get(function() {
  if (this.status !== EventStatus.SCHEDULED) return false;
  
  const now = new Date();
  const dueTime = new Date(this.scheduledDate);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return dueTime >= now && dueTime <= oneHourFromNow;
});

// Set toJSON transform
EventSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});