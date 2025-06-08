import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionRepository } from './subscription.repository';
import { Subscription, SubscriptionDocument } from '../../../domain/entities/subscription.entity';
import { SubscriptionType, PaymentProvider, PaymentStatus } from '@verpa/common';

describe('SubscriptionRepository', () => {
  let repository: SubscriptionRepository;
  let subscriptionModel: Model<SubscriptionDocument>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockSubscription = {
    _id: '507f1f77bcf86cd799439011',
    userId: mockUser.id,
    type: SubscriptionType.PREMIUM,
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-01-31'),
    autoRenew: true,
    paymentProvider: PaymentProvider.STRIPE,
    providerSubscriptionId: 'sub_123456789',
    providerCustomerId: 'cus_123456789',
    priceId: 'price_123456789',
    amount: 9.99,
    currency: 'USD',
    interval: 'month',
    intervalCount: 1,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    features: {
      maxAquariums: 10,
      maxEquipmentPerAquarium: 20,
      maxInhabitantsPerAquarium: 50,
      advancedAnalytics: true,
      waterParameterAlerts: true,
      diseaseDetection: true,
      iotIntegration: true,
      dataExport: true,
      prioritySupport: true,
    },
    usage: {
      aquariumsCount: 3,
      totalEquipment: 12,
      totalInhabitants: 25,
      lastUpdated: new Date('2024-01-15'),
    },
    metadata: {
      source: 'web',
      campaign: 'new-year-promo',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPaymentHistory = {
    _id: '507f1f77bcf86cd799439012',
    subscriptionId: mockSubscription._id,
    userId: mockUser.id,
    amount: 9.99,
    currency: 'USD',
    status: PaymentStatus.SUCCEEDED,
    provider: PaymentProvider.STRIPE,
    providerPaymentId: 'pi_123456789',
    invoiceId: 'in_123456789',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    paidAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  };

  const mockSubscriptionModel = {
    new: jest.fn().mockReturnValue(mockSubscription),
    constructor: jest.fn().mockReturnValue(mockSubscription),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionRepository,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    repository = module.get<SubscriptionRepository>(SubscriptionRepository);
    subscriptionModel = module.get<Model<SubscriptionDocument>>(
      getModelToken(Subscription.name),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      const subscriptionData = {
        userId: mockUser.id,
        type: SubscriptionType.PREMIUM,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(),
        amount: 9.99,
        currency: 'USD',
      };

      const mockSave = jest.fn().mockResolvedValue({ ...mockSubscription, ...subscriptionData });
      mockSubscriptionModel.new.mockReturnValue({ save: mockSave });

      const result = await repository.create(subscriptionData);

      expect(mockSubscriptionModel.new).toHaveBeenCalledWith(subscriptionData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toMatchObject(subscriptionData);
    });

    it('should handle save errors', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockSubscriptionModel.new.mockReturnValue({ save: mockSave });

      await expect(repository.create({ userId: 'test' })).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find subscription by ID', async () => {
      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscription),
      });

      const result = await repository.findById(mockSubscription._id);

      expect(mockSubscriptionModel.findById).toHaveBeenCalledWith(mockSubscription._id);
      expect(result).toEqual(mockSubscription);
    });

    it('should return null if subscription not found', async () => {
      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find subscription by user ID', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscription),
      });

      const result = await repository.findByUserId(mockUser.id);

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({ userId: mockUser.id });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null if no subscription found for user', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByUserId', () => {
    it('should find active subscription by user ID', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscription),
      });

      const result = await repository.findActiveByUserId(mockUser.id);

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        userId: mockUser.id,
        status: 'active',
        endDate: { $gte: expect.any(Date) },
      });
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('findByProviderSubscriptionId', () => {
    it('should find subscription by provider subscription ID', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscription),
      });

      const result = await repository.findByProviderSubscriptionId('sub_123456789');

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        providerSubscriptionId: 'sub_123456789',
      });
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('findAll', () => {
    it('should find all subscriptions with filters', async () => {
      const filter = { status: 'active' };
      const options = { sort: { createdAt: -1 }, limit: 10 };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockSubscription]),
      };
      mockSubscriptionModel.find.mockReturnValue(mockQuery);

      const result = await repository.findAll(filter, options);

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith(filter);
      expect(mockQuery.sort).toHaveBeenCalledWith(options.sort);
      expect(mockQuery.limit).toHaveBeenCalledWith(options.limit);
      expect(result).toEqual([mockSubscription]);
    });

    it('should handle pagination with skip', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockSubscriptionModel.find.mockReturnValue(mockQuery);

      await repository.findAll({}, { skip: 20, limit: 10 });

      expect(mockQuery.skip).toHaveBeenCalledWith(20);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findExpiring', () => {
    it('should find subscriptions expiring within days', async () => {
      const days = 7;
      const mockExpiringSubscriptions = [mockSubscription];

      mockSubscriptionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExpiringSubscriptions),
      });

      const result = await repository.findExpiring(days);

      const expectedEndDate = new Date();
      expectedEndDate.setDate(expectedEndDate.getDate() + days);

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        status: 'active',
        autoRenew: false,
        endDate: {
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        },
      });
      expect(result).toEqual(mockExpiringSubscriptions);
    });
  });

  describe('findExpired', () => {
    it('should find expired subscriptions', async () => {
      const mockExpiredSubscriptions = [{ ...mockSubscription, status: 'expired' }];

      mockSubscriptionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExpiredSubscriptions),
      });

      const result = await repository.findExpired();

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        status: 'active',
        endDate: { $lt: expect.any(Date) },
      });
      expect(result).toEqual(mockExpiredSubscriptions);
    });
  });

  describe('update', () => {
    it('should update subscription by ID', async () => {
      const updateData = { status: 'cancelled', canceledAt: new Date() };
      const updatedSubscription = { ...mockSubscription, ...updateData };

      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSubscription),
      });

      const result = await repository.update(mockSubscription._id, updateData);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedSubscription);
    });

    it('should return null if subscription not found', async () => {
      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('updateUsage', () => {
    it('should update subscription usage', async () => {
      const usageUpdate = {
        aquariumsCount: 4,
        totalEquipment: 15,
        totalInhabitants: 30,
      };

      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubscription),
      });

      const result = await repository.updateUsage(mockSubscription._id, usageUpdate);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        {
          $set: {
            'usage.aquariumsCount': usageUpdate.aquariumsCount,
            'usage.totalEquipment': usageUpdate.totalEquipment,
            'usage.totalInhabitants': usageUpdate.totalInhabitants,
            'usage.lastUpdated': expect.any(Date),
          },
        },
        { new: true },
      );
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const canceledSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      };

      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(canceledSubscription),
      });

      const result = await repository.cancelSubscription(mockSubscription._id, true);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        {
          $set: {
            cancelAtPeriodEnd: true,
            canceledAt: expect.any(Date),
          },
        },
        { new: true },
      );
      expect(result).toEqual(canceledSubscription);
    });

    it('should cancel subscription immediately', async () => {
      const canceledSubscription = {
        ...mockSubscription,
        status: 'cancelled',
        canceledAt: new Date(),
        endDate: new Date(),
      };

      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(canceledSubscription),
      });

      const result = await repository.cancelSubscription(mockSubscription._id, false);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        {
          $set: {
            status: 'cancelled',
            canceledAt: expect.any(Date),
            endDate: expect.any(Date),
            cancelAtPeriodEnd: false,
          },
        },
        { new: true },
      );
      expect(result).toEqual(canceledSubscription);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate cancelled subscription', async () => {
      const reactivatedSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      };

      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(reactivatedSubscription),
      });

      const result = await repository.reactivateSubscription(mockSubscription._id);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSubscription._id,
        {
          $set: {
            cancelAtPeriodEnd: false,
          },
          $unset: {
            canceledAt: 1,
          },
        },
        { new: true },
      );
      expect(result).toEqual(reactivatedSubscription);
    });
  });

  describe('delete', () => {
    it('should delete subscription by ID', async () => {
      mockSubscriptionModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await repository.delete(mockSubscription._id);

      expect(mockSubscriptionModel.deleteOne).toHaveBeenCalledWith({ _id: mockSubscription._id });
      expect(result).toBe(true);
    });

    it('should return false if subscription not found', async () => {
      mockSubscriptionModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Aggregation methods', () => {
    describe('getSubscriptionStats', () => {
      it('should return subscription statistics', async () => {
        const mockStats = {
          totalSubscriptions: 1000,
          activeSubscriptions: 850,
          cancelledSubscriptions: 100,
          expiredSubscriptions: 50,
          subscriptionsByType: {
            [SubscriptionType.FREE]: 500,
            [SubscriptionType.PREMIUM]: 300,
            [SubscriptionType.PROFESSIONAL]: 200,
          },
          totalRevenue: 15000,
          averageRevenue: 15,
          churnRate: 5.5,
        };

        mockSubscriptionModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockStats]),
        });

        const result = await repository.getSubscriptionStats();

        expect(mockSubscriptionModel.aggregate).toHaveBeenCalledWith([
          expect.objectContaining({
            $group: expect.objectContaining({
              _id: null,
              totalSubscriptions: { $sum: 1 },
              activeSubscriptions: expect.any(Object),
              cancelledSubscriptions: expect.any(Object),
              expiredSubscriptions: expect.any(Object),
              totalRevenue: { $sum: '$amount' },
              averageRevenue: { $avg: '$amount' },
            }),
          }),
          expect.objectContaining({
            $lookup: expect.any(Object),
          }),
        ]);
        expect(result).toEqual(mockStats);
      });
    });

    describe('getRevenueByDateRange', () => {
      it('should return revenue data by date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const mockRevenue = [
          { _id: '2024-01-01', revenue: 500, count: 50 },
          { _id: '2024-01-02', revenue: 450, count: 45 },
        ];

        mockSubscriptionModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRevenue),
        });

        const result = await repository.getRevenueByDateRange(startDate, endDate, 'daily');

        expect(mockSubscriptionModel.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $in: ['active', 'cancelled', 'expired'] },
            },
          },
          expect.objectContaining({
            $group: expect.objectContaining({
              _id: expect.any(Object),
              revenue: { $sum: '$amount' },
              count: { $sum: 1 },
            }),
          }),
          { $sort: { _id: 1 } },
        ]);
        expect(result).toEqual(mockRevenue);
      });
    });

    describe('getUserSubscriptionHistory', () => {
      it('should return user subscription history', async () => {
        const mockHistory = [mockSubscription];

        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockHistory),
        };
        mockSubscriptionModel.find.mockReturnValue(mockQuery);

        const result = await repository.getUserSubscriptionHistory(mockUser.id);

        expect(mockSubscriptionModel.find).toHaveBeenCalledWith({ userId: mockUser.id });
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual(mockHistory);
      });
    });
  });

  describe('count', () => {
    it('should count subscriptions with filter', async () => {
      mockSubscriptionModel.countDocuments.mockResolvedValue(100);

      const result = await repository.count({ status: 'active' });

      expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({ status: 'active' });
      expect(result).toBe(100);
    });

    it('should count all subscriptions with empty filter', async () => {
      mockSubscriptionModel.countDocuments.mockResolvedValue(500);

      const result = await repository.count();

      expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(500);
    });
  });

  describe('exists', () => {
    it('should return true if subscription exists', async () => {
      mockSubscriptionModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.exists({ userId: mockUser.id });

      expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({ userId: mockUser.id });
      expect(result).toBe(true);
    });

    it('should return false if subscription does not exist', async () => {
      mockSubscriptionModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.exists({ userId: 'nonexistent' });

      expect(result).toBe(false);
    });
  });

  describe('Trial management', () => {
    describe('startTrial', () => {
      it('should start a trial subscription', async () => {
        const trialDays = 14;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const trialSubscription = {
          userId: mockUser.id,
          type: SubscriptionType.PREMIUM,
          status: 'trialing',
          startDate: new Date(),
          endDate: trialEndDate,
          trialEnd: trialEndDate,
          amount: 0,
          currency: 'USD',
        };

        const mockSave = jest.fn().mockResolvedValue(trialSubscription);
        mockSubscriptionModel.new.mockReturnValue({ save: mockSave });

        const result = await repository.create(trialSubscription);

        expect(result).toMatchObject({
          status: 'trialing',
          trialEnd: expect.any(Date),
        });
      });
    });

    describe('convertTrialToPaid', () => {
      it('should convert trial to paid subscription', async () => {
        const convertedSubscription = {
          ...mockSubscription,
          status: 'active',
          trialEnd: null,
        };

        mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(convertedSubscription),
        });

        const result = await repository.update(mockSubscription._id, {
          status: 'active',
          trialEnd: null,
          amount: 9.99,
        });

        expect(result).toMatchObject({
          status: 'active',
          amount: 9.99,
        });
      });
    });
  });
});