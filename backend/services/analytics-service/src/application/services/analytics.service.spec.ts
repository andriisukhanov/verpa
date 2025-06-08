import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { EventRepository } from '../../infrastructure/database/repositories/event.repository';
import { MetricRepository } from '../../infrastructure/database/repositories/metric.repository';
import { UserAnalyticsRepository } from '../../infrastructure/database/repositories/user-analytics.repository';
import { KafkaService } from '@nestjs/microservices';
import { BadRequestException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let eventRepository: EventRepository;
  let metricRepository: MetricRepository;
  let userAnalyticsRepository: UserAnalyticsRepository;
  let kafkaService: KafkaService;

  const mockEventRepository = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByDateRange: jest.fn(),
    aggregateByType: jest.fn(),
    countByType: jest.fn(),
    deleteOldEvents: jest.fn(),
  };

  const mockMetricRepository = {
    create: jest.fn(),
    createBatch: jest.fn(),
    findByDateRange: jest.fn(),
    aggregateByInterval: jest.fn(),
    getLatestMetrics: jest.fn(),
    deleteOldMetrics: jest.fn(),
  };

  const mockUserAnalyticsRepository = {
    upsert: jest.fn(),
    findByUserId: jest.fn(),
    updateEngagement: jest.fn(),
    getTopUsers: jest.fn(),
    getUserRetention: jest.fn(),
    getChurnRisk: jest.fn(),
  };

  const mockKafkaService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: EventRepository,
          useValue: mockEventRepository,
        },
        {
          provide: MetricRepository,
          useValue: mockMetricRepository,
        },
        {
          provide: UserAnalyticsRepository,
          useValue: mockUserAnalyticsRepository,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    eventRepository = module.get<EventRepository>(EventRepository);
    metricRepository = module.get<MetricRepository>(MetricRepository);
    userAnalyticsRepository = module.get<UserAnalyticsRepository>(UserAnalyticsRepository);
    kafkaService = module.get<KafkaService>(KafkaService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    const mockEventData = {
      userId: 'user123',
      eventType: 'aquarium.created',
      eventData: { aquariumId: 'aq123', name: 'Test Tank' },
      metadata: { platform: 'mobile', version: '1.0.0' },
    };

    it('should track event successfully', async () => {
      const mockEvent = {
        id: 'event123',
        ...mockEventData,
        timestamp: new Date(),
      };

      mockEventRepository.create.mockResolvedValue(mockEvent);

      const result = await service.trackEvent(mockEventData);

      expect(result).toEqual(mockEvent);
      expect(mockEventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockEventData.userId,
        eventType: mockEventData.eventType,
        eventData: mockEventData.eventData,
        metadata: mockEventData.metadata,
      }));
      expect(mockKafkaService.emit).toHaveBeenCalledWith(
        'analytics.event.tracked',
        mockEvent,
      );
    });

    it('should update user analytics after tracking event', async () => {
      mockEventRepository.create.mockResolvedValue({ id: 'event123' });

      await service.trackEvent(mockEventData);

      expect(mockUserAnalyticsRepository.updateEngagement).toHaveBeenCalledWith(
        mockEventData.userId,
        expect.objectContaining({
          lastActivity: expect.any(Date),
          eventCount: expect.any(Number),
        }),
      );
    });

    it('should handle event without metadata', async () => {
      const eventWithoutMetadata = {
        userId: 'user123',
        eventType: 'test.event',
        eventData: { test: true },
      };

      await service.trackEvent(eventWithoutMetadata);

      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });

    it('should throw BadRequestException for invalid event type', async () => {
      const invalidEvent = {
        ...mockEventData,
        eventType: '',
      };

      await expect(service.trackEvent(invalidEvent)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getEvents', () => {
    it('should get events by user ID', async () => {
      const mockEvents = [
        { id: '1', userId: 'user123', eventType: 'aquarium.created' },
        { id: '2', userId: 'user123', eventType: 'parameters.recorded' },
      ];

      mockEventRepository.findByUserId.mockResolvedValue(mockEvents);

      const result = await service.getEvents({
        userId: 'user123',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockEvents);
      expect(mockEventRepository.findByUserId).toHaveBeenCalledWith(
        'user123',
        10,
        0,
      );
    });

    it('should get events by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockEvents = [{ id: '1' }, { id: '2' }];

      mockEventRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getEvents({
        startDate,
        endDate,
        limit: 20,
      });

      expect(result).toEqual(mockEvents);
      expect(mockEventRepository.findByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
        20,
        0,
      );
    });

    it('should apply default pagination', async () => {
      mockEventRepository.findByUserId.mockResolvedValue([]);

      await service.getEvents({ userId: 'user123' });

      expect(mockEventRepository.findByUserId).toHaveBeenCalledWith(
        'user123',
        100, // default limit
        0,   // default offset
      );
    });
  });

  describe('getMetrics', () => {
    it('should aggregate metrics by hour', async () => {
      const mockMetrics = [
        { timestamp: '2024-01-01T10:00:00Z', value: 100, count: 5 },
        { timestamp: '2024-01-01T11:00:00Z', value: 150, count: 8 },
      ];

      mockMetricRepository.aggregateByInterval.mockResolvedValue(mockMetrics);

      const result = await service.getMetrics({
        metricType: 'api_calls',
        interval: 'hour',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
      });

      expect(result).toEqual(mockMetrics);
      expect(mockMetricRepository.aggregateByInterval).toHaveBeenCalledWith(
        'api_calls',
        'hour',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should get latest metrics', async () => {
      const mockLatestMetrics = {
        api_calls: 1500,
        active_users: 250,
        error_rate: 0.02,
      };

      mockMetricRepository.getLatestMetrics.mockResolvedValue(mockLatestMetrics);

      const result = await service.getMetrics({
        metricType: 'all',
        latest: true,
      });

      expect(result).toEqual(mockLatestMetrics);
    });

    it('should validate metric interval', async () => {
      await expect(
        service.getMetrics({
          metricType: 'test',
          interval: 'invalid' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserAnalytics', () => {
    it('should get user analytics successfully', async () => {
      const mockAnalytics = {
        userId: 'user123',
        totalEvents: 150,
        lastActivity: new Date(),
        engagementScore: 85,
        retentionDays: 30,
        aquariumCount: 3,
        parameterRecords: 45,
      };

      mockUserAnalyticsRepository.findByUserId.mockResolvedValue(mockAnalytics);

      const result = await service.getUserAnalytics('user123');

      expect(result).toEqual(mockAnalytics);
      expect(mockUserAnalyticsRepository.findByUserId).toHaveBeenCalledWith('user123');
    });

    it('should create new analytics if not found', async () => {
      mockUserAnalyticsRepository.findByUserId.mockResolvedValue(null);
      
      const newAnalytics = {
        userId: 'user123',
        totalEvents: 0,
        lastActivity: expect.any(Date),
        engagementScore: 0,
      };

      mockUserAnalyticsRepository.upsert.mockResolvedValue(newAnalytics);

      const result = await service.getUserAnalytics('user123');

      expect(mockUserAnalyticsRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user123' }),
      );
    });
  });

  describe('getSystemMetrics', () => {
    it('should aggregate system metrics', async () => {
      const mockSystemMetrics = {
        totalUsers: 1000,
        activeUsers: 750,
        totalAquariums: 2500,
        totalEvents: 50000,
        avgEngagement: 72.5,
        errorRate: 0.015,
        apiCallsPerMinute: 450,
      };

      mockMetricRepository.getLatestMetrics.mockResolvedValue({
        system_metrics: mockSystemMetrics,
      });

      const result = await service.getSystemMetrics();

      expect(result).toEqual({ system_metrics: mockSystemMetrics });
    });
  });

  describe('getUserRetention', () => {
    it('should calculate user retention cohorts', async () => {
      const mockRetention = {
        day1: 85,
        day7: 65,
        day30: 45,
        day90: 30,
      };

      mockUserAnalyticsRepository.getUserRetention.mockResolvedValue(mockRetention);

      const result = await service.getUserRetention('2024-01-01', '2024-01-31');

      expect(result).toEqual(mockRetention);
      expect(mockUserAnalyticsRepository.getUserRetention).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('getChurnRiskUsers', () => {
    it('should identify users at risk of churning', async () => {
      const mockChurnUsers = [
        { userId: 'user1', riskScore: 0.85, lastActivity: '7 days ago' },
        { userId: 'user2', riskScore: 0.72, lastActivity: '14 days ago' },
      ];

      mockUserAnalyticsRepository.getChurnRisk.mockResolvedValue(mockChurnUsers);

      const result = await service.getChurnRiskUsers();

      expect(result).toEqual(mockChurnUsers);
      expect(mockUserAnalyticsRepository.getChurnRisk).toHaveBeenCalledWith(
        expect.any(Number), // threshold
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup old data', async () => {
      await service.cleanupOldData();

      expect(mockEventRepository.deleteOldEvents).toHaveBeenCalledWith(
        expect.any(Number), // retention days
      );
      expect(mockMetricRepository.deleteOldMetrics).toHaveBeenCalledWith(
        expect.any(Number), // retention days
      );
    });
  });

  describe('realtime metrics', () => {
    it('should emit realtime metric updates', async () => {
      const metric = {
        type: 'active_users',
        value: 125,
        timestamp: new Date(),
      };

      await service.updateRealtimeMetric(metric);

      expect(mockKafkaService.emit).toHaveBeenCalledWith(
        'analytics.metric.realtime',
        metric,
      );
    });
  });
});