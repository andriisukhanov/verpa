import { SetMetadata } from '@nestjs/common';

export const HEALTH_CHECK_KEY = 'health_check';

export interface HealthCheckMetadata {
  name: string;
  timeout?: number;
  critical?: boolean;
}

export const HealthCheck = (metadata: HealthCheckMetadata) =>
  SetMetadata(HEALTH_CHECK_KEY, metadata);