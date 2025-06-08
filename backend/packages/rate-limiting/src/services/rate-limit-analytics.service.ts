import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RateLimitStorageService } from './rate-limit-storage.service';
import { RateLimitExceededEvent } from '../interfaces/rate-limit-response.interface';

@Injectable()
export class RateLimitAnalyticsService {
  private readonly logger = new Logger(RateLimitAnalyticsService.name);
  private events: RateLimitExceededEvent[] = [];
  private readonly maxEvents = 10000;

  constructor(private readonly storageService: RateLimitStorageService) {}

  recordExceededEvent(event: RateLimitExceededEvent): void {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateHourlyReport(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo);
    
    if (recentEvents.length === 0) {
      return;
    }

    const report = this.analyzeEvents(recentEvents);
    this.logger.log(`Hourly rate limit report: ${JSON.stringify(report)}`);
    
    // Clear old events
    this.events = this.events.filter(e => e.timestamp >= oneHourAgo);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport(): Promise<void> {
    const metrics = await this.storageService.getMetrics();
    
    const report = {
      date: new Date().toISOString().split('T')[0],
      totalBlocked: metrics.blockedRequests,
      topBlockedIps: metrics.topBlockedIps.slice(0, 10),
      topBlockedUsers: metrics.topBlockedUsers.slice(0, 10),
      patterns: this.detectPatterns(),
    };

    this.logger.log(`Daily rate limit report: ${JSON.stringify(report, null, 2)}`);
    
    // TODO: Send report via email/notification service
  }

  private analyzeEvents(events: RateLimitExceededEvent[]): any {
    const analysis = {
      totalEvents: events.length,
      uniqueIps: new Set(events.map(e => e.ip)).size,
      uniqueUsers: new Set(events.filter(e => e.userId).map(e => e.userId)).size,
      byEndpoint: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
      byUserAgent: {} as Record<string, number>,
      timeDistribution: {} as Record<string, number>,
    };

    events.forEach(event => {
      // By endpoint
      const endpoint = `${event.method} ${event.endpoint}`;
      analysis.byEndpoint[endpoint] = (analysis.byEndpoint[endpoint] || 0) + 1;

      // By tier
      if (event.tier) {
        analysis.byTier[event.tier] = (analysis.byTier[event.tier] || 0) + 1;
      }

      // By user agent
      if (event.userAgent) {
        const ua = this.categorizeUserAgent(event.userAgent);
        analysis.byUserAgent[ua] = (analysis.byUserAgent[ua] || 0) + 1;
      }

      // Time distribution (by hour)
      const hour = event.timestamp.getHours();
      analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
    });

    return analysis;
  }

  private detectPatterns(): any {
    const patterns = {
      suspiciousActivity: [],
      possibleAttacks: [],
      recommendations: [],
    };

    // Analyze recent events for patterns
    const recentEvents = this.events.filter(
      e => e.timestamp >= new Date(Date.now() - 3600000)
    );

    // Check for rapid-fire requests from same IP
    const ipCounts = new Map<string, number>();
    recentEvents.forEach(e => {
      ipCounts.set(e.ip, (ipCounts.get(e.ip) || 0) + 1);
    });

    ipCounts.forEach((count, ip) => {
      if (count > 100) {
        patterns.suspiciousActivity.push({
          type: 'rapid_fire',
          ip,
          count,
          severity: 'high',
        });
      }
    });

    // Check for distributed attacks (many IPs hitting same endpoint)
    const endpointIps = new Map<string, Set<string>>();
    recentEvents.forEach(e => {
      const endpoint = `${e.method} ${e.endpoint}`;
      if (!endpointIps.has(endpoint)) {
        endpointIps.set(endpoint, new Set());
      }
      endpointIps.get(endpoint)!.add(e.ip);
    });

    endpointIps.forEach((ips, endpoint) => {
      if (ips.size > 50) {
        patterns.possibleAttacks.push({
          type: 'distributed',
          endpoint,
          uniqueIps: ips.size,
          severity: 'medium',
        });
      }
    });

    // Generate recommendations
    if (patterns.suspiciousActivity.length > 0) {
      patterns.recommendations.push(
        'Consider implementing CAPTCHA for suspicious IPs'
      );
    }

    if (patterns.possibleAttacks.length > 0) {
      patterns.recommendations.push(
        'Review rate limits for affected endpoints',
        'Consider implementing IP reputation checking'
      );
    }

    return patterns;
  }

  private categorizeUserAgent(userAgent: string): string {
    if (/bot|crawler|spider/i.test(userAgent)) return 'bot';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/mozilla|chrome|safari|firefox/i.test(userAgent)) return 'browser';
    if (/curl|wget|postman/i.test(userAgent)) return 'api_tool';
    return 'other';
  }

  getRecentEvents(minutes: number = 60): RateLimitExceededEvent[] {
    const since = new Date(Date.now() - (minutes * 60000));
    return this.events.filter(e => e.timestamp >= since);
  }

  async getSuspiciousIps(): Promise<string[]> {
    const recentEvents = this.getRecentEvents(60);
    const ipCounts = new Map<string, number>();
    
    recentEvents.forEach(e => {
      ipCounts.set(e.ip, (ipCounts.get(e.ip) || 0) + 1);
    });

    const suspicious: string[] = [];
    ipCounts.forEach((count, ip) => {
      if (count > 50) {
        suspicious.push(ip);
      }
    });

    return suspicious;
  }

  async getAbusiveUsers(): Promise<string[]> {
    const recentEvents = this.getRecentEvents(60);
    const userCounts = new Map<string, number>();
    
    recentEvents.forEach(e => {
      if (e.userId) {
        userCounts.set(e.userId, (userCounts.get(e.userId) || 0) + 1);
      }
    });

    const abusive: string[] = [];
    userCounts.forEach((count, userId) => {
      if (count > 100) {
        abusive.push(userId);
      }
    });

    return abusive;
  }
}