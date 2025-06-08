import { Injectable } from '@nestjs/common';
import { 
  LoggerService, 
  Log, 
  LogAsync, 
  LogPerformance, 
  LogError,
  PerformanceService,
  ContextService,
} from '@verpa/logging';

/**
 * Examples of using the Verpa logging system
 */
@Injectable()
export class LoggingExamples {
  constructor(
    private readonly logger: LoggerService,
    private readonly performanceService: PerformanceService,
    private readonly contextService: ContextService,
  ) {
    // Set the context for all logs from this service
    this.logger.setContext('LoggingExamples');
  }

  /**
   * Basic logging examples
   */
  basicLogging() {
    // Simple log messages
    this.logger.error('This is an error message');
    this.logger.warn('This is a warning');
    this.logger.info('This is an info message');
    this.logger.debug('This is a debug message');

    // Logging with metadata
    this.logger.info('User action performed', {
      userId: '123',
      action: 'profile_update',
      changes: {
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    // Logging errors with context
    try {
      throw new Error('Something went wrong');
    } catch (error) {
      this.logger.error('Operation failed', error, {
        operation: 'database_query',
        query: 'SELECT * FROM users',
        userId: '123',
      });
    }
  }

  /**
   * Using decorators for automatic logging
   */
  @Log('Processing user data')
  processUserData(userId: string, data: any) {
    // Method execution will be automatically logged
    return { processed: true };
  }

  @LogAsync({
    message: 'Fetching data from external API',
    level: 'info',
    includeArgs: true,
    includeResult: false,
  })
  async fetchExternalData(apiKey: string, endpoint: string) {
    // Async method with automatic logging
    const response = await fetch(`https://api.example.com/${endpoint}`, {
      headers: { 'X-API-Key': apiKey },
    });
    return response.json();
  }

  @LogPerformance({
    warningThreshold: 1000, // Warn if takes > 1 second
    errorThreshold: 5000,   // Error if takes > 5 seconds
    includeMemory: true,
    includeCpu: true,
  })
  async performHeavyComputation(data: any[]) {
    // Performance will be automatically tracked
    return data.map(item => {
      // Simulate heavy computation
      return item;
    });
  }

  @LogError({
    rethrow: true,
    level: 'error',
    message: 'Failed to process payment',
    includeStack: true,
  })
  async processPayment(orderId: string, amount: number) {
    // Errors will be automatically logged
    if (amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    // Process payment...
  }

  /**
   * Using context for request tracking
   */
  async handleRequest(requestId: string, userId: string) {
    // Set request context
    this.contextService.setRequestContext({
      requestId,
      userId,
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    });

    // Add custom metadata
    this.contextService.setMetadata('tenant', 'acme-corp');
    this.contextService.setMetadata('feature', 'payment-processing');

    // All subsequent logs will include this context
    this.logger.info('Processing payment request');
    
    await this.processOrder();
    
    // Context is automatically included
    this.logger.info('Payment completed');
  }

  private async processOrder() {
    // Context is preserved across method calls
    this.logger.debug('Validating order');
  }

  /**
   * Child loggers for component-specific logging
   */
  createChildLoggers() {
    // Create a child logger with additional context
    const paymentLogger = this.logger.child({
      module: 'PaymentProcessor',
      version: '2.0',
    });

    paymentLogger.info('Processing payment', {
      amount: 100,
      currency: 'USD',
    });

    // Create another child for a specific batch
    const batchLogger = paymentLogger.child({
      batchId: 'batch-123',
      batchSize: 1000,
    });

    batchLogger.info('Starting batch processing');
  }

  /**
   * Performance tracking examples
   */
  async trackPerformance() {
    // Manual timer
    const timer = this.performanceService.startTimer();
    
    await this.doSomeWork();
    
    timer.end('data-processing', {
      recordsProcessed: 1000,
      source: 'csv-import',
    });

    // Measure async operation
    const result = await this.performanceService.measureAsync(
      'database-query',
      async () => {
        return await this.queryDatabase();
      },
      { query: 'complex-aggregation' }
    );

    // Check resource usage
    this.performanceService.checkMemoryUsage();
    this.performanceService.checkCpuUsage();
  }

  /**
   * Structured logging for business events
   */
  logBusinessEvents() {
    // User registration
    this.logger.info('User registered', {
      event: 'user.registered',
      userId: 'user-123',
      email: 'user@example.com',
      registrationMethod: 'email',
      referralSource: 'organic',
    });

    // Order processing
    this.logger.info('Order processed', {
      event: 'order.completed',
      orderId: 'order-456',
      userId: 'user-123',
      amount: 299.99,
      currency: 'USD',
      items: 3,
      paymentMethod: 'credit_card',
      shippingMethod: 'express',
    });

    // Security events
    this.logger.warn('Suspicious activity detected', {
      event: 'security.suspicious_login',
      userId: 'user-789',
      ip: '192.168.1.100',
      reason: 'multiple_failed_attempts',
      attempts: 5,
      action: 'account_locked',
    });
  }

  /**
   * Logging with sampling (for high-volume scenarios)
   */
  highVolumeLogging() {
    // This would be configured in the logging module
    // Only 10% of debug logs would be recorded in production
    for (let i = 0; i < 10000; i++) {
      this.logger.debug('Processing item', {
        itemId: i,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Querying logs programmatically
   */
  async queryLogs() {
    // Search for error logs in the last hour
    const recentErrors = await this.logger.query({
      from: new Date(Date.now() - 60 * 60 * 1000),
      to: new Date(),
      level: 'error' as any,
      limit: 100,
    });

    // Search for logs from a specific user
    const userLogs = await this.logger.query({
      userId: 'user-123',
      from: new Date('2024-01-01'),
      limit: 50,
    });

    // Full-text search
    const searchResults = await this.logger.query({
      search: 'payment failed',
      service: 'payment-service',
      limit: 20,
    });
  }

  private async doSomeWork() {
    // Simulate work
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  private async queryDatabase() {
    // Simulate database query
    return { results: [] };
  }
}