export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: IApiError;
  timestamp: Date;
  path?: string;
}

export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface IHealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: IServiceHealth[];
  version: string;
  uptime: number;
}

export interface IServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}