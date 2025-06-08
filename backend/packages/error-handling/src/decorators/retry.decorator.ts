import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'fixed' | 'exponential';
  maxDelay?: number;
  retryIf?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

export function Retry(options: RetryOptions = {}): MethodDecorator {
  const logger = new Logger('Retry');
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    maxDelay = 30000,
    retryIf = () => true,
    onRetry,
  } = options;

  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const methodName = `${target.constructor.name}.${String(propertyKey)}`;
      let lastError: any;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = originalMethod.apply(this, args);
          if (result instanceof Promise) {
            return await result;
          }
          return result;
        } catch (error) {
          lastError = error;

          if (attempt === maxAttempts || !retryIf(error)) {
            throw error;
          }

          const retryDelay = backoff === 'exponential'
            ? Math.min(delay * Math.pow(2, attempt - 1), maxDelay)
            : delay;

          logger.warn(
            `Retry attempt ${attempt}/${maxAttempts} for ${methodName} after ${retryDelay}ms`,
            { error: error instanceof Error ? error.message : error },
          );

          if (onRetry) {
            onRetry(error, attempt);
          }

          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}