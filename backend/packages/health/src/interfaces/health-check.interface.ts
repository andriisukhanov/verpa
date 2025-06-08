export interface HealthCheckResult {
  status: 'ok' | 'error';
  details?: any;
  error?: string;
}

export interface HealthCheckOptions {
  timeout?: number;
  retries?: number;
  interval?: number;
}

export interface ServiceHealthInfo {
  service: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: Date;
  checks: {
    [key: string]: HealthCheckResult;
  };
}