import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp?: Date;
  path?: string;
  correlationId?: string;
}

export abstract class BaseException extends HttpException {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: any,
    correlationId?: string,
  ) {
    const errorDetails: ErrorDetails = {
      code,
      message,
      details,
      timestamp: new Date(),
      correlationId,
    };

    super(errorDetails, status);
    this.code = code;
    this.timestamp = errorDetails.timestamp;
    this.correlationId = correlationId;
  }

  getErrorDetails(): ErrorDetails {
    return this.getResponse() as ErrorDetails;
  }
}