import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LogLevel } from '../interfaces/logger.interface';
import { AlertConfig, AlertCondition } from '../interfaces/log-config.interface';
import { LOGGING_CONFIG } from '../utils/constants';
import { LoggingConfig } from '../interfaces/log-config.interface';
import { QueryService } from './query.service';

interface AlertState {
  lastTriggered?: Date;
  count: number;
  active: boolean;
}

@Injectable()
export class AlertService {
  private alertStates: Map<string, AlertState> = new Map();

  constructor(
    @Inject(LOGGING_CONFIG) private readonly config: LoggingConfig,
    private readonly queryService: QueryService,
  ) {}

  @Cron('*/30 * * * * *') // Check every 30 seconds
  async checkAlerts(): Promise<void> {
    if (!this.config.alerts || this.config.alerts.length === 0) {
      return;
    }

    for (const alert of this.config.alerts) {
      await this.checkAlert(alert);
    }
  }

  private async checkAlert(alert: AlertConfig): Promise<void> {
    const state = this.getAlertState(alert.name);

    // Check cooldown
    if (state.lastTriggered && alert.cooldown) {
      const cooldownEnd = new Date(state.lastTriggered.getTime() + alert.cooldown * 1000);
      if (new Date() < cooldownEnd) {
        return;
      }
    }

    const triggered = await this.evaluateCondition(alert.condition);

    if (triggered && !state.active) {
      // Alert triggered
      state.active = true;
      state.lastTriggered = new Date();
      state.count++;
      await this.sendAlert(alert);
    } else if (!triggered && state.active) {
      // Alert resolved
      state.active = false;
      await this.sendResolution(alert);
    }
  }

  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.window * 1000);

    switch (condition.type) {
      case 'error-rate':
        return this.checkErrorRate(windowStart, now, condition);
      case 'response-time':
        return this.checkResponseTime(windowStart, now, condition);
      default:
        return false;
    }
  }

  private async checkErrorRate(
    from: Date,
    to: Date,
    condition: AlertCondition,
  ): Promise<boolean> {
    try {
      const logs = await this.queryService.query({
        from,
        to,
        level: LogLevel.ERROR,
      });

      const errorCount = logs.length;
      const duration = (to.getTime() - from.getTime()) / 1000; // seconds
      const errorRate = errorCount / duration;

      return this.compareValue(errorRate, condition.threshold, condition.comparison);
    } catch (error) {
      console.error('Failed to check error rate:', error);
      return false;
    }
  }

  private async checkResponseTime(
    from: Date,
    to: Date,
    condition: AlertCondition,
  ): Promise<boolean> {
    try {
      const logs = await this.queryService.query({
        from,
        to,
        search: 'duration',
      });

      const durations = logs
        .map(log => log.metadata?.duration)
        .filter(d => typeof d === 'number');

      if (durations.length === 0) {
        return false;
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      return this.compareValue(avgDuration, condition.threshold, condition.comparison);
    } catch (error) {
      console.error('Failed to check response time:', error);
      return false;
    }
  }

  private compareValue(
    value: number,
    threshold: number,
    comparison: string,
  ): boolean {
    switch (comparison) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private async sendAlert(alert: AlertConfig): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.config);
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }
  }

  private async sendResolution(alert: AlertConfig): Promise<void> {
    // Similar to sendAlert but with resolution message
    console.log(`Alert resolved: ${alert.name}`);
  }

  private async sendEmailAlert(alert: AlertConfig, config: any): Promise<void> {
    // Implement email sending
    console.log(`Email alert: ${alert.name}`, config);
  }

  private async sendSlackAlert(alert: AlertConfig, config: any): Promise<void> {
    // Implement Slack webhook
    console.log(`Slack alert: ${alert.name}`, config);
  }

  private async sendWebhookAlert(alert: AlertConfig, config: any): Promise<void> {
    // Implement generic webhook
    console.log(`Webhook alert: ${alert.name}`, config);
  }

  private getAlertState(name: string): AlertState {
    if (!this.alertStates.has(name)) {
      this.alertStates.set(name, {
        count: 0,
        active: false,
      });
    }
    return this.alertStates.get(name)!;
  }
}