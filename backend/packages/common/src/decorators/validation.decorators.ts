import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidationUtils } from '../utils';
import { VALIDATION_RULES } from '../constants';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    return ValidationUtils.isValidPassword(password);
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: IsStrongPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidUsername', async: false })
export class IsValidUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: string): boolean {
    return ValidationUtils.isValidUsername(username);
  }

  defaultMessage(): string {
    return `Username must be ${VALIDATION_RULES.USERNAME.MIN_LENGTH}-${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters and contain only letters, numbers, hyphens and underscores`;
  }
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: IsValidUsernameConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPhone', async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string): boolean {
    return ValidationUtils.isValidPhone(phone);
  }

  defaultMessage(): string {
    return 'Please enter a valid phone number';
  }
}

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: IsValidPhoneConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidObjectId', async: false })
export class IsValidObjectIdConstraint implements ValidatorConstraintInterface {
  validate(id: string): boolean {
    return ValidationUtils.isValidObjectId(id);
  }

  defaultMessage(): string {
    return 'Invalid ID format';
  }
}

export function IsValidObjectId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidObjectId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: IsValidObjectIdConstraint,
    });
  };
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: {
        validate(value: any): boolean {
          if (!(value instanceof Date)) return false;
          return value.getTime() > Date.now();
        },
        defaultMessage(): string {
          return 'Date must be in the future';
        },
      },
    });
  };
}

export function IsPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPastDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: {
        validate(value: any): boolean {
          if (!(value instanceof Date)) return false;
          return value.getTime() < Date.now();
        },
        defaultMessage(): string {
          return 'Date must be in the past';
        },
      },
    });
  };
}

export function IsTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTimezone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      validator: {
        validate(value: any): boolean {
          if (typeof value !== 'string') return false;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(): string {
          return 'Invalid timezone';
        },
      },
    });
  };
}

export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions || {},
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints;
          return `${propertyName} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}