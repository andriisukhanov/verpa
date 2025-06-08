import { Request } from 'express';

export function extractRequestInfo(req: Request): any {
  return {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: sanitizeHeaders(req.headers),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
  };
}

export function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token',
  ];
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

export function maskSensitiveData(data: any, fieldsToMask: string[] = []): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    if (masked.hasOwnProperty(key)) {
      if (fieldsToMask.includes(key)) {
        masked[key] = '[MASKED]';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = maskSensitiveData(masked[key], fieldsToMask);
      }
    }
  }

  return masked;
}

export function truncateString(str: string, maxLength: number = 1000): string {
  if (!str || str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '... [truncated]';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}