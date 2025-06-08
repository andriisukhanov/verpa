import { Logger } from '@nestjs/common';
import { CircuitBreakerOpenException } from '../exceptions/system.exceptions';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  minimumRequests?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private requestCount = 0;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly name: string,
    private readonly options: Required<CircuitBreakerOptions>,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerOpenException(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.requestCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.minimumRequests) {
        this.transitionToClosed();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.requestCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      this.failures++;
      if (
        this.requestCount >= this.options.minimumRequests &&
        this.failures >= this.options.failureThreshold
      ) {
        this.transitionToOpen();
      }
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    );
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.logger.warn(`Circuit breaker ${this.name} is now OPEN`);
    this.options.onOpen?.();
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;
    this.failures = 0;
    this.logger.log(`Circuit breaker ${this.name} is now HALF_OPEN`);
    this.options.onHalfOpen?.();
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.requestCount = 0;
    this.logger.log(`Circuit breaker ${this.name} is now CLOSED`);
    this.options.onClose?.();
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function CircuitBreakerDecorator(options: CircuitBreakerOptions = {}): MethodDecorator {
  const defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: options.failureThreshold ?? 5,
    resetTimeout: options.resetTimeout ?? 60000, // 1 minute
    monitoringPeriod: options.monitoringPeriod ?? 60000, // 1 minute
    minimumRequests: options.minimumRequests ?? 10,
    onOpen: options.onOpen ?? (() => {}),
    onClose: options.onClose ?? (() => {}),
    onHalfOpen: options.onHalfOpen ?? (() => {}),
  };

  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      let circuitBreaker = circuitBreakers.get(methodName);
      
      if (!circuitBreaker) {
        circuitBreaker = new CircuitBreaker(methodName, defaultOptions);
        circuitBreakers.set(methodName, circuitBreaker);
      }

      return circuitBreaker.execute(async () => {
        const result = originalMethod.apply(this, args);
        if (result instanceof Promise) {
          return await result;
        }
        return result;
      });
    };

    return descriptor;
  };
}