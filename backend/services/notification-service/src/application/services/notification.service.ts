import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { LoggerService, LogAsync } from '@verpa/logging';
import { TemplateService } from './template.service';
import { SendEmailDto } from '../dto/send-email.dto';
import { SendSmsDto } from '../dto/send-sms.dto';
import { SendPushDto } from '../dto/send-push.dto';

export interface NotificationResult {
  id: string;
  type: 'email' | 'sms' | 'push';
  status: 'queued' | 'sent' | 'failed';
  messageId?: string;
  error?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('sms') private smsQueue: Queue,
    @InjectQueue('push') private pushQueue: Queue,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NotificationService');
  }

  async sendEmail(dto: SendEmailDto): Promise<NotificationResult> {
    try {
      // If template is specified, render it
      if (dto.template) {
        const rendered = this.templateService.renderEmailTemplate(
          dto.template,
          dto.variables || {},
        );
        dto.subject = rendered.subject;
        dto.html = rendered.html;
        dto.text = rendered.text;
      }

      const job = await this.emailQueue.add('send-email', dto, {
        ...this.configService.get('queue.defaultJobOptions'),
      });

      this.logger.info('Email queued', {
        jobId: job.id,
        to: dto.to,
        template: dto.template,
        subject: dto.subject,
      });

      return {
        id: job.id,
        type: 'email',
        status: 'queued',
      };
    } catch (error) {
      this.logger.error('Failed to queue email', error, {
        to: dto.to,
        template: dto.template,
      });
      return {
        id: '',
        type: 'email',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async sendSms(dto: SendSmsDto): Promise<NotificationResult> {
    try {
      const job = await this.smsQueue.add('send-sms', dto, {
        ...this.configService.get('queue.defaultJobOptions'),
      });

      this.logger.info('SMS queued', {
        jobId: job.id,
        to: dto.to,
        template: dto.template,
      });

      return {
        id: job.id,
        type: 'sms',
        status: 'queued',
      };
    } catch (error) {
      this.logger.error('Failed to queue SMS', error, {
        to: dto.to,
      });
      return {
        id: '',
        type: 'sms',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async sendPush(dto: SendPushDto): Promise<NotificationResult> {
    try {
      const job = await this.pushQueue.add('send-push', dto, {
        ...this.configService.get('queue.defaultJobOptions'),
      });

      this.logger.info('Push notification queued', {
        jobId: job.id,
        to: dto.to,
        title: dto.title,
      });

      return {
        id: job.id,
        type: 'push',
        status: 'queued',
      };
    } catch (error) {
      this.logger.error('Failed to queue push notification', error, {
        to: dto.to,
        title: dto.title,
      });
      return {
        id: '',
        type: 'push',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async sendBulkEmail(recipients: string[], dto: Partial<SendEmailDto>): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail({
        ...dto,
        to: recipient,
      } as SendEmailDto);
      results.push(result);
    }

    return results;
  }

  @LogAsync({ message: 'Processing notification event', level: 'info' })
  async sendNotificationFromEvent(event: any): Promise<void> {
    const { type, data } = event;

    this.logger.info('Processing notification event', {
      eventType: type,
      recipient: data.to,
    });

    switch (type) {
      case 'SEND_EMAIL':
        await this.sendEmail({
          to: data.to,
          template: data.template,
          variables: data.variables,
          subject: data.subject,
          html: data.html,
          text: data.text,
        });
        break;

      case 'SEND_SMS':
        await this.sendSms({
          to: data.to,
          message: data.message,
          template: data.template,
          variables: data.variables,
        });
        break;

      case 'SEND_PUSH':
        await this.sendPush({
          to: data.to,
          title: data.title,
          body: data.body,
          data: data.data,
        });
        break;

      default:
        this.logger.warn('Unknown notification event type', { type });
    }
  }
}