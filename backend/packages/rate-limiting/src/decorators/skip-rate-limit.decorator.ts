import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_SKIP } from '../utils/rate-limit.constants';

export const SkipRateLimit = (): MethodDecorator & ClassDecorator => {
  return SetMetadata(RATE_LIMIT_SKIP, true);
};