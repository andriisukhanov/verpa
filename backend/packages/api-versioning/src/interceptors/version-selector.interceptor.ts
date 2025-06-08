import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { VersioningOptions, VersioningType } from '../utils/version.types';
import { VersionStrategy } from '../strategies/version.strategy';
import { HeaderVersionStrategy } from '../strategies/header-version.strategy';
import { UrlVersionStrategy } from '../strategies/url-version.strategy';
import { QueryVersionStrategy } from '../strategies/query-version.strategy';
import { AcceptVersionStrategy } from '../strategies/accept-version.strategy';
import { VersionUtils } from '../utils/version.utils';
import { DEFAULT_VERSION } from '../utils/version.constants';

@Injectable()
export class VersionSelectorInterceptor implements NestInterceptor {
  private strategies: Map<VersioningType, VersionStrategy> = new Map();

  constructor(private readonly options: VersioningOptions) {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set(
      VersioningType.HEADER,
      new HeaderVersionStrategy(this.options.header),
    );
    this.strategies.set(
      VersioningType.URI,
      new UrlVersionStrategy(this.options.prefix),
    );
    this.strategies.set(
      VersioningType.QUERY,
      new QueryVersionStrategy(this.options.query),
    );
    this.strategies.set(
      VersioningType.ACCEPT_HEADER,
      new AcceptVersionStrategy(),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const types = Array.isArray(this.options.type)
      ? this.options.type
      : [this.options.type];

    let selectedVersion: string | undefined;
    let selectedStrategy: VersioningType | undefined;

    // Try each versioning strategy in order
    for (const type of types) {
      const strategy = this.strategies.get(type);
      if (strategy) {
        const version = strategy.extractVersion(request);
        if (version) {
          selectedVersion = version;
          selectedStrategy = type;
          break;
        }
      }
    }

    // Use default version if no version was found
    if (!selectedVersion && this.options.fallbackToDefault !== false) {
      selectedVersion = this.options.defaultVersion || DEFAULT_VERSION;
    }

    if (selectedVersion) {
      // Validate version
      if (!VersionUtils.isValidVersion(selectedVersion)) {
        selectedVersion = this.options.defaultVersion || DEFAULT_VERSION;
      }

      // Check if version is supported
      if (this.options.supportedVersions) {
        selectedVersion = VersionUtils.selectBestVersion(
          selectedVersion,
          this.options.supportedVersions,
          this.options.defaultVersion || DEFAULT_VERSION,
        );
      }

      // Store version information in request
      request.apiVersion = selectedVersion;
      request.version = selectedVersion;
      request.versionStrategy = selectedStrategy;

      // Check if version is deprecated
      if (
        this.options.deprecatedVersions &&
        VersionUtils.isVersionDeprecated(selectedVersion, this.options.deprecatedVersions)
      ) {
        request.isVersionDeprecated = true;
      }
    }

    return next.handle();
  }
}