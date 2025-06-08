export interface UserActivity {
  lastActive: Date;
  totalSessions: number;
  totalEvents: number;
  averageSessionDuration: number;
  deviceTypes: string[];
  preferredFeatures: string[];
}

export interface UserEngagement {
  dailyActiveStreak: number;
  weeklyActiveStreak: number;
  totalAquariums: number;
  totalEvents: number;
  totalPhotosUploaded: number;
  lastEngagementDate: Date;
}

export class UserAnalytics {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  activity: UserActivity;
  engagement: UserEngagement;
  segments: string[];
  customAttributes: Record<string, any>;
  updatedAt: Date;

  constructor(partial: Partial<UserAnalytics>) {
    Object.assign(this, partial);
    this.updatedAt = this.updatedAt || new Date();
    this.segments = this.segments || [];
    this.customAttributes = this.customAttributes || {};
  }

  updateActivity(event: string): void {
    this.lastSeen = new Date();
    this.activity.totalEvents++;
    this.activity.lastActive = new Date();
  }

  addSegment(segment: string): void {
    if (!this.segments.includes(segment)) {
      this.segments.push(segment);
    }
  }

  removeSegment(segment: string): void {
    this.segments = this.segments.filter(s => s !== segment);
  }
}