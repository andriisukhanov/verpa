import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants';

export interface IValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

export class ValidationException extends BaseException {
  public readonly errors: IValidationError[];

  constructor(errors: IValidationError[] | IValidationError) {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    const message = ValidationException.formatMessage(errorArray);
    const details = { errors: errorArray };
    
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
    this.errors = errorArray;
  }

  private static formatMessage(errors: IValidationError[]): string {
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    const fieldList = errors.map(e => e.field).join(', ');
    return `Validation failed for fields: ${fieldList}`;
  }

  static fromFieldError(
    field: string,
    message: string,
    value?: unknown,
    constraints?: Record<string, string>
  ): ValidationException {
    return new ValidationException({
      field,
      message,
      value,
      constraints,
    });
  }

  static fromMultipleErrors(errors: IValidationError[]): ValidationException {
    return new ValidationException(errors);
  }

  addError(error: IValidationError): void {
    this.errors.push(error);
  }

  hasError(field: string): boolean {
    return this.errors.some(e => e.field === field);
  }

  getError(field: string): IValidationError | undefined {
    return this.errors.find(e => e.field === field);
  }
}

export class RequiredFieldException extends ValidationException {
  constructor(field: string) {
    super({
      field,
      message: `${field} is required`,
      constraints: { required: 'true' },
    });
  }
}

export class InvalidFormatException extends ValidationException {
  constructor(
    field: string,
    expectedFormat: string,
    value?: unknown
  ) {
    super({
      field,
      message: `${field} has invalid format. Expected: ${expectedFormat}`,
      value,
      constraints: { format: expectedFormat },
    });
  }
}

export class OutOfRangeException extends ValidationException {
  constructor(
    field: string,
    min?: number,
    max?: number,
    value?: unknown
  ) {
    let message = `${field} is out of range.`;
    const constraints: Record<string, string> = {};
    
    if (min !== undefined && max !== undefined) {
      message = `${field} must be between ${min} and ${max}`;
      constraints.min = String(min);
      constraints.max = String(max);
    } else if (min !== undefined) {
      message = `${field} must be at least ${min}`;
      constraints.min = String(min);
    } else if (max !== undefined) {
      message = `${field} must be at most ${max}`;
      constraints.max = String(max);
    }
    
    super({
      field,
      message,
      value,
      constraints,
    });
  }
}

export class InvalidEnumValueException extends ValidationException {
  constructor(
    field: string,
    allowedValues: string[],
    value?: unknown
  ) {
    super({
      field,
      message: `${field} must be one of: ${allowedValues.join(', ')}`,
      value,
      constraints: { enum: allowedValues.join(',') },
    });
  }
}