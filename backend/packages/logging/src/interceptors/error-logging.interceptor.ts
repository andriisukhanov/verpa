import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ErrorLoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const className = context.getClass().name;
        const handlerName = context.getHandler().name;

        const errorMetadata = {
          class: className,
          handler: handlerName,
          method: request.method,
          path: request.url,
          body: request.body,
          query: request.query,
          params: request.params,
          userId: request.user?.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        };

        if (error instanceof HttpException) {
          const status = error.getStatus();
          const response = error.getResponse();

          if (status >= 500) {
            this.logger.error('Server error occurred', error, {
              ...errorMetadata,
              statusCode: status,
              response,
            });
          } else if (status >= 400) {
            this.logger.warn('Client error occurred', {
              ...errorMetadata,
              statusCode: status,
              response,
              message: error.message,
            });
          }
        } else {
          // Unexpected error
          this.logger.error('Unexpected error occurred', error, {
            ...errorMetadata,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          });
        }

        // Re-throw the error
        return throwError(() => error);
      }),
    );
  }
}