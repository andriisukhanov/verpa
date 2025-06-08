import { Types } from 'mongoose';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser?: string;
  os?: string;
  version?: string;
}

export class Session {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshToken: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;

  constructor(partial: Partial<Session>) {
    Object.assign(this, partial);
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  updateActivity(): void {
    this.lastActive = new Date();
  }
}