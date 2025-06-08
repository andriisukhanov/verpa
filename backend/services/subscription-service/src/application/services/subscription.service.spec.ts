import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from '../../infrastructure/database/repositories/subscription.repository';
import { PaymentService } from '../../infrastructure/payment/payment.service';
import { EventPublisher } from '../../infrastructure/events/event.publisher';
import { CacheService } from '../cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionRepository: SubscriptionRepository;
  let paymentService: PaymentService;
  let eventPublisher: EventPublisher;
  let cacheService: CacheService;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    stripeCustomerId: 'cus_123',
  };

  const mockSubscription = {
    id: 'sub123',
    userId: 'user123',
    planId: 'premium',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    stripeSubscriptionId: 'sub_stripe123',
    features: {
      maxAquariums: 10,
      maxUsersPerAquarium: 5,
      analyticsEnabled: true,
      apiAccess: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlans = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'usd',
      interval: 'month',
      features: {
        maxAquariums: 2,
        maxUsersPerAquarium: 1,
        analyticsEnabled: false,
        apiAccess: false,
      },
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 999,
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'price_premium',
      features: {
        maxAquariums: 10,
        maxUsersPerAquarium: 5,
        analyticsEnabled: true,
        apiAccess: true,
      },
    },
    business: {
      id: 'business',
      name: 'Business',
      price: 2999,
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'price_business',
      features: {
        maxAquariums: -1, // unlimited
        maxUsersPerAquarium: -1,
        analyticsEnabled: true,
        apiAccess: true,
        prioritySupport: true,
      },
    },
  };

  const mockSubscriptionRepo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findExpiringSubscriptions: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
  };

  const mockPaymentService = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createPaymentIntent: jest.fn(),
    createSetupIntent: jest.fn(),
    attachPaymentMethod: jest.fn(),
    detachPaymentMethod: jest.fn(),
    getPaymentMethods: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepo,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: 'SUBSCRIPTION_PLANS',
          useValue: mockPlans,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    subscriptionRepository = module.get<SubscriptionRepository>(SubscriptionRepository);
    paymentService = module.get<PaymentService>(PaymentService);
    eventPublisher = module.get<EventPublisher>(EventPublisher);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a premium subscription successfully', async () => {
      const createDto = {
        planId: 'premium',
        paymentMethodId: 'pm_123',
      };

      mockSubscriptionRepo.findByUserId.mockResolvedValue(null);
      mockPaymentService.createSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });
      mockSubscriptionRepo.create.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription(mockUser, createDto);

      expect(result).toEqual(mockSubscription);
      expect(mockPaymentService.createSubscription).toHaveBeenCalledWith({
        customerId: mockUser.stripeCustomerId,
        priceId: mockPlans.premium.stripePriceId,
        paymentMethodId: createDto.paymentMethodId,
      });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('subscription.created', {
        userId: mockUser.id,
        subscriptionId: mockSubscription.id,
        planId: 'premium',
      });
    });

    it('should handle free plan without payment', async () => {
      const createDto = {
        planId: 'free',
      };

      mockSubscriptionRepo.findByUserId.mockResolvedValue(null);
      mockSubscriptionRepo.create.mockResolvedValue({
        ...mockSubscription,
        planId: 'free',
        stripeSubscriptionId: null,
      });

      const result = await service.createSubscription(mockUser, createDto);

      expect(result.planId).toBe('free');
      expect(mockPaymentService.createSubscription).not.toHaveBeenCalled();
    });

    it('should throw error if user already has active subscription', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);

      await expect(
        service.createSubscription(mockUser, { planId: 'premium' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create Stripe customer if not exists', async () => {
      const userWithoutStripe = { ...mockUser, stripeCustomerId: null };
      
      mockPaymentService.createCustomer.mockResolvedValue({
        id: 'cus_new123',
      });

      await service.createSubscription(userWithoutStripe, {
        planId: 'premium',
        paymentMethodId: 'pm_123',
      });

      expect(mockPaymentService.createCustomer).toHaveBeenCalledWith({
        email: userWithoutStripe.email,
        metadata: { userId: userWithoutStripe.id },
      });
    });
  });

  describe('updateSubscription', () => {
    it('should upgrade subscription successfully', async () => {
      const updateDto = {
        planId: 'business',
      };

      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);
      mockPaymentService.updateSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active',
      });
      mockSubscriptionRepo.update.mockResolvedValue({
        ...mockSubscription,
        planId: 'business',
      });

      const result = await service.updateSubscription(mockUser.id, updateDto);

      expect(result.planId).toBe('business');
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('subscription.updated', {
        userId: mockUser.id,
        subscriptionId: mockSubscription.id,
        oldPlanId: 'premium',
        newPlanId: 'business',
      });
    });

    it('should downgrade subscription with proration', async () => {
      const businessSub = { ...mockSubscription, planId: 'business' };
      
      mockSubscriptionRepo.findByUserId.mockResolvedValue(businessSub);
      mockPaymentService.updateSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active',
      });

      await service.updateSubscription(mockUser.id, { 
        planId: 'premium',
        prorationBehavior: 'create_prorations',
      });

      expect(mockPaymentService.updateSubscription).toHaveBeenCalledWith(
        'sub_stripe123',
        expect.objectContaining({
          proration_behavior: 'create_prorations',
        }),
      );
    });

    it('should handle downgrade to free plan', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);
      mockPaymentService.cancelSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'canceled',
      });

      await service.updateSubscription(mockUser.id, { planId: 'free' });

      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith(
        'sub_stripe123',
        { at_period_end: true },
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);
      mockPaymentService.cancelSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'active',
        cancel_at_period_end: true,
      });

      const result = await service.cancelSubscription(mockUser.id, {
        cancelAtPeriodEnd: true,
        reason: 'Too expensive',
      });

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith('subscription.cancelled', {
        userId: mockUser.id,
        subscriptionId: mockSubscription.id,
        reason: 'Too expensive',
      });
    });

    it('should cancel subscription immediately', async () => {
      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);
      mockPaymentService.cancelSubscription.mockResolvedValue({
        id: 'sub_stripe123',
        status: 'canceled',
      });

      await service.cancelSubscription(mockUser.id, {
        cancelAtPeriodEnd: false,
      });

      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith(
        'sub_stripe123',
        { at_period_end: false },
      );
    });

    it('should handle free plan cancellation', async () => {
      const freeSub = { ...mockSubscription, planId: 'free', stripeSubscriptionId: null };
      
      mockSubscriptionRepo.findByUserId.mockResolvedValue(freeSub);
      mockSubscriptionRepo.update.mockResolvedValue({
        ...freeSub,
        status: 'cancelled',
      });

      await service.cancelSubscription(mockUser.id, {});

      expect(mockPaymentService.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe('getSubscription', () => {
    it('should get subscription with cached data', async () => {
      mockCacheService.get.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription(mockUser.id);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('should get subscription from database and cache it', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockSubscriptionRepo.findByUserId.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription(mockUser.id);

      expect(result).toEqual(mockSubscription);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `subscription:${mockUser.id}`,
        mockSubscription,
        300, // 5 minutes
      );
    });

    it('should return null for users without subscription', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockSubscriptionRepo.findByUserId.mockResolvedValue(null);

      const result = await service.getSubscription(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow access to feature within plan limits', async () => {
      mockCacheService.get.mockResolvedValue(mockSubscription);

      const hasAccess = await service.checkFeatureAccess(
        mockUser.id,
        'maxAquariums',
        5,
      );

      expect(hasAccess).toBe(true);
    });

    it('should deny access when exceeding plan limits', async () => {
      mockCacheService.get.mockResolvedValue(mockSubscription);

      const hasAccess = await service.checkFeatureAccess(
        mockUser.id,
        'maxAquariums',
        15,
      );

      expect(hasAccess).toBe(false);
    });

    it('should allow unlimited features (-1 value)', async () => {
      const businessSub = {
        ...mockSubscription,
        planId: 'business',
        features: mockPlans.business.features,
      };
      
      mockCacheService.get.mockResolvedValue(businessSub);

      const hasAccess = await service.checkFeatureAccess(
        mockUser.id,
        'maxAquariums',
        1000,
      );

      expect(hasAccess).toBe(true);
    });

    it('should handle boolean features', async () => {
      mockCacheService.get.mockResolvedValue(mockSubscription);

      const hasAnalytics = await service.checkFeatureAccess(
        mockUser.id,
        'analyticsEnabled',
      );

      expect(hasAnalytics).toBe(true);
    });
  });

  describe('processExpiringSubscriptions', () => {
    it('should send renewal reminders', async () => {
      const expiringSubs = [
        { ...mockSubscription, id: 'sub1', userId: 'user1' },
        { ...mockSubscription, id: 'sub2', userId: 'user2' },
      ];

      mockSubscriptionRepo.findExpiringSubscriptions.mockResolvedValue(expiringSubs);

      await service.processExpiringSubscriptions();

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'subscription.expiring_soon',
        expect.objectContaining({ userId: 'user1' }),
      );
    });
  });

  describe('handleStripeWebhook', () => {
    it('should handle subscription updated webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe123',
            status: 'active',
            current_period_end: 1234567890,
          },
        },
      };

      mockSubscriptionRepo.findByStripeSubscriptionId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepo.update.mockResolvedValue(mockSubscription);

      await service.handleStripeWebhook(webhookData as any);

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
        mockSubscription.id,
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('should handle subscription deleted webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_stripe123',
          },
        },
      };

      mockSubscriptionRepo.findByStripeSubscriptionId.mockResolvedValue(mockSubscription);

      await service.handleStripeWebhook(webhookData as any);

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
        mockSubscription.id,
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'subscription.expired',
        expect.any(Object),
      );
    });

    it('should handle payment failed webhook', async () => {
      const webhookData = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_stripe123',
            attempt_count: 3,
          },
        },
      };

      mockSubscriptionRepo.findByStripeSubscriptionId.mockResolvedValue(mockSubscription);

      await service.handleStripeWebhook(webhookData as any);

      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'subscription.payment_failed',
        expect.objectContaining({ attemptCount: 3 }),
      );
    });
  });

  describe('getUsageStatistics', () => {
    it('should calculate usage statistics', async () => {
      mockCacheService.get.mockResolvedValue(mockSubscription);
      
      const mockUsage = {
        aquariumCount: 5,
        userCount: 3,
        storageUsed: 150, // MB
        apiCalls: 1500,
      };

      // Mock repository methods to get usage
      mockSubscriptionRepo.getUserUsage = jest.fn().mockResolvedValue(mockUsage);

      const result = await service.getUsageStatistics(mockUser.id);

      expect(result).toEqual({
        current: mockUsage,
        limits: mockSubscription.features,
        percentages: {
          aquariums: 50, // 5/10 * 100
          users: 60, // 3/5 * 100
        },
      });
    });
  });

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session', async () => {
      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      };

      mockPaymentService.createCheckoutSession.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession({
        userId: mockUser.id,
        planId: 'premium',
        successUrl: 'https://app.verpa.com/success',
        cancelUrl: 'https://app.verpa.com/cancel',
      });

      expect(result).toEqual(mockSession);
      expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith({
        customer: mockUser.stripeCustomerId,
        price: mockPlans.premium.stripePriceId,
        successUrl: expect.any(String),
        cancelUrl: expect.any(String),
        metadata: { userId: mockUser.id, planId: 'premium' },
      });
    });
  });

  describe('createPortalSession', () => {
    it('should create customer portal session', async () => {
      const mockPortalSession = {
        id: 'ps_123',
        url: 'https://billing.stripe.com/session/ps_123',
      };

      mockPaymentService.createPortalSession.mockResolvedValue(mockPortalSession);

      const result = await service.createPortalSession(
        mockUser,
        'https://app.verpa.com/settings',
      );

      expect(result).toEqual(mockPortalSession);
    });
  });
});