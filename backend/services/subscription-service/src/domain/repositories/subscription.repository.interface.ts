import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>;
  update(id: string, subscription: Partial<Subscription>): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null>;
  findByStatus(status: SubscriptionStatus, limit?: number): Promise<Subscription[]>;
  findExpiring(daysAhead: number): Promise<Subscription[]>;
  findTrialsEnding(daysAhead: number): Promise<Subscription[]>;
  
  // Usage tracking
  updateUsage(subscriptionId: string, aquariumsCount: number, photosCount: number): Promise<void>;
  
  // Bulk operations
  findActiveSubscriptions(limit: number, offset: number): Promise<Subscription[]>;
  countByStatus(status: SubscriptionStatus): Promise<number>;
  
  // Analytics
  getSubscriptionMetrics(): Promise<{
    total: number;
    active: number;
    trialing: number;
    canceled: number;
    revenue: {
      monthly: number;
      annual: number;
    };
  }>;
}