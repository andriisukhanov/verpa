import { Logger } from '@nestjs/common';
import { Request } from 'express';
import winston from 'winston';
import { BaseException } from '../exceptions/base.exception';

export interface ErrorLoggerOptions {
  logErrors: boolean;
  sendToSentry: boolean;
  includeStackTrace: boolean;
  logFile?: string;
}

export class ErrorLogger {
  private readonly logger = new Logger(ErrorLogger.name);
  private readonly winstonLogger: winston.Logger;

  constructor(public readonly options: ErrorLoggerOptions) {
    this.winstonLogger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });

    if (options.logFile) {
      this.winstonLogger.add(
        new winston.transports.File({
          filename: options.logFile,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
      );
    }
  }

  logError(exception: unknown, request: Request, errorResponse: any): void {
    if (!this.options.logErrors) return;

    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'],
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        body: this.sanitizeBody(request.body),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      error: this.formatError(exception),
      response: errorResponse,
      service: process.env.SERVICE_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };

    if (exception instanceof BaseException) {
      this.logger.warn(`Business Exception: ${exception.code}`, logData);
    } else if (exception instanceof Error) {
      this.logger.error(`System Error: ${exception.message}`, exception.stack, logData);
      this.winstonLogger.error('System Error', { ...logData, stack: exception.stack });
    } else {
      this.logger.error('Unknown Error', logData);
      this.winstonLogger.error('Unknown Error', logData);
    }
  }

  private formatError(exception: unknown): any {
    if (exception instanceof BaseException) {
      return {
        type: 'BaseException',
        code: exception.code,
        message: exception.message,
        details: exception.getErrorDetails(),
      };
    } else if (exception instanceof Error) {
      return {
        type: exception.constructor.name,
        message: exception.message,
        stack: this.options.includeStackTrace ? exception.stack : undefined,
      };
    } else {
      return {
        type: 'Unknown',
        value: exception,
      };
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      } else if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}