import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import { Subscription, SubscriptionStatus, SubscriptionFeatures } from '../../domain/entities/subscription.entity';
import { BillingPeriod } from '../../domain/value-objects/billing-period.value-object';
import { StripeService } from '../../infrastructure/payment/stripe/stripe.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    // Check if user already has a subscription
    const existingSubscription = await this.subscriptionRepository.findByUserId(userId);
    if (existingSubscription) {
      throw new BadRequestException('User already has a subscription');
    }

    // Get plan configuration
    const planConfig = this.configService.get(`subscription.plans.${dto.planId}`);
    if (!planConfig) {
      throw new BadRequestException(`Invalid plan: ${dto.planId}`);
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = dto.stripeCustomerId;
    if (!stripeCustomerId && dto.email) {
      const stripeCustomer = await this.stripeService.createCustomer(dto.email, {
        userId,
      });
      stripeCustomerId = stripeCustomer.id;
    }

    let subscription: Subscription;

    if (dto.planId === 'free') {
      // Create free subscription without Stripe
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 100); // Effectively never expires

      subscription = new Subscription({
        userId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        features: planConfig.features,
        currentPeriod: new BillingPeriod(now, endDate),
        stripeCustomerId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Check if trial is enabled
      const trialConfig = this.configService.get('subscription.trial');
      const trialDays = trialConfig.enabled && !dto.skipTrial ? trialConfig.durationDays : 0;

      if (trialDays > 0) {
        // Create trial subscription
        subscription = Subscription.createTrial(
          userId,
          dto.planId,
          trialDays,
          planConfig.features,
        );
        subscription.stripeCustomerId = stripeCustomerId;

        // Create Stripe subscription with trial
        if (stripeCustomerId && planConfig.stripePriceId) {
          const stripeSubscription = await this.stripeService.createSubscription(
            stripeCustomerId,
            planConfig.stripePriceId,
            trialDays,
            { userId, planId: dto.planId },
          );
          subscription.stripeSubscriptionId = stripeSubscription.id;
        }
      } else {
        // Create paid subscription
        if (!stripeCustomerId || !dto.paymentMethodId) {
          throw new BadRequestException('Payment method required for paid subscription');
        }

        // Attach payment method and set as default
        await this.stripeService.attachPaymentMethod(dto.paymentMethodId, stripeCustomerId);
        await this.stripeService.setDefaultPaymentMethod(stripeCustomerId, dto.paymentMethodId);

        // Create Stripe subscription
        const stripeSubscription = await this.stripeService.createSubscription(
          stripeCustomerId,
          planConfig.stripePriceId,
          0,
          { userId, planId: dto.planId },
        );

        const now = new Date();
        const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

        subscription = new Subscription({
          userId,
          planId: dto.planId,
          status: this.stripeService.mapStripeSubscriptionStatus(stripeSubscription.status),
          features: planConfig.features,
          currentPeriod: new BillingPeriod(now, periodEnd),
          stripeCustomerId,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: planConfig.stripePriceId,
          nextBillingDate: periodEnd,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Save subscription
    const savedSubscription = await this.subscriptionRepository.create(subscription);

    // Emit event
    this.eventEmitter.emit('subscription.created', {
      subscriptionId: savedSubscription.id,
      userId: savedSubscription.userId,
      planId: savedSubscription.planId,
      status: savedSubscription.status,
    });

    return savedSubscription;
  }

  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (dto.planId && dto.planId !== subscription.planId) {
      await this.changePlan(subscription, dto.planId);
    }

    if (dto.cancelAtPeriodEnd !== undefined) {
      if (dto.cancelAtPeriodEnd) {
        subscription.cancel(false);
      } else {
        subscription.reactivate();
      }

      if (subscription.stripeSubscriptionId) {
        await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
        });
      }
    }

    const updatedSubscription = await this.subscriptionRepository.update(
      subscriptionId,
      subscription,
    );

    // Emit event
    this.eventEmitter.emit('subscription.updated', {
      subscriptionId: updatedSubscription.id,
      userId: updatedSubscription.userId,
      changes: dto,
    });

    return updatedSubscription;
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancel(immediately);

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        immediately,
      );
    }

    const updatedSubscription = await this.subscriptionRepository.update(
      subscriptionId,
      subscription,
    );

    // Emit event
    this.eventEmitter.emit('subscription.canceled', {
      subscriptionId: updatedSubscription.id,
      userId: updatedSubscription.userId,
      immediately,
    });

    return updatedSubscription;
  }

  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.CANCELED || !subscription.currentPeriod.isActive()) {
      throw new BadRequestException('Cannot reactivate this subscription');
    }

    subscription.reactivate();

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.reactivateSubscription(subscription.stripeSubscriptionId);
    }

    const updatedSubscription = await this.subscriptionRepository.update(
      subscriptionId,
      subscription,
    );

    // Emit event
    this.eventEmitter.emit('subscription.reactivated', {
      subscriptionId: updatedSubscription.id,
      userId: updatedSubscription.userId,
    });

    return updatedSubscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findByUserId(userId);
  }

  async checkFeatureAccess(
    userId: string,
    feature: keyof SubscriptionFeatures,
  ): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      // Check if free plan allows the feature
      const freePlanFeatures = this.configService.get('subscription.plans.free.features');
      return freePlanFeatures[feature] === true;
    }
    return subscription.canUseFeature(feature);
  }

  async checkResourceLimit(
    userId: string,
    resource: 'aquariums' | 'photos',
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    
    if (!subscription) {
      // Use free plan limits
      const freePlanFeatures = this.configService.get('subscription.plans.free.features');
      return {
        allowed: true,
        limit: resource === 'aquariums' ? freePlanFeatures.maxAquariums : freePlanFeatures.maxPhotosPerAquarium,
        current: 0,
      };
    }

    const hasReachedLimit = subscription.hasReachedLimit(resource);
    const limit = resource === 'aquariums' 
      ? subscription.features.maxAquariums 
      : subscription.features.maxPhotosPerAquarium;
    const current = resource === 'aquariums'
      ? subscription.usage.aquariumsCount
      : subscription.usage.photosCount;

    return {
      allowed: !hasReachedLimit,
      limit,
      current,
    };
  }

  async updateUsage(userId: string, aquariumsCount: number, photosCount: number): Promise<void> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (subscription) {
      await this.subscriptionRepository.updateUsage(
        subscription.id,
        aquariumsCount,
        photosCount,
      );
    }
  }

  private async changePlan(subscription: Subscription, newPlanId: string): Promise<void> {
    const newPlanConfig = this.configService.get(`subscription.plans.${newPlanId}`);
    if (!newPlanConfig) {
      throw new BadRequestException(`Invalid plan: ${newPlanId}`);
    }

    subscription.planId = newPlanId;
    subscription.features = newPlanConfig.features;

    if (subscription.stripeSubscriptionId && newPlanConfig.stripePriceId) {
      await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
        priceId: newPlanConfig.stripePriceId,
      });
    }
  }

  // Scheduled tasks
  async processExpiringTrials(): Promise<void> {
    const trialsEnding = await this.subscriptionRepository.findTrialsEnding(3); // 3 days ahead
    
    for (const subscription of trialsEnding) {
      this.eventEmitter.emit('subscription.trial_ending', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        trialEnd: subscription.trialEnd,
      });
    }
  }

  async processExpiringSubscriptions(): Promise<void> {
    const subscriptionsExpiring = await this.subscriptionRepository.findExpiring(7); // 7 days ahead
    
    for (const subscription of subscriptionsExpiring) {
      this.eventEmitter.emit('subscription.expiring', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        expiresAt: subscription.currentPeriod.endDate,
      });
    }
  }
}