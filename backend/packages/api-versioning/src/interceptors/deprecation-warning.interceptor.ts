import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { DEPRECATION_HEADER, SUNSET_HEADER } from '../utils/version.constants';
import { VersionUtils } from '../utils/version.utils';

@Injectable()
export class DeprecationWarningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // Check if version is deprecated
        if (request.isVersionDeprecated || request.versionInfo?.isDeprecated) {
          const versionInfo = request.versionInfo;
          
          if (versionInfo) {
            // Add deprecation headers
            const deprecationMessage = VersionUtils.generateDeprecationMessage(
              versionInfo.version,
              versionInfo.deprecationDate,
              versionInfo.removalDate,
              versionInfo.migrationGuide,
            );
            
            response.setHeader(DEPRECATION_HEADER, deprecationMessage);

            // Add Sunset header if removal date is known
            if (versionInfo.removalDate) {
              response.setHeader(
                SUNSET_HEADER,
                versionInfo.removalDate.toUTCString(),
              );
            }

            // Add Link header for migration guide
            if (versionInfo.migrationGuide) {
              response.setHeader(
                'Link',
                `<${versionInfo.migrationGuide}>; rel="deprecation"`,
              );
            }
          } else {
            // Simple deprecation warning
            response.setHeader(
              DEPRECATION_HEADER,
              `API version ${request.apiVersion} is deprecated`,
            );
          }

          // Log deprecation usage
          console.warn(
            `Deprecated API version ${request.apiVersion} was used`,
            {
              path: request.path,
              method: request.method,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
            },
          );
        }
      }),
    );
  }
}