import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '@verpa/logging';
import { UserService } from '../../domain/services/user.service';

@Injectable()
export class TokenCleanupTask {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TokenCleanupTask');
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens() {
    this.logger.info('Starting expired tokens cleanup');
    
    try {
      const result = await this.userService.cleanupExpiredTokens();
      this.logger.info('Expired tokens cleanup completed', result);
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }
}