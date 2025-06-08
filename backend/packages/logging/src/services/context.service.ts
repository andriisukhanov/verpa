import { Injectable } from '@nestjs/common';
import { createNamespace, getNamespace, Namespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext, LogMetadata } from '../interfaces';

@Injectable()
export class ContextService {
  private readonly namespace: Namespace;
  private readonly NAMESPACE_NAME = 'verpa-logging';

  constructor() {
    this.namespace = getNamespace(this.NAMESPACE_NAME) || createNamespace(this.NAMESPACE_NAME);
  }

  run<T>(fn: () => T): T {
    return this.namespace.run(fn);
  }

  runAndReturn<T>(fn: () => Promise<T>): Promise<T> {
    return this.namespace.runAndReturn(fn);
  }

  setRequestContext(context: Partial<RequestContext>): void {
    this.namespace.set('requestContext', {
      requestId: context.requestId || uuidv4(),
      correlationId: context.correlationId || context.requestId || uuidv4(),
      ...context,
    });
  }

  getRequestContext(): RequestContext | undefined {
    return this.namespace.get('requestContext');
  }

  setUserId(userId: string): void {
    const context = this.getRequestContext();
    if (context) {
      context.userId = userId;
      this.namespace.set('requestContext', context);
    }
  }

  setMetadata(key: string, value: any): void {
    const metadata = this.namespace.get('metadata') || {};
    metadata[key] = value;
    this.namespace.set('metadata', metadata);
  }

  getMetadata(): Record<string, any> {
    return this.namespace.get('metadata') || {};
  }

  getContext(): LogMetadata {
    const requestContext = this.getRequestContext();
    const metadata = this.getMetadata();

    return {
      ...metadata,
      requestId: requestContext?.requestId,
      correlationId: requestContext?.correlationId,
      sessionId: requestContext?.sessionId,
      userId: requestContext?.userId,
      ip: requestContext?.ip,
      userAgent: requestContext?.userAgent,
    };
  }

  clear(): void {
    this.namespace.set('requestContext', undefined);
    this.namespace.set('metadata', {});
  }
}