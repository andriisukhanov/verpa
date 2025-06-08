import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription as SubscriptionSchema, SubscriptionDocument } from '../schemas/subscription.schema';
import { ISubscriptionRepository } from '../../../domain/repositories/subscription.repository.interface';
import { Subscription, SubscriptionStatus } from '../../../domain/entities/subscription.entity';
import { BillingPeriod } from '../../../domain/value-objects/billing-period.value-object';

@Injectable()
export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    @InjectModel(SubscriptionSchema.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(subscription: Subscription): Promise<Subscription> {
    const created = new this.subscriptionModel({
      ...subscription,
      currentPeriod: {
        startDate: subscription.currentPeriod.startDate,
        endDate: subscription.currentPeriod.endDate,
      },
    });
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async update(id: string, subscription: Partial<Subscription>): Promise<Subscription> {
    const updated = await this.subscriptionModel.findByIdAndUpdate(
      id,
      { $set: subscription },
      { new: true },
    );
    if (!updated) {
      throw new Error(`Subscription ${id} not found`);
    }
    return this.toDomainEntity(updated);
  }

  async findById(id: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionModel.findById(id);
    return subscription ? this.toDomainEntity(subscription) : null;
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionModel.findOne({ userId });
    return subscription ? this.toDomainEntity(subscription) : null;
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionModel.findOne({ stripeSubscriptionId });
    return subscription ? this.toDomainEntity(subscription) : null;
  }

  async findByStatus(status: SubscriptionStatus, limit: number = 100): Promise<Subscription[]> {
    const subscriptions = await this.subscriptionModel
      .find({ status })
      .limit(limit);
    return subscriptions.map(s => this.toDomainEntity(s));
  }

  async findExpiring(daysAhead: number): Promise<Subscription[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    const subscriptions = await this.subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      'currentPeriod.endDate': { $lte: cutoffDate },
      cancelAtPeriodEnd: false,
    });
    
    return subscriptions.map(s => this.toDomainEntity(s));
  }

  async findTrialsEnding(daysAhead: number): Promise<Subscription[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    const subscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.TRIALING,
      trialEnd: { $lte: cutoffDate },
    });
    
    return subscriptions.map(s => this.toDomainEntity(s));
  }

  async updateUsage(
    subscriptionId: string,
    aquariumsCount: number,
    photosCount: number,
  ): Promise<void> {
    await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
      $set: {
        'usage.aquariumsCount': aquariumsCount,
        'usage.photosCount': photosCount,
        'usage.lastUpdated': new Date(),
      },
    });
  }

  async findActiveSubscriptions(limit: number, offset: number): Promise<Subscription[]> {
    const subscriptions = await this.subscriptionModel
      .find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      })
      .skip(offset)
      .limit(limit);
    return subscriptions.map(s => this.toDomainEntity(s));
  }

  async countByStatus(status: SubscriptionStatus): Promise<number> {
    return this.subscriptionModel.countDocuments({ status });
  }

  async getSubscriptionMetrics(): Promise<{
    total: number;
    active: number;
    trialing: number;
    canceled: number;
    revenue: {
      monthly: number;
      annual: number;
    };
  }> {
    const [total, active, trialing, canceled] = await Promise.all([
      this.subscriptionModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.TRIALING }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.CANCELED }),
    ]);

    // Calculate revenue (simplified - in production, this would query payment data)
    const activeSubscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
    });

    let monthlyRevenue = 0;
    let annualRevenue = 0;

    // This is a simplified calculation - in production, we'd use actual payment data
    activeSubscriptions.forEach(sub => {
      const planPrices = {
        hobby: 9.99,
        pro: 29.99,
        business: 99.99,
      };
      const monthlyPrice = planPrices[sub.planId] || 0;
      monthlyRevenue += monthlyPrice;
      annualRevenue += monthlyPrice * 12;
    });

    return {
      total,
      active,
      trialing,
      canceled,
      revenue: {
        monthly: monthlyRevenue,
        annual: annualRevenue,
      },
    };
  }

  private toDomainEntity(doc: SubscriptionDocument): Subscription {
    return new Subscription({
      id: doc._id.toString(),
      userId: doc.userId,
      planId: doc.planId,
      status: doc.status,
      features: doc.features,
      currentPeriod: new BillingPeriod(
        doc.currentPeriod.startDate,
        doc.currentPeriod.endDate,
      ),
      stripeCustomerId: doc.stripeCustomerId,
      stripeSubscriptionId: doc.stripeSubscriptionId,
      stripePriceId: doc.stripePriceId,
      trialEnd: doc.trialEnd,
      isTrialing: doc.isTrialing,
      nextBillingDate: doc.nextBillingDate,
      canceledAt: doc.canceledAt,
      cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
      usage: doc.usage,
      metadata: doc.metadata,
      createdAt: doc['createdAt'],
      updatedAt: doc['updatedAt'],
    });
  }
}