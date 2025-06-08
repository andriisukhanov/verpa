import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { LoggerService } from '@verpa/logging';
import { NotificationService } from '../services/notification.service';

@Controller()
export class NotificationEventController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NotificationEventController');
  }

  @EventPattern('notification-events')
  async handleNotificationEvent(@Payload() event: any) {
    this.logger.info('Received notification event', { 
      eventType: event.type,
      timestamp: event.timestamp,
    });
    
    try {
      await this.notificationService.sendNotificationFromEvent(event);
      this.logger.info('Notification event processed successfully', {
        eventType: event.type,
      });
    } catch (error) {
      this.logger.error('Failed to process notification event', error, { 
        eventType: event.type,
        eventData: event.data,
      });
    }
  }

  @EventPattern('user.created')
  async handleUserCreated(@Payload() event: any) {
    this.logger.info('User created event received', {
      userId: event.data?.userId,
      email: event.data?.email,
    });
    
    // This is now handled by the generic notification-events handler
    // The user service sends a SEND_EMAIL event with the VERIFICATION template
  }

  @EventPattern('user.password.reset.requested')
  async handlePasswordResetRequested(@Payload() event: any) {
    this.logger.info('Password reset requested event received', {
      userId: event.data?.userId,
      email: event.data?.email,
    });
    
    // This is now handled by the generic notification-events handler
    // The user service sends a SEND_EMAIL event with the PASSWORD_RESET template
  }

  @EventPattern('user.email.verified')
  async handleEmailVerified(@Payload() event: any) {
    this.logger.info('Email verified event received', {
      userId: event.data?.userId,
      email: event.data?.email,
    });
    
    // This is now handled by the generic notification-events handler
    // The user service sends a SEND_EMAIL event with the WELCOME template
  }

  @EventPattern('user.account.locked')
  async handleAccountLocked(@Payload() event: any) {
    this.logger.info('Account locked event received', {
      userId: event.data?.userId,
      email: event.data?.email,
      lockUntil: event.data?.lockUntil,
    });
    
    // This is now handled by the generic notification-events handler
    // The user service sends a SEND_EMAIL event with the ACCOUNT_LOCKED template
  }
}