import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfig {
  dsn: string;
  environment: string;
  serviceName: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
}

export function initializeSentry(config: SentryConfig): void {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    debug: config.debug || false,
    release: config.release,
    sampleRate: config.sampleRate || 1.0,
    tracesSampleRate: config.tracesSampleRate || 0.1,
    profilesSampleRate: config.profilesSampleRate || 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        router: true,
        methods: true,
      }),
      new ProfilingIntegration(),
    ],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        event.request.cookies = undefined;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-api-key'];
        }
      }

      // Add service name as tag
      if (!event.tags) event.tags = {};
      event.tags.service = config.serviceName;

      return event;
    },
    beforeSendTransaction(event) {
      // Add service name to transactions
      if (!event.tags) event.tags = {};
      event.tags.service = config.serviceName;

      return event;
    },
  });
}

export function setupSentryErrorHandler(): void {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    // Give Sentry time to send the error
    setTimeout(() => process.exit(1), 2000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });
}