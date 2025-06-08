import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { VersioningOptions } from './utils/version.types';
import { VersionGuard } from './guards/version.guard';
import { VersionSelectorInterceptor } from './interceptors/version-selector.interceptor';
import { DeprecationWarningInterceptor } from './interceptors/deprecation-warning.interceptor';

@Global()
@Module({})
export class ApiVersioningModule {
  static forRoot(options: VersioningOptions): DynamicModule {
    const providers = [
      {
        provide: APP_INTERCEPTOR,
        useValue: new VersionSelectorInterceptor(options),
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: DeprecationWarningInterceptor,
      },
    ];

    // Add version guard if needed
    if (options.supportedVersions && options.supportedVersions.length > 0) {
      providers.push({
        provide: APP_GUARD,
        useClass: VersionGuard,
      });
    }

    return {
      module: ApiVersioningModule,
      providers,
      exports: [],
    };
  }
}