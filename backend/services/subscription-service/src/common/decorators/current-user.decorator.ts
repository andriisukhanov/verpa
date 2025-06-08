import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // For testing, return a mock user
    return request.user || { id: 'test-user-123', email: 'test@example.com' };
  },
);