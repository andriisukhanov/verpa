import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@verpa/logging';
import { EmailService } from '../../infrastructure/email/email.service';
import { SendEmailDto } from '../dto/send-email.dto';

@Injectable()
@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext('EmailProcessor');
  }

  async process(job: Job<SendEmailDto>): Promise<any> {
    const { data } = job;
    this.logger.info('Processing email job', {
      jobId: job.id,
      to: data.to,
      template: data.template,
      subject: data.subject,
    });

    try {
      const result = await this.emailService.sendEmail(data);

      if (result.success) {
        this.logger.info('Email sent successfully', {
          jobId: job.id,
          messageId: result.messageId,
          to: data.to,
        });
        return result;
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      this.logger.error('Failed to send email', error, {
        jobId: job.id,
        to: data.to,
        template: data.template,
      });
      throw error;
    }
  }
}