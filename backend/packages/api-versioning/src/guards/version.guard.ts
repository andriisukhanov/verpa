import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VERSION_METADATA, VERSION_OPTIONS_METADATA } from '../utils/version.constants';
import { VersionUtils } from '../utils/version.utils';
import { ApiVersionOptions } from '../utils/version.types';

@Injectable()
export class VersionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get version metadata from handler or controller
    const handlerVersion = this.reflector.get<string | string[]>(VERSION_METADATA, handler);
    const controllerVersion = this.reflector.get<string | string[]>(VERSION_METADATA, controller);
    const supportedVersions = this.extractVersions(handlerVersion || controllerVersion);

    if (!supportedVersions || supportedVersions.length === 0) {
      // No version restriction
      return true;
    }

    const requestVersion = request.apiVersion || request.version;
    if (!requestVersion) {
      throw new BadRequestException('API version is required for this endpoint');
    }

    // Check if the requested version is supported
    const isSupported = supportedVersions.some(
      (version) => VersionUtils.normalizeVersion(version) === VersionUtils.normalizeVersion(requestVersion),
    );

    if (!isSupported) {
      throw new BadRequestException(
        `API version ${requestVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
      );
    }

    // Get version options
    const handlerOptions = this.reflector.get<ApiVersionOptions>(VERSION_OPTIONS_METADATA, handler);
    const controllerOptions = this.reflector.get<ApiVersionOptions>(VERSION_OPTIONS_METADATA, controller);
    const options = handlerOptions || controllerOptions;

    if (options) {
      // Store version info in request for later use
      request.versionInfo = {
        version: requestVersion,
        isDeprecated: options.deprecated || false,
        deprecationDate: options.deprecationDate,
        removalDate: options.removalDate,
        migrationGuide: options.migrationGuide,
      };
    }

    return true;
  }

  private extractVersions(version: string | string[] | undefined): string[] {
    if (!version) {
      return [];
    }
    return Array.isArray(version) ? version : [version];
  }
}