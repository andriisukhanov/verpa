import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { LoggerService } from '@verpa/logging';
import {
  UserEvents,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  EmailVerifiedEvent,
  PasswordResetRequestedEvent,
  PasswordResetEvent,
  AccountLockedEvent,
  LoginSuccessEvent,
} from './user.events';

@Injectable()
export class UserEventHandler {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserEventHandler');
  }

  @OnEvent(UserEvents.USER_CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    this.logger.info('User created event', { userId: event.userId, email: event.email });
    
    try {
      // Publish to Kafka for other services
      this.kafkaClient.emit('user-events', {
        type: UserEvents.USER_CREATED,
        data: event,
        timestamp: new Date(),
      });

      // Send verification email
      this.kafkaClient.emit('notification-events', {
        type: 'SEND_EMAIL',
        data: {
          to: event.email,
          template: 'VERIFICATION',
          variables: {
            username: event.username,
            emailVerificationToken: event.emailVerificationToken,
          },
        },
        timestamp: new Date(),
      });

      // Track analytics
      this.kafkaClient.emit('analytics-events', {
        type: 'USER_REGISTERED',
        data: {
          userId: event.userId,
          properties: {
            registrationMethod: 'email',
          },
        },
        timestamp: new Date(),
      });

      this.logger.info('User created events published', { userId: event.userId });
    } catch (error) {
      this.logger.error('Failed to handle user created event', error, { userId: event.userId });
    }
  }

  @OnEvent(UserEvents.USER_UPDATED)
  async handleUserUpdated(event: UserUpdatedEvent) {
    this.logger.info('User updated event', { userId: event.userId });
    
    this.kafkaClient.emit('user-events', {
      type: UserEvents.USER_UPDATED,
      data: event,
      timestamp: new Date(),
    });
  }

  @OnEvent(UserEvents.USER_DELETED)
  async handleUserDeleted(event: UserDeletedEvent) {
    this.logger.info('User deleted event', { userId: event.userId });
    
    this.kafkaClient.emit('user-events', {
      type: UserEvents.USER_DELETED,
      data: event,
      timestamp: new Date(),
    });

    // Notify other services to cleanup user data
    this.kafkaClient.emit('cleanup-events', {
      type: 'USER_CLEANUP',
      data: { userId: event.userId },
      timestamp: new Date(),
    });
  }

  @OnEvent(UserEvents.EMAIL_VERIFIED)
  async handleEmailVerified(event: EmailVerifiedEvent) {
    this.logger.info('Email verified event', { userId: event.userId });
    
    try {
      this.kafkaClient.emit('user-events', {
        type: UserEvents.EMAIL_VERIFIED,
        data: event,
        timestamp: new Date(),
      });

      // Send welcome email after verification
      this.kafkaClient.emit('notification-events', {
        type: 'SEND_EMAIL',
        data: {
          to: event.email,
          template: 'WELCOME',
          variables: {
            username: event.username || event.email.split('@')[0],
          },
        },
        timestamp: new Date(),
      });

      // Track analytics
      this.kafkaClient.emit('analytics-events', {
        type: 'EMAIL_VERIFIED',
        data: {
          userId: event.userId,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to handle email verified event', error, { userId: event.userId });
    }
  }

  @OnEvent(UserEvents.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    this.logger.info('Password reset requested', { userId: event.userId });
    
    try {
      // Send password reset email
      this.kafkaClient.emit('notification-events', {
        type: 'SEND_EMAIL',
        data: {
          to: event.email,
          template: 'PASSWORD_RESET',
          variables: {
            username: event.username || event.email.split('@')[0],
            resetToken: event.resetToken,
          },
        },
        timestamp: new Date(),
      });

      // Track security event
      this.kafkaClient.emit('analytics-events', {
        type: 'PASSWORD_RESET_REQUESTED',
        data: {
          userId: event.userId,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to handle password reset request', error, { userId: event.userId });
    }
  }

  @OnEvent(UserEvents.PASSWORD_RESET_COMPLETED)
  async handlePasswordResetCompleted(event: PasswordResetEvent) {
    this.logger.info('Password reset completed', { userId: event.userId });
    
    try {
      // Send confirmation email
      this.kafkaClient.emit('notification-events', {
        type: 'SEND_EMAIL',
        data: {
          to: event.email,
          template: 'PASSWORD_RESET_SUCCESS',
          variables: {
            username: event.email.split('@')[0],
          },
        },
        timestamp: new Date(),
      });

      // Track security event
      this.kafkaClient.emit('analytics-events', {
        type: 'PASSWORD_RESET_COMPLETED',
        data: {
          userId: event.userId,
        },
        timestamp: new Date(),
      });

      // Emit security event for monitoring
      this.kafkaClient.emit('security-events', {
        type: 'PASSWORD_CHANGED',
        data: event,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to handle password reset completed', error, { userId: event.userId });
    }
  }

  @OnEvent(UserEvents.ACCOUNT_LOCKED)
  async handleAccountLocked(event: AccountLockedEvent) {
    this.logger.warn('Account locked event', { 
      userId: event.userId,
      lockUntil: event.lockUntil,
    });
    
    try {
      this.kafkaClient.emit('security-events', {
        type: 'ACCOUNT_LOCKED',
        data: event,
        timestamp: new Date(),
      });

      // Notify user about locked account
      this.kafkaClient.emit('notification-events', {
        type: 'SEND_EMAIL',
        data: {
          to: event.email,
          template: 'ACCOUNT_LOCKED',
          variables: {
            lockUntil: new Date(event.lockUntil).toLocaleString(),
          },
        },
        timestamp: new Date(),
      });

      // Track security event
      this.kafkaClient.emit('analytics-events', {
        type: 'SECURITY_ACCOUNT_LOCKED',
        data: {
          userId: event.userId,
          properties: {
            reason: 'excessive_failed_logins',
          },
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to handle account locked event', error, { userId: event.userId });
    }
  }

  @OnEvent(UserEvents.LOGIN_SUCCESS)
  async handleLoginSuccess(event: LoginSuccessEvent) {
    this.logger.info('Login success event', { userId: event.userId });
    
    // Log for analytics
    this.kafkaClient.emit('analytics-events', {
      type: 'USER_LOGIN',
      data: {
        userId: event.userId,
        properties: {
          ip: event.ip,
          userAgent: event.userAgent,
          deviceType: this.detectDeviceType(event.userAgent),
        },
      },
      timestamp: new Date(),
    });

    // Check for suspicious activity
    if (event.ip) {
      this.kafkaClient.emit('security-events', {
        type: 'LOGIN_ACTIVITY',
        data: event,
        timestamp: new Date(),
      });
    }
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  async onModuleInit() {
    // Subscribe to Kafka topics if needed
    const topics = ['user-commands'];
    topics.forEach((topic) => {
      this.kafkaClient.subscribeToResponseOf(topic);
    });
    await this.kafkaClient.connect();
  }
}