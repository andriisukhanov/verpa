import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SendSmsDto } from '../../application/dto/send-sms.dto';

export interface SmsResult {
  messageId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient?: Twilio;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const config = this.configService.get('sms.twilio');
    if (config?.accountSid && config?.authToken) {
      this.twilioClient = new Twilio(config.accountSid, config.authToken);
    }
  }

  async sendSms(dto: SendSmsDto): Promise<SmsResult> {
    try {
      if (!this.twilioClient) {
        throw new Error('SMS service not configured');
      }

      const fromNumber = this.configService.get('sms.twilio.fromNumber');
      const message = await this.twilioClient.messages.create({
        body: dto.message,
        from: fromNumber,
        to: dto.to,
      });

      return {
        messageId: message.sid,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return {
        messageId: '',
        success: false,
        error: error.message,
      };
    }
  }
}