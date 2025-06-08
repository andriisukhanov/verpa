import { LogMetadata } from '../interfaces/logger.interface';

export function LogAsync(options?: {
  message?: string;
  level?: 'debug' | 'info' | 'warn';
  includeArgs?: boolean;
  includeResult?: boolean;
  metadata?: LogMetadata;
}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      const logger = this.logger || console;
      const level = options?.level || 'debug';
      const message = options?.message || `${className}.${methodName}`;
      
      const startMetadata: LogMetadata = {
        class: className,
        method: methodName,
        ...options?.metadata,
      };

      if (options?.includeArgs) {
        startMetadata.args = args;
      }

      logger[level](`${message} - Started`, startMetadata);

      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        const completeMetadata: LogMetadata = {
          class: className,
          method: methodName,
          duration,
          ...options?.metadata,
        };

        if (options?.includeResult) {
          completeMetadata.result = result;
        }

        logger[level](`${message} - Completed`, completeMetadata);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(`${message} - Failed`, error, {
          class: className,
          method: methodName,
          duration,
          ...options?.metadata,
        });

        throw error;
      }
    };

    return descriptor;
  };
}