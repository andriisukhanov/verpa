export interface RequestContext {
  requestId: string;
  correlationId?: string;
  sessionId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  query?: any;
  body?: any;
  headers?: any;
}

export interface ExecutionContext {
  class: string;
  handler: string;
  args?: any[];
}

export interface PerformanceContext {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface ErrorContext {
  error: Error;
  code?: string;
  statusCode?: number;
  stack?: string;
  cause?: any;
}

export interface SecurityContext {
  action: string;
  resource?: string;
  granted?: boolean;
  reason?: string;
  threat?: string;
}

export interface BusinessContext {
  event: string;
  entity?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface LogContext {
  request?: RequestContext;
  execution?: ExecutionContext;
  performance?: PerformanceContext;
  error?: ErrorContext;
  security?: SecurityContext;
  business?: BusinessContext;
  custom?: Record<string, any>;
}