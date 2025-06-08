import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { SendSmsDto } from '../dto/send-sms.dto';

@Injectable()
@Processor('sms')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {
    super();
  }

  async process(job: Job<SendSmsDto>): Promise<any> {
    const { data } = job;
    this.logger.log(`Processing SMS job ${job.id} to ${data.to}`);

    try {
      const result = await this.smsService.sendSms(data);
      
      if (result.success) {
        this.logger.log(`SMS sent successfully: ${result.messageId}`);
        return result;
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${data.to}`, error);
      throw error;
    }
  }
}