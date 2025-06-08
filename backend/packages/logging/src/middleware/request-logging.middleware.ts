import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ContextService } from '../services/context.service';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('RequestLoggingMiddleware');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Generate request ID if not present
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    req['id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Set up request context
    this.contextService.run(() => {
      this.contextService.setRequestContext({
        requestId,
        correlationId: req.headers['x-correlation-id'] as string || requestId,
        sessionId: req['session']?.id,
        userId: req['user']?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
      });

      const startTime = Date.now();

      // Log request
      this.logger.http('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        headers: this.sanitizeHeaders(req.headers),
      });

      // Log response
      const originalSend = res.send;
      res.send = function (data) {
        res.send = originalSend;
        const duration = Date.now() - startTime;

        this.logger.http('Outgoing response', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length'),
        });

        return res.send(data);
      }.bind(this);

      next();
    });
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}