import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from '../services/performance.service';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PerformanceInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const timer = this.performanceService.startTimer();

    // Check memory usage periodically
    this.performanceService.checkMemoryUsage();

    return next.handle().pipe(
      tap({
        next: () => {
          timer.end(`${className}.${handlerName}`, {
            method: request.method,
            path: request.url,
          });
        },
        error: (error) => {
          timer.error(`${className}.${handlerName}`, error, {
            method: request.method,
            path: request.url,
          });
        },
      }),
    );
  }
}