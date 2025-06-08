import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MetricRepository } from './metric.repository';
import { Metric, MetricDocument } from '../../../domain/entities/metric.entity';
import { MetricType, MetricInterval } from '@verpa/common';

describe('MetricRepository', () => {
  let repository: MetricRepository;
  let metricModel: Model<MetricDocument>;

  const mockMetric = {
    _id: '507f1f77bcf86cd799439011',
    key: 'user.registrations',
    type: MetricType.COUNTER,
    value: 100,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    interval: MetricInterval.DAILY,
    metadata: {
      source: 'auth-service',
      environment: 'production',
    },
    tags: ['user', 'registration'],
    aggregated: false,
    ttl: 30,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockMetricModel = {
    new: jest.fn().mockReturnValue(mockMetric),
    constructor: jest.fn().mockReturnValue(mockMetric),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    bulkWrite: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricRepository,
        {
          provide: getModelToken(Metric.name),
          useValue: mockMetricModel,
        },
      ],
    }).compile();

    repository = module.get<MetricRepository>(MetricRepository);
    metricModel = module.get<Model<MetricDocument>>(getModelToken(Metric.name));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new metric', async () => {
      const metricData = {
        key: 'api.requests',
        type: MetricType.COUNTER,
        value: 1,
        timestamp: new Date(),
      };

      const mockSave = jest.fn().mockResolvedValue({ ...mockMetric, ...metricData });
      mockMetricModel.new.mockReturnValue({ save: mockSave });

      const result = await repository.create(metricData);

      expect(mockMetricModel.new).toHaveBeenCalledWith(metricData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toMatchObject(metricData);
    });

    it('should handle save errors', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockMetricModel.new.mockReturnValue({ save: mockSave });

      await expect(repository.create({ key: 'test' })).rejects.toThrow('Database error');
    });
  });

  describe('createMany', () => {
    it('should create multiple metrics', async () => {
      const metrics = [
        { key: 'metric1', value: 10 },
        { key: 'metric2', value: 20 },
      ];

      mockMetricModel.create.mockResolvedValue(metrics);

      const result = await repository.createMany(metrics);

      expect(mockMetricModel.create).toHaveBeenCalledWith(metrics);
      expect(result).toEqual(metrics);
    });
  });

  describe('findById', () => {
    it('should find metric by ID', async () => {
      mockMetricModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMetric),
      });

      const result = await repository.findById(mockMetric._id);

      expect(mockMetricModel.findById).toHaveBeenCalledWith(mockMetric._id);
      expect(result).toEqual(mockMetric);
    });

    it('should return null if metric not found', async () => {
      mockMetricModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByKey', () => {
    it('should find metric by key', async () => {
      mockMetricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMetric),
      });

      const result = await repository.findByKey('user.registrations');

      expect(mockMetricModel.findOne).toHaveBeenCalledWith({ key: 'user.registrations' });
      expect(result).toEqual(mockMetric);
    });
  });

  describe('findByKeys', () => {
    it('should find metrics by multiple keys', async () => {
      const keys = ['user.registrations', 'api.requests'];
      const mockMetrics = [mockMetric];

      mockMetricModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMetrics),
      });

      const result = await repository.findByKeys(keys);

      expect(mockMetricModel.find).toHaveBeenCalledWith({ key: { $in: keys } });
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('findByTimeRange', () => {
    it('should find metrics within time range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');
      const key = 'user.registrations';

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMetric]),
      };
      mockMetricModel.find.mockReturnValue(mockQuery);

      const result = await repository.findByTimeRange(key, startTime, endTime, 100);

      expect(mockMetricModel.find).toHaveBeenCalledWith({
        key,
        timestamp: { $gte: startTime, $lte: endTime },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(100);
      expect(result).toEqual([mockMetric]);
    });

    it('should use default limit', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockMetricModel.find.mockReturnValue(mockQuery);

      await repository.findByTimeRange('test', new Date(), new Date());

      expect(mockQuery.limit).toHaveBeenCalledWith(1000);
    });
  });

  describe('findByTags', () => {
    it('should find metrics by tags', async () => {
      const tags = ['user', 'registration'];
      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMetric]),
      };
      mockMetricModel.find.mockReturnValue(mockQuery);

      const result = await repository.findByTags(tags, 50);

      expect(mockMetricModel.find).toHaveBeenCalledWith({
        tags: { $all: tags },
      });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual([mockMetric]);
    });
  });

  describe('update', () => {
    it('should update metric by ID', async () => {
      const updateData = { value: 150 };
      const updatedMetric = { ...mockMetric, ...updateData };

      mockMetricModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedMetric),
      });

      const result = await repository.update(mockMetric._id, updateData);

      expect(mockMetricModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockMetric._id,
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedMetric);
    });
  });

  describe('increment', () => {
    it('should increment metric value', async () => {
      const incrementedMetric = { ...mockMetric, value: 105 };

      mockMetricModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(incrementedMetric),
      });

      const result = await repository.increment('user.registrations', 5);

      expect(mockMetricModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'user.registrations' },
        { $inc: { value: 5 } },
        { new: true, upsert: false },
      );
      expect(result).toEqual(incrementedMetric);
    });

    it('should handle negative increment', async () => {
      const decrementedMetric = { ...mockMetric, value: 95 };

      mockMetricModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(decrementedMetric),
      });

      const result = await repository.increment('user.registrations', -5);

      expect(mockMetricModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'user.registrations' },
        { $inc: { value: -5 } },
        { new: true, upsert: false },
      );
      expect(result).toEqual(decrementedMetric);
    });
  });

  describe('upsert', () => {
    it('should upsert metric', async () => {
      const metricData = {
        key: 'api.latency',
        type: MetricType.GAUGE,
        value: 250,
        timestamp: new Date(),
      };

      mockMetricModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMetric, ...metricData }),
      });

      const result = await repository.upsert('api.latency', metricData);

      expect(mockMetricModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'api.latency' },
        { $set: metricData },
        { new: true, upsert: true },
      );
      expect(result).toMatchObject(metricData);
    });
  });

  describe('delete', () => {
    it('should delete metric by ID', async () => {
      mockMetricModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await repository.delete(mockMetric._id);

      expect(mockMetricModel.deleteOne).toHaveBeenCalledWith({ _id: mockMetric._id });
      expect(result).toBe(true);
    });

    it('should return false if metric not found', async () => {
      mockMetricModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByKey', () => {
    it('should delete all metrics with specific key', async () => {
      mockMetricModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      });

      const result = await repository.deleteByKey('user.registrations');

      expect(mockMetricModel.deleteMany).toHaveBeenCalledWith({ key: 'user.registrations' });
      expect(result).toBe(5);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete metrics older than specified date', async () => {
      const cutoffDate = new Date('2023-12-01');

      mockMetricModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 100 }),
      });

      const result = await repository.deleteOlderThan(cutoffDate);

      expect(mockMetricModel.deleteMany).toHaveBeenCalledWith({
        timestamp: { $lt: cutoffDate },
      });
      expect(result).toBe(100);
    });
  });

  describe('Aggregation methods', () => {
    describe('aggregate', () => {
      it('should perform custom aggregation', async () => {
        const pipeline = [
          { $match: { type: MetricType.COUNTER } },
          { $group: { _id: '$key', total: { $sum: '$value' } } },
        ];
        const mockResults = [
          { _id: 'user.registrations', total: 500 },
          { _id: 'api.requests', total: 10000 },
        ];

        mockMetricModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults),
        });

        const result = await repository.aggregate(pipeline);

        expect(mockMetricModel.aggregate).toHaveBeenCalledWith(pipeline);
        expect(result).toEqual(mockResults);
      });
    });

    describe('aggregateByInterval', () => {
      it('should aggregate metrics by time interval', async () => {
        const key = 'api.requests';
        const startTime = new Date('2024-01-01');
        const endTime = new Date('2024-01-31');
        const interval = MetricInterval.HOURLY;

        const mockResults = [
          { _id: '2024-01-01T00:00:00Z', total: 100, avg: 10, max: 50, min: 1 },
          { _id: '2024-01-01T01:00:00Z', total: 150, avg: 15, max: 60, min: 2 },
        ];

        mockMetricModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults),
        });

        const result = await repository.aggregateByInterval(key, startTime, endTime, interval);

        expect(mockMetricModel.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              key,
              timestamp: { $gte: startTime, $lte: endTime },
            },
          },
          expect.objectContaining({
            $group: expect.objectContaining({
              _id: expect.any(Object),
              total: { $sum: '$value' },
              avg: { $avg: '$value' },
              max: { $max: '$value' },
              min: { $min: '$value' },
              count: { $sum: 1 },
            }),
          }),
          { $sort: { _id: 1 } },
        ]);
        expect(result).toEqual(mockResults);
      });
    });

    describe('getStatsByKey', () => {
      it('should get statistics for a metric key', async () => {
        const key = 'api.latency';
        const startTime = new Date('2024-01-01');
        const endTime = new Date('2024-01-31');

        const mockStats = {
          key,
          count: 1000,
          sum: 250000,
          avg: 250,
          min: 50,
          max: 1000,
          stdDev: 75,
        };

        mockMetricModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockStats]),
        });

        const result = await repository.getStatsByKey(key, startTime, endTime);

        expect(mockMetricModel.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              key,
              timestamp: { $gte: startTime, $lte: endTime },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              sum: { $sum: '$value' },
              avg: { $avg: '$value' },
              min: { $min: '$value' },
              max: { $max: '$value' },
              stdDev: { $stdDevPop: '$value' },
            },
          },
          {
            $project: {
              _id: 0,
              key: { $literal: key },
              count: 1,
              sum: 1,
              avg: 1,
              min: 1,
              max: 1,
              stdDev: 1,
            },
          },
        ]);
        expect(result).toEqual(mockStats);
      });

      it('should return null if no data', async () => {
        mockMetricModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        });

        const result = await repository.getStatsByKey('nonexistent', new Date(), new Date());

        expect(result).toBeNull();
      });
    });

    describe('getTopKeys', () => {
      it('should get top metric keys by value', async () => {
        const limit = 10;
        const startTime = new Date('2024-01-01');
        const endTime = new Date('2024-01-31');

        const mockTopKeys = [
          { _id: 'api.requests', total: 50000 },
          { _id: 'user.logins', total: 10000 },
          { _id: 'db.queries', total: 8000 },
        ];

        mockMetricModel.aggregate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTopKeys),
        });

        const result = await repository.getTopKeys(limit, startTime, endTime);

        expect(mockMetricModel.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              timestamp: { $gte: startTime, $lte: endTime },
            },
          },
          {
            $group: {
              _id: '$key',
              total: { $sum: '$value' },
            },
          },
          { $sort: { total: -1 } },
          { $limit: limit },
        ]);
        expect(result).toEqual(mockTopKeys);
      });
    });
  });

  describe('Bulk operations', () => {
    describe('bulkWrite', () => {
      it('should perform bulk write operations', async () => {
        const operations = [
          {
            insertOne: {
              document: { key: 'metric1', value: 10 },
            },
          },
          {
            updateOne: {
              filter: { key: 'metric2' },
              update: { $inc: { value: 5 } },
            },
          },
        ];

        const mockResult = {
          insertedCount: 1,
          modifiedCount: 1,
          deletedCount: 0,
        };

        mockMetricModel.bulkWrite.mockResolvedValue(mockResult);

        const result = await repository.bulkWrite(operations);

        expect(mockMetricModel.bulkWrite).toHaveBeenCalledWith(operations);
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('TTL and cleanup', () => {
    describe('setTTL', () => {
      it('should set TTL for metric', async () => {
        const ttlDays = 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);

        mockMetricModel.updateOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        });

        const result = await repository.setTTL(mockMetric._id, ttlDays);

        expect(mockMetricModel.updateOne).toHaveBeenCalledWith(
          { _id: mockMetric._id },
          { $set: { ttl: ttlDays, expiresAt: expect.any(Date) } },
        );
        expect(result).toBe(true);
      });
    });

    describe('cleanupExpired', () => {
      it('should delete expired metrics', async () => {
        mockMetricModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 50 }),
        });

        const result = await repository.cleanupExpired();

        expect(mockMetricModel.deleteMany).toHaveBeenCalledWith({
          expiresAt: { $lte: expect.any(Date) },
        });
        expect(result).toBe(50);
      });
    });
  });

  describe('count', () => {
    it('should count metrics with filter', async () => {
      mockMetricModel.countDocuments.mockResolvedValue(100);

      const result = await repository.count({ type: MetricType.COUNTER });

      expect(mockMetricModel.countDocuments).toHaveBeenCalledWith({ type: MetricType.COUNTER });
      expect(result).toBe(100);
    });

    it('should count all metrics with empty filter', async () => {
      mockMetricModel.countDocuments.mockResolvedValue(500);

      const result = await repository.count();

      expect(mockMetricModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(500);
    });
  });

  describe('exists', () => {
    it('should return true if metric exists', async () => {
      mockMetricModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.exists({ key: 'user.registrations' });

      expect(mockMetricModel.countDocuments).toHaveBeenCalledWith({ key: 'user.registrations' });
      expect(result).toBe(true);
    });

    it('should return false if metric does not exist', async () => {
      mockMetricModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.exists({ key: 'nonexistent' });

      expect(result).toBe(false);
    });
  });
});