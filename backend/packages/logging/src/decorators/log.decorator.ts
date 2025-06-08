import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';

export const Logger = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): LoggerService => {
    const logger = new LoggerService(
      null as any,
      null as any,
      null as any,
      null as any,
    );
    
    if (data) {
      logger.setContext(data);
    } else {
      const className = ctx.getClass().name;
      logger.setContext(className);
    }
    
    return logger;
  },
);

export function Log(message?: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const logger = this.logger || console;
      const className = target.constructor.name;
      const methodName = String(propertyKey);
      const logMessage = message || `${className}.${methodName}`;

      logger.debug(`${logMessage} - Started`, {
        class: className,
        method: methodName,
        args: args.length > 0 ? args : undefined,
      });

      try {
        const result = originalMethod.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              logger.debug(`${logMessage} - Completed`, {
                class: className,
                method: methodName,
              });
              return res;
            })
            .catch((error: Error) => {
              logger.error(`${logMessage} - Failed`, error, {
                class: className,
                method: methodName,
              });
              throw error;
            });
        }

        logger.debug(`${logMessage} - Completed`, {
          class: className,
          method: methodName,
        });

        return result;
      } catch (error) {
        logger.error(`${logMessage} - Failed`, error, {
          class: className,
          method: methodName,
        });
        throw error;
      }
    };

    return descriptor;
  };
}