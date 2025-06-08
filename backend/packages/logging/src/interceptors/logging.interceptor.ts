import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { ContextService } from '../services/context.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggerService,
    private readonly contextService: ContextService,
  ) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const startTime = Date.now();

    // Set request context
    this.contextService.setRequestContext({
      requestId: request.id || request.headers['x-request-id'],
      correlationId: request.headers['x-correlation-id'],
      sessionId: request.session?.id,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      path: request.url,
    });

    // Log request
    this.logger.info(`Request started: ${request.method} ${request.url}`, {
      class: className,
      handler: handlerName,
      query: request.query,
      params: request.params,
      headers: this.sanitizeHeaders(request.headers),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        
        // Log response
        this.logger.info(`Request completed: ${request.method} ${request.url}`, {
          class: className,
          handler: handlerName,
          statusCode: response.statusCode,
          duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log error
        this.logger.error(`Request failed: ${request.method} ${request.url}`, error, {
          class: className,
          handler: handlerName,
          statusCode: error.status || 500,
          duration,
        });

        throw error;
      }),
    );
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