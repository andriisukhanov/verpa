import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '@verpa/logging';
import { SessionService } from '../../domain/services/session.service';

@Injectable()
export class SessionCleanupTask {
  constructor(
    private readonly sessionService: SessionService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SessionCleanupTask');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSessions() {
    this.logger.info('Starting expired sessions cleanup');
    
    try {
      const deletedCount = await this.sessionService.cleanupExpiredSessions();
      this.logger.info('Expired sessions cleanup completed', { deletedCount });
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error);
    }
  }
}