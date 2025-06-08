import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserAnalyticsDocument = UserAnalytics & Document;

@Schema({
  collection: 'user_analytics',
  timestamps: true,
  indexes: [
    { userId: 1 },
    { 'segments': 1 },
    { 'activity.lastActive': -1 },
    { 'engagement.lastEngagementDate': -1 },
  ],
})
export class UserAnalytics {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  firstSeen: Date;

  @Prop({ required: true })
  lastSeen: Date;

  @Prop({
    type: {
      lastActive: Date,
      totalSessions: Number,
      totalEvents: Number,
      averageSessionDuration: Number,
      deviceTypes: [String],
      preferredFeatures: [String],
    },
    default: {
      totalSessions: 0,
      totalEvents: 0,
      averageSessionDuration: 0,
      deviceTypes: [],
      preferredFeatures: [],
    },
  })
  activity: {
    lastActive: Date;
    totalSessions: number;
    totalEvents: number;
    averageSessionDuration: number;
    deviceTypes: string[];
    preferredFeatures: string[];
  };

  @Prop({
    type: {
      dailyActiveStreak: Number,
      weeklyActiveStreak: Number,
      totalAquariums: Number,
      totalEvents: Number,
      totalPhotosUploaded: Number,
      lastEngagementDate: Date,
    },
    default: {
      dailyActiveStreak: 0,
      weeklyActiveStreak: 0,
      totalAquariums: 0,
      totalEvents: 0,
      totalPhotosUploaded: 0,
    },
  })
  engagement: {
    dailyActiveStreak: number;
    weeklyActiveStreak: number;
    totalAquariums: number;
    totalEvents: number;
    totalPhotosUploaded: number;
    lastEngagementDate: Date;
  };

  @Prop({ type: [String], default: [] })
  segments: string[];

  @Prop({ type: Object, default: {} })
  customAttributes: Record<string, any>;
}

export const UserAnalyticsSchema = SchemaFactory.createForClass(UserAnalytics);