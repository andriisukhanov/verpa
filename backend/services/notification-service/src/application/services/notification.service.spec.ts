import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { TemplateService } from './template.service';
import { LoggerService } from '@verpa/logging';
import { SendEmailDto } from '../dto/send-email.dto';
import { SendSmsDto } from '../dto/send-sms.dto';
import { SendPushDto } from '../dto/send-push.dto';
import { Queue } from 'bullmq';

describe('NotificationService', () => {
  let service: NotificationService;
  let templateService: TemplateService;
  let emailQueue: Queue;
  let smsQueue: Queue;
  let pushQueue: Queue;
  let configService: ConfigService;
  let logger: LoggerService;

  const mockEmailQueue = {
    add: jest.fn(),
  };

  const mockSmsQueue = {
    add: jest.fn(),
  };

  const mockPushQueue = {
    add: jest.fn(),
  };

  const mockTemplateService = {
    renderEmailTemplate: jest.fn(),
    renderSmsTemplate: jest.fn(),
    renderPushTemplate: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
        {
          provide: getQueueToken('sms'),
          useValue: mockSmsQueue,
        },
        {
          provide: getQueueToken('push'),
          useValue: mockPushQueue,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    templateService = module.get<TemplateService>(TemplateService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<LoggerService>(LoggerService);

    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully without template', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test Email</p>',
        text: 'Test Email',
      };

      const mockJob = { id: 'job123' };
      mockEmailQueue.add.mockResolvedValue(mockJob);

      const result = await service.sendEmail(dto);

      expect(result).toEqual({
        id: 'job123',
        type: 'email',
        status: 'queued',
      });

      expect(mockEmailQueue.add).toHaveBeenCalledWith('send-email', dto, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Email queued', {
        jobId: 'job123',
        to: 'test@example.com',
        template: undefined,
        subject: 'Test Subject',
      });
    });

    it('should send email with template', async () => {
      const dto = {
        to: 'test@example.com',
        template: 'WELCOME',
        variables: { name: 'John Doe' },
      } as SendEmailDto;

      const renderedTemplate = {
        subject: 'Welcome to Verpa',
        html: '<h1>Welcome John Doe</h1>',
        text: 'Welcome John Doe',
      };

      mockTemplateService.renderEmailTemplate.mockReturnValue(renderedTemplate);
      mockEmailQueue.add.mockResolvedValue({ id: 'job456' });

      const result = await service.sendEmail(dto);

      expect(result).toEqual({
        id: 'job456',
        type: 'email',
        status: 'queued',
      });

      expect(mockTemplateService.renderEmailTemplate).toHaveBeenCalledWith(
        'WELCOME',
        { name: 'John Doe' },
      );

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to Verpa',
          html: '<h1>Welcome John Doe</h1>',
          text: 'Welcome John Doe',
        }),
        expect.any(Object),
      );
    });

    it('should handle email queueing errors', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const error = new Error('Queue connection failed');
      mockEmailQueue.add.mockRejectedValue(error);

      const result = await service.sendEmail(dto);

      expect(result).toEqual({
        id: '',
        type: 'email',
        status: 'failed',
        error: 'Queue connection failed',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to queue email',
        error,
        {
          to: 'test@example.com',
          template: undefined,
        },
      );
    });
  });

  describe('sendSms', () => {
    it('should send SMS successfully', async () => {
      const dto: SendSmsDto = {
        to: '+1234567890',
        message: 'Your verification code is 123456',
      };

      mockSmsQueue.add.mockResolvedValue({ id: 'sms123' });

      const result = await service.sendSms(dto);

      expect(result).toEqual({
        id: 'sms123',
        type: 'sms',
        status: 'queued',
      });

      expect(mockSmsQueue.add).toHaveBeenCalledWith('send-sms', dto, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('SMS queued', {
        jobId: 'sms123',
        to: '+1234567890',
        template: undefined,
      });
    });

    it('should send SMS with template', async () => {
      const dto: SendSmsDto = {
        to: '+1234567890',
        template: 'VERIFICATION',
        variables: { code: '123456' },
      } as any;

      mockSmsQueue.add.mockResolvedValue({ id: 'sms456' });

      const result = await service.sendSms(dto);

      expect(result).toEqual({
        id: 'sms456',
        type: 'sms',
        status: 'queued',
      });
    });

    it('should handle SMS queueing errors', async () => {
      const dto: SendSmsDto = {
        to: '+1234567890',
        message: 'Test message',
      };

      const error = new Error('SMS service unavailable');
      mockSmsQueue.add.mockRejectedValue(error);

      const result = await service.sendSms(dto);

      expect(result).toEqual({
        id: '',
        type: 'sms',
        status: 'failed',
        error: 'SMS service unavailable',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to queue SMS',
        error,
        {
          to: '+1234567890',
        },
      );
    });
  });

  describe('sendPush', () => {
    it('should send push notification successfully', async () => {
      const dto: SendPushDto = {
        to: 'user123',
        title: 'Water Change Reminder',
        body: 'Time to change water in Tank 1',
        data: { aquariumId: 'aq123' },
      };

      mockPushQueue.add.mockResolvedValue({ id: 'push123' });

      const result = await service.sendPush(dto);

      expect(result).toEqual({
        id: 'push123',
        type: 'push',
        status: 'queued',
      });

      expect(mockPushQueue.add).toHaveBeenCalledWith('send-push', dto, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Push notification queued', {
        jobId: 'push123',
        to: 'user123',
        title: 'Water Change Reminder',
      });
    });

    it('should handle push notification errors', async () => {
      const dto: SendPushDto = {
        to: 'user123',
        title: 'Test',
        body: 'Test body',
      };

      const error = new Error('Push service error');
      mockPushQueue.add.mockRejectedValue(error);

      const result = await service.sendPush(dto);

      expect(result).toEqual({
        id: '',
        type: 'push',
        status: 'failed',
        error: 'Push service error',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to queue push notification',
        error,
        {
          to: 'user123',
          title: 'Test',
        },
      );
    });
  });

  describe('sendBulkEmail', () => {
    it('should send emails to multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const dto = {
        subject: 'Bulk Email',
        html: '<p>Bulk message</p>',
        text: 'Bulk message',
      };

      mockEmailQueue.add
        .mockResolvedValueOnce({ id: 'job1' })
        .mockResolvedValueOnce({ id: 'job2' })
        .mockResolvedValueOnce({ id: 'job3' });

      const results = await service.sendBulkEmail(recipients, dto);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        id: 'job1',
        type: 'email',
        status: 'queued',
      });
      expect(results[1]).toEqual({
        id: 'job2',
        type: 'email',
        status: 'queued',
      });
      expect(results[2]).toEqual({
        id: 'job3',
        type: 'email',
        status: 'queued',
      });

      expect(mockEmailQueue.add).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk email', async () => {
      const recipients = ['user1@example.com', 'user2@example.com'];
      const dto = {
        subject: 'Bulk Email',
        html: '<p>Bulk message</p>',
      };

      mockEmailQueue.add
        .mockResolvedValueOnce({ id: 'job1' })
        .mockRejectedValueOnce(new Error('Failed to queue'));

      const results = await service.sendBulkEmail(recipients, dto);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('queued');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('sendNotificationFromEvent', () => {
    it('should process SEND_EMAIL event', async () => {
      const event = {
        type: 'SEND_EMAIL',
        data: {
          to: 'test@example.com',
          template: 'WELCOME',
          variables: { name: 'John' },
        },
      };

      mockTemplateService.renderEmailTemplate.mockReturnValue({
        subject: 'Welcome',
        html: '<h1>Welcome John</h1>',
        text: 'Welcome John',
      });
      mockEmailQueue.add.mockResolvedValue({ id: 'job123' });

      await service.sendNotificationFromEvent(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Processing notification event', {
        eventType: 'SEND_EMAIL',
        recipient: 'test@example.com',
      });

      expect(mockEmailQueue.add).toHaveBeenCalled();
    });

    it('should process SEND_SMS event', async () => {
      const event = {
        type: 'SEND_SMS',
        data: {
          to: '+1234567890',
          message: 'Test SMS',
        },
      };

      mockSmsQueue.add.mockResolvedValue({ id: 'sms123' });

      await service.sendNotificationFromEvent(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Processing notification event', {
        eventType: 'SEND_SMS',
        recipient: '+1234567890',
      });

      expect(mockSmsQueue.add).toHaveBeenCalled();
    });

    it('should process SEND_PUSH event', async () => {
      const event = {
        type: 'SEND_PUSH',
        data: {
          to: 'user123',
          title: 'Push Title',
          body: 'Push Body',
          data: { custom: 'data' },
        },
      };

      mockPushQueue.add.mockResolvedValue({ id: 'push123' });

      await service.sendNotificationFromEvent(event);

      expect(mockLogger.info).toHaveBeenCalledWith('Processing notification event', {
        eventType: 'SEND_PUSH',
        recipient: 'user123',
      });

      expect(mockPushQueue.add).toHaveBeenCalled();
    });

    it('should handle unknown event types', async () => {
      const event = {
        type: 'UNKNOWN_TYPE',
        data: {},
      };

      await service.sendNotificationFromEvent(event);

      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown notification event type', {
        type: 'UNKNOWN_TYPE',
      });
    });

    it('should handle event with missing data fields', async () => {
      const event = {
        type: 'SEND_EMAIL',
        data: {
          to: 'test@example.com',
          subject: 'Test',
        },
      };

      mockEmailQueue.add.mockResolvedValue({ id: 'job123' });

      await service.sendNotificationFromEvent(event);

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test',
          template: undefined,
          variables: undefined,
          html: undefined,
          text: undefined,
        }),
        expect.any(Object),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty recipient list in bulk email', async () => {
      const results = await service.sendBulkEmail([], { subject: 'Test' });
      expect(results).toEqual([]);
      expect(mockEmailQueue.add).not.toHaveBeenCalled();
    });

    it('should handle null/undefined values in DTOs', async () => {
      const dto = {
        to: 'test@example.com',
        subject: 'Test',
        html: null as any,
        text: undefined,
      };

      mockEmailQueue.add.mockResolvedValue({ id: 'job123' });

      const result = await service.sendEmail(dto);

      expect(result.status).toBe('queued');
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test',
          html: null,
          text: undefined,
        }),
        expect.any(Object),
      );
    });

    it('should handle template rendering errors', async () => {
      const dto = {
        to: 'test@example.com',
        template: 'INVALID_TEMPLATE',
        variables: {},
      } as SendEmailDto;

      mockTemplateService.renderEmailTemplate.mockImplementation(() => {
        throw new Error('Template not found');
      });

      const result = await service.sendEmail(dto);

      expect(result).toEqual({
        id: '',
        type: 'email',
        status: 'failed',
        error: 'Template not found',
      });
    });
  });
});