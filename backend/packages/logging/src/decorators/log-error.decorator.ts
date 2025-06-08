export function LogError(options?: {
  rethrow?: boolean;
  level?: 'error' | 'warn';
  message?: string;
  includeStack?: boolean;
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
      const level = options?.level || 'error';
      const rethrow = options?.rethrow !== false; // Default to true

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const message = options?.message || `Error in ${className}.${methodName}`;
        
        const metadata: any = {
          class: className,
          method: methodName,
          error: {
            name: error.name,
            message: error.message,
          },
        };

        if (options?.includeStack !== false && error.stack) {
          metadata.error.stack = error.stack;
        }

        if (error.code) {
          metadata.error.code = error.code;
        }

        logger[level](message, metadata);

        if (rethrow) {
          throw error;
        }

        return null;
      }
    };

    return descriptor;
  };
}