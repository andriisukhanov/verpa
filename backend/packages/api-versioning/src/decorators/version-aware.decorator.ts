import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VersionInfo } from '../utils/version.types';

export const CurrentVersion = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiVersion || request.version;
  },
);

export const VersionInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): VersionInfo | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.versionInfo;
  },
);