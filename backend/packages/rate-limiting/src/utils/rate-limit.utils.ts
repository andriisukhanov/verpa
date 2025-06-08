import { Request } from 'express';
import * as crypto from 'crypto';

export class RateLimitUtils {
  /**
   * Extract client IP address from request
   */
  static getClientIp(request: Request, trustProxy: boolean = true): string {
    if (trustProxy) {
      // Check X-Forwarded-For header
      const xForwardedFor = request.headers['x-forwarded-for'];
      if (xForwardedFor) {
        const ips = Array.isArray(xForwardedFor) 
          ? xForwardedFor[0] 
          : xForwardedFor.split(',');
        return (Array.isArray(ips) ? ips[0] : ips).trim();
      }

      // Check X-Real-IP header
      const xRealIp = request.headers['x-real-ip'];
      if (xRealIp) {
        return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
      }
    }

    // Fall back to direct connection
    return request.ip || request.connection.remoteAddress || '0.0.0.0';
  }

  /**
   * Generate rate limit key
   */
  static generateKey(
    prefix: string,
    identifier: string,
    endpoint?: string,
    window?: number,
  ): string {
    const parts = [prefix, identifier];
    
    if (endpoint) {
      parts.push(endpoint.replace(/[^a-zA-Z0-9]/g, '_'));
    }
    
    if (window) {
      // Add time window to key for fixed window strategy
      const windowStart = Math.floor(Date.now() / (window * 1000));
      parts.push(windowStart.toString());
    }
    
    return parts.join(':');
  }

  /**
   * Parse user agent for bot detection
   */
  static isBot(userAgent?: string): boolean {
    if (!userAgent) return false;
    
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /postman/i,
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Calculate reset time
   */
  static calculateResetTime(windowSize: number): Date {
    const now = Date.now();
    const windowMs = windowSize * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowEnd = windowStart + windowMs;
    return new Date(windowEnd);
  }

  /**
   * Format duration for human reading
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  /**
   * Calculate retry after in seconds
   */
  static calculateRetryAfter(resetTime: Date): number {
    const now = Date.now();
    const reset = resetTime.getTime();
    return Math.max(0, Math.ceil((reset - now) / 1000));
  }

  /**
   * Hash IP address for privacy
   */
  static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  /**
   * Check if IP is in CIDR range
   */
  static isIpInRange(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    if (!bits) return ip === range;

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    const mask = (-1 << (32 - parseInt(bits))) >>> 0;

    return (ipNum & mask) === (rangeNum & mask);
  }

  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Merge rate limit configurations
   */
  static mergeConfigs(
    ...configs: Array<Partial<any>>
  ): any {
    return configs.reduce((merged, config) => {
      return {
        ...merged,
        ...config,
        limits: {
          ...merged.limits,
          ...config.limits,
        },
      };
    }, {});
  }

  /**
   * Check if request should skip rate limiting
   */
  static shouldSkipRateLimit(
    request: Request,
    whitelist?: string[],
    skipPaths?: RegExp[],
  ): boolean {
    // Check IP whitelist
    if (whitelist) {
      const clientIp = this.getClientIp(request);
      if (whitelist.includes(clientIp)) {
        return true;
      }
    }

    // Check path patterns
    if (skipPaths) {
      const path = request.path;
      if (skipPaths.some(pattern => pattern.test(path))) {
        return true;
      }
    }

    // Check for health check endpoints
    if (request.path === '/health' || request.path === '/metrics') {
      return true;
    }

    return false;
  }

  /**
   * Get tier from user or request
   */
  static getTierFromRequest(request: any): string {
    // Check user subscription
    if (request.user?.subscription?.tier) {
      return request.user.subscription.tier;
    }

    // Check API key tier
    if (request.apiKey?.tier) {
      return request.apiKey.tier;
    }

    // Default to anonymous for unauthenticated
    return request.user ? 'free' : 'anonymous';
  }
}