import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { SendPushDto } from '../../application/dto/send-push.dto';

export interface PushResult {
  messageId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp?: admin.app.App;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const config = this.configService.get('push.firebase');
    if (config?.projectId && config?.privateKey && config?.clientEmail) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.projectId,
            privateKey: config.privateKey,
            clientEmail: config.clientEmail,
          }),
        });
      } catch (error) {
        this.logger.error('Failed to initialize Firebase', error);
      }
    }
  }

  async sendPush(dto: SendPushDto): Promise<PushResult> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Push notification service not configured');
      }

      const message: admin.messaging.Message = {
        notification: {
          title: dto.title,
          body: dto.body,
          imageUrl: dto.imageUrl,
        },
        data: dto.data,
        token: dto.to,
      };

      if (dto.tokens && dto.tokens.length > 0) {
        // Send to multiple devices
        const response = await this.firebaseApp.messaging().sendEachForMulticast({
          tokens: dto.tokens,
          notification: message.notification,
          data: message.data,
        });

        return {
          messageId: response.responses[0]?.messageId || '',
          success: response.successCount > 0,
          error: response.failureCount > 0 ? 'Some messages failed' : undefined,
        };
      } else {
        // Send to single device
        const messageId = await this.firebaseApp.messaging().send(message);
        return {
          messageId,
          success: true,
        };
      }
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return {
        messageId: '',
        success: false,
        error: error.message,
      };
    }
  }
}