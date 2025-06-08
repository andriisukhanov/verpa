import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { EmailService } from '../../infrastructure/email/email.service';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { PushService } from '../../infrastructure/push/push.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TerminusModule,
    ConfigModule,
  ],
  controllers: [HealthController],
  providers: [
    // These services are needed for health checks
    // They should already be provided by their respective modules
    // If not, we need to import them or make them available
  ],
})
export class HealthModule {}