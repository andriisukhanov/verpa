import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../infrastructure/push/push.service';
import { SendPushDto } from '../dto/send-push.dto';

@Injectable()
@Processor('push')
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job<SendPushDto>): Promise<any> {
    const { data } = job;
    this.logger.log(`Processing push notification job ${job.id}`);

    try {
      const result = await this.pushService.sendPush(data);
      
      if (result.success) {
        this.logger.log(`Push notification sent successfully: ${result.messageId}`);
        return result;
      } else {
        throw new Error(result.error || 'Failed to send push notification');
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification`, error);
      throw error;
    }
  }
}