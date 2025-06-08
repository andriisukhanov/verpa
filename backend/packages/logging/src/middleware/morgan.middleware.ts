import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as morgan from 'morgan';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  private morganMiddleware: any;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MorganMiddleware');

    // Custom token for request ID
    morgan.token('request-id', (req: any) => req.id || '-');
    
    // Custom token for user ID
    morgan.token('user-id', (req: any) => req.user?.id || '-');
    
    // Custom token for response time in milliseconds
    morgan.token('response-time-ms', (req: any, res: any) => {
      const start = req._startTime;
      if (!start) return '-';
      const duration = Date.now() - start;
      return duration.toString();
    });

    // Define custom format
    const format = ':request-id :user-id :method :url :status :response-time-ms ms - :res[content-length]';

    // Create morgan middleware with custom stream
    this.morganMiddleware = morgan(format, {
      stream: {
        write: (message: string) => {
          // Remove trailing newline
          const trimmedMessage = message.trim();
          
          // Parse the log message
          const parts = trimmedMessage.split(' ');
          const requestId = parts[0];
          const userId = parts[1];
          const method = parts[2];
          const url = parts[3];
          const status = parseInt(parts[4]);
          const responseTime = parseInt(parts[5]);

          // Log based on status code
          if (status >= 500) {
            this.logger.error('HTTP Request Error', {
              requestId,
              userId: userId !== '-' ? userId : undefined,
              method,
              url,
              status,
              responseTime,
            });
          } else if (status >= 400) {
            this.logger.warn('HTTP Request Warning', {
              requestId,
              userId: userId !== '-' ? userId : undefined,
              method,
              url,
              status,
              responseTime,
            });
          } else {
            this.logger.http('HTTP Request', {
              requestId,
              userId: userId !== '-' ? userId : undefined,
              method,
              url,
              status,
              responseTime,
            });
          }
        },
      },
      skip: (req: Request, res: Response) => {
        // Skip logging for health checks
        return req.path === '/health' || req.path === '/metrics';
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Store start time
    (req as any)._startTime = Date.now();
    
    // Apply morgan middleware
    this.morganMiddleware(req, res, next);
  }
}