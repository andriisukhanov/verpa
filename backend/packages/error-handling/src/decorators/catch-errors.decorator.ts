import { Logger } from '@nestjs/common';
import { BaseException } from '../exceptions/base.exception';
import { SystemException } from '../exceptions/system.exceptions';

export interface CatchErrorsOptions {
  logErrors?: boolean;
  rethrow?: boolean;
  defaultMessage?: string;
}

export function CatchErrors(options: CatchErrorsOptions = {}): MethodDecorator {
  const logger = new Logger('CatchErrors');
  const { logErrors = true, rethrow = true, defaultMessage = 'An error occurred' } = options;

  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        if (result instanceof Promise) {
          return await result;
        }
        return result;
      } catch (error) {
        const methodName = `${target.constructor.name}.${String(propertyKey)}`;
        
        if (logErrors) {
          logger.error(
            `Error in ${methodName}`,
            error instanceof Error ? error.stack : error,
          );
        }

        if (rethrow) {
          if (error instanceof BaseException) {
            throw error;
          } else if (error instanceof Error) {
            throw new SystemException(
              error.message || defaultMessage,
              { method: methodName, originalError: error.message },
            );
          } else {
            throw new SystemException(
              defaultMessage,
              { method: methodName, error },
            );
          }
        }

        return null;
      }
    };

    return descriptor;
  };
}