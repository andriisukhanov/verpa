import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse = exception.getResponse();
    
    let validationErrors: any[] = [];
    
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const messages = (exceptionResponse as any).message;
      
      if (Array.isArray(messages)) {
        validationErrors = this.formatValidationErrors(messages);
      } else {
        validationErrors = [{ field: 'general', messages: [messages] }];
      }
    }

    const errorResponse = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: validationErrors,
      path: request.url,
      method: request.method,
      timestamp: new Date(),
      correlationId: request.headers['x-correlation-id'],
    };

    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private formatValidationErrors(errors: any[]): any[] {
    const formatted: any[] = [];

    for (const error of errors) {
      if (typeof error === 'string') {
        formatted.push({
          field: 'general',
          messages: [error],
        });
      } else if (this.isValidationError(error)) {
        formatted.push({
          field: error.property,
          value: error.value,
          messages: Object.values(error.constraints || {}),
          children: error.children?.length ? this.formatValidationErrors(error.children) : undefined,
        });
      }
    }

    return formatted;
  }

  private isValidationError(error: any): error is ValidationError {
    return error && typeof error === 'object' && 'property' in error && 'constraints' in error;
  }
}