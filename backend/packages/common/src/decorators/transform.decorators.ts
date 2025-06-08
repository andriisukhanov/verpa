import { Transform, TransformOptions } from 'class-transformer';
import { StringUtils, ValidationUtils } from '../utils';

export function Trim(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }, transformOptions);
}

export function Lowercase(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  }, transformOptions);
}

export function Uppercase(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  }, transformOptions);
}

export function Capitalize(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return StringUtils.capitalize(value);
    }
    return value;
  }, transformOptions);
}

export function SanitizeInput(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return ValidationUtils.sanitizeInput(value);
    }
    return value;
  }, transformOptions);
}

export function ToBoolean(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lower)) return true;
      if (['false', '0', 'no', 'off'].includes(lower)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }, transformOptions);
}

export function ToNumber(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }
    return value;
  }, transformOptions);
}

export function ToDate(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;
    }
    return value;
  }, transformOptions);
}

export function ToArray(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Handle comma-separated values
      if (value.includes(',')) {
        return value.split(',').map((v) => v.trim());
      }
    }
    return [value];
  }, transformOptions);
}

export function RemoveEmpty(transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.filter((v) => v !== null && v !== undefined && v !== '');
    }
    if (typeof value === 'object' && value !== null) {
      const cleaned: Record<string, any> = {};
      Object.entries(value).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          cleaned[key] = val;
        }
      });
      return cleaned;
    }
    return value;
  }, transformOptions);
}

export function Default<T>(defaultValue: T, transformOptions?: TransformOptions): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value;
  }, { toClassOnly: true, ...transformOptions });
}