import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { BaseException, ErrorDetails } from '../exceptions/base.exception';
import { ErrorLogger } from '../utils/error-logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly errorLogger: ErrorLogger;

  constructor(options?: {
    logErrors?: boolean;
    sendToSentry?: boolean;
    includeStackTrace?: boolean;
  }) {
    this.errorLogger = new ErrorLogger({
      logErrors: options?.logErrors ?? true,
      sendToSentry: options?.sendToSentry ?? false,
      includeStackTrace: options?.includeStackTrace ?? false,
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorResponse } = this.getErrorResponse(exception, request);

    // Log the error
    this.errorLogger.logError(exception, request, errorResponse);

    // Send error to monitoring service (e.g., Sentry)
    if (this.errorLogger.options.sendToSentry && status >= 500) {
      this.sendToMonitoring(exception, request, errorResponse);
    }

    // Send response
    response.status(status).json(errorResponse);
  }

  private getErrorResponse(exception: unknown, request: Request): {
    status: number;
    errorResponse: any;
  } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any;

    if (exception instanceof BaseException) {
      // Handle our custom exceptions
      status = exception.getStatus();
      const errorDetails = exception.getErrorDetails();
      errorResponse = {
        ...errorDetails,
        path: request.url,
        method: request.method,
        timestamp: errorDetails.timestamp || new Date(),
      };
    } else if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'object') {
        errorResponse = {
          code: 'HTTP_EXCEPTION',
          ...response,
          path: request.url,
          method: request.method,
          timestamp: new Date(),
        };
      } else {
        errorResponse = {
          code: 'HTTP_EXCEPTION',
          message: response,
          path: request.url,
          method: request.method,
          timestamp: new Date(),
        };
      }
    } else if (exception instanceof Error) {
      // Handle standard errors
      errorResponse = {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: this.errorLogger.options.includeStackTrace ? {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        } : undefined,
        path: request.url,
        method: request.method,
        timestamp: new Date(),
      };
    } else {
      // Handle unknown errors
      errorResponse = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        path: request.url,
        method: request.method,
        timestamp: new Date(),
      };
    }

    // Add correlation ID if available
    const correlationId = request.headers['x-correlation-id'] as string;
    if (correlationId) {
      errorResponse.correlationId = correlationId;
    }

    return { status, errorResponse };
  }

  private sendToMonitoring(exception: unknown, request: Request, errorResponse: any): void {
    Sentry.withScope((scope) => {
      scope.setTag('service', process.env.SERVICE_NAME || 'unknown');
      scope.setContext('request', {
        url: request.url,
        method: request.method,
        headers: request.headers,
        query: request.query,
        body: request.body,
      });
      scope.setContext('error_response', errorResponse);
      
      if (errorResponse.correlationId) {
        scope.setTag('correlation_id', errorResponse.correlationId);
      }

      if (exception instanceof Error) {
        Sentry.captureException(exception);
      } else {
        Sentry.captureMessage(JSON.stringify(exception), 'error');
      }
    });
  }
}