import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { TemplateService } from './template.service';
import { SendEmailDto } from '../dto/send-email.dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let templateService: TemplateService;
  let emailQueue: any;

  beforeEach(async () => {
    const mockEmailQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    const mockSmsQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    const mockPushQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    const mockTemplateService = {
      renderEmailTemplate: jest.fn().mockReturnValue({
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    };

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
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    templateService = module.get<TemplateService>(TemplateService);
    emailQueue = mockEmailQueue;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email without template', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const result = await service.sendEmail(dto);

      expect(result).toEqual({
        id: 'mock-job-id',
        type: 'email',
        status: 'queued',
      });

      expect(emailQueue.add).toHaveBeenCalledWith('send-email', dto, expect.any(Object));
    });

    it('should send email with template', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        template: 'WELCOME',
        variables: { username: 'TestUser' },
      } as any;

      const result = await service.sendEmail(dto);

      expect(templateService.renderEmailTemplate).toHaveBeenCalledWith('WELCOME', { username: 'TestUser' });
      expect(result.status).toBe('queued');
    });
  });

  describe('sendNotificationFromEvent', () => {
    it('should send email from event', async () => {
      const event = {
        type: 'SEND_EMAIL',
        data: {
          to: 'test@example.com',
          template: 'WELCOME',
          variables: { username: 'TestUser' },
        },
      };

      await service.sendNotificationFromEvent(event);

      expect(emailQueue.add).toHaveBeenCalled();
    });
  });
});