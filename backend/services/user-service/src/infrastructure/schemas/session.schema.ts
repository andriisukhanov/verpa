import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = SessionModel & Document;

@Schema({
  collection: 'sessions',
  timestamps: true,
})
export class SessionModel {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  refreshToken: string;

  @Prop({
    type: {
      type: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'] },
      browser: String,
      os: String,
      version: String,
    },
    required: true,
  })
  deviceInfo: {
    type: string;
    browser?: string;
    os?: string;
    version?: string;
  };

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({
    type: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },
  })
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  @Prop({ type: Date, default: Date.now })
  lastActive: Date;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(SessionModel);

SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });