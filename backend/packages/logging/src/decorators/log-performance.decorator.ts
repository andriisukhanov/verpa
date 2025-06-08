export function LogPerformance(options?: {
  warningThreshold?: number; // milliseconds
  errorThreshold?: number; // milliseconds
  includeMemory?: boolean;
  includeCpu?: boolean;
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
      const startTime = Date.now();
      const startMemory = options?.includeMemory ? process.memoryUsage() : null;
      const startCpu = options?.includeCpu ? process.cpuUsage() : null;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        const metadata: any = {
          class: className,
          method: methodName,
          duration,
        };

        if (startMemory) {
          const endMemory = process.memoryUsage();
          metadata.memory = {
            heapUsedDelta: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
            heapTotalDelta: (endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024,
            rssDelta: (endMemory.rss - startMemory.rss) / 1024 / 1024,
          };
        }

        if (startCpu) {
          const endCpu = process.cpuUsage(startCpu);
          metadata.cpu = {
            user: endCpu.user / 1000,
            system: endCpu.system / 1000,
          };
        }

        // Log based on thresholds
        if (options?.errorThreshold && duration > options.errorThreshold) {
          logger.error(`Performance issue: ${className}.${methodName}`, metadata);
        } else if (options?.warningThreshold && duration > options.warningThreshold) {
          logger.warn(`Slow operation: ${className}.${methodName}`, metadata);
        } else {
          logger.debug(`Performance: ${className}.${methodName}`, metadata);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`Performance tracking failed: ${className}.${methodName}`, error, {
          class: className,
          method: methodName,
          duration,
        });

        throw error;
      }
    };

    return descriptor;
  };
}