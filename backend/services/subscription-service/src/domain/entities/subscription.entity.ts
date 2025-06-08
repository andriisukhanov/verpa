import { BillingPeriod } from '../value-objects/billing-period.value-object';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

export interface SubscriptionFeatures {
  maxAquariums: number;
  maxPhotosPerAquarium: number;
  waterParameterHistory: number; // days
  aiRecommendations: boolean;
  exportReports: boolean;
  prioritySupport: boolean;
  apiAccess?: boolean;
  customBranding?: boolean;
}

export class Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  currentPeriod: BillingPeriod;
  
  // Stripe references
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  
  // Trial information
  trialEnd?: Date;
  isTrialing: boolean;
  
  // Billing
  nextBillingDate?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  
  // Usage tracking
  usage: {
    aquariumsCount: number;
    photosCount: number;
    lastUpdated: Date;
  };
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Subscription>) {
    Object.assign(this, partial);
    this.metadata = this.metadata || {};
    this.cancelAtPeriodEnd = this.cancelAtPeriodEnd || false;
    this.isTrialing = this.isTrialing || false;
    this.usage = this.usage || {
      aquariumsCount: 0,
      photosCount: 0,
      lastUpdated: new Date(),
    };
  }

  static createTrial(userId: string, planId: string, trialDays: number, features: SubscriptionFeatures): Subscription {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    
    return new Subscription({
      userId,
      planId,
      status: SubscriptionStatus.TRIALING,
      features,
      isTrialing: true,
      trialEnd,
      currentPeriod: new BillingPeriod(now, trialEnd),
      createdAt: now,
      updatedAt: now,
    });
  }

  isActive(): boolean {
    return [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
    ].includes(this.status);
  }

  canUseFeature(feature: keyof SubscriptionFeatures): boolean {
    if (!this.isActive()) return false;
    return this.features[feature] === true;
  }

  hasReachedLimit(resource: 'aquariums' | 'photos'): boolean {
    if (!this.isActive()) return true;
    
    switch (resource) {
      case 'aquariums':
        return this.features.maxAquariums !== -1 && 
               this.usage.aquariumsCount >= this.features.maxAquariums;
      case 'photos':
        return this.features.maxPhotosPerAquarium !== -1 && 
               this.usage.photosCount >= this.features.maxPhotosPerAquarium;
      default:
        return false;
    }
  }

  updateUsage(aquariumsCount: number, photosCount: number): void {
    this.usage = {
      aquariumsCount,
      photosCount,
      lastUpdated: new Date(),
    };
  }

  cancel(immediately: boolean = false): void {
    if (immediately) {
      this.status = SubscriptionStatus.CANCELED;
      this.canceledAt = new Date();
    } else {
      this.cancelAtPeriodEnd = true;
    }
  }

  reactivate(): void {
    if (this.status === SubscriptionStatus.CANCELED && this.currentPeriod.isActive()) {
      this.status = SubscriptionStatus.ACTIVE;
      this.cancelAtPeriodEnd = false;
      this.canceledAt = undefined;
    }
  }

  pause(): void {
    if (this.isActive()) {
      this.status = SubscriptionStatus.PAUSED;
    }
  }

  resume(): void {
    if (this.status === SubscriptionStatus.PAUSED) {
      this.status = SubscriptionStatus.ACTIVE;
    }
  }
}