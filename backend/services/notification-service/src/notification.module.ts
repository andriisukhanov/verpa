import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from '@verpa/logging';

// Controllers
import { NotificationController } from './application/controllers/notification.controller';
import { NotificationEventController } from './application/controllers/notification-event.controller';

// Services
import { NotificationService } from './application/services/notification.service';
import { TemplateService } from './application/services/template.service';
import { EmailService } from './infrastructure/email/email.service';
import { SmsService } from './infrastructure/sms/sms.service';
import { PushService } from './infrastructure/push/push.service';

// Processors
import { EmailProcessor } from './application/processors/email.processor';
import { SmsProcessor } from './application/processors/sms.processor';
import { PushProcessor } from './application/processors/push.processor';

@Module({
  imports: [
    LoggingModule,
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'sms' },
      { name: 'push' }
    ),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('kafka.clientId'),
              brokers: configService.get('kafka.brokers'),
            },
            consumer: {
              groupId: configService.get('kafka.groupId'),
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [NotificationController, NotificationEventController],
  providers: [
    NotificationService,
    TemplateService,
    EmailService,
    SmsService,
    PushService,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}