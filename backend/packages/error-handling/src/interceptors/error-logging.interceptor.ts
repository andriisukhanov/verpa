import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as string;

    return next.handle().pipe(
      catchError(error => {
        const logContext = {
          correlationId,
          method: request.method,
          url: request.url,
          controller: context.getClass().name,
          handler: context.getHandler().name,
        };

        this.logger.error(
          `Error in ${logContext.controller}.${logContext.handler}`,
          error.stack,
          logContext,
        );

        return throwError(() => error);
      }),
    );
  }
}