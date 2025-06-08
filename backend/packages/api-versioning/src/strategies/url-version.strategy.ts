import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { VersionStrategy } from './version.strategy';
import { VersioningType } from '../utils/version.types';
import { VERSION_PREFIX } from '../utils/version.constants';
import { VersionUtils } from '../utils/version.utils';

@Injectable()
export class UrlVersionStrategy extends VersionStrategy {
  type = VersioningType.URI;

  constructor(private readonly prefix: string = VERSION_PREFIX) {
    super();
  }

  extractVersion(request: Request): string | undefined {
    return VersionUtils.extractVersionFromUrl(request.path, this.prefix);
  }

  applyVersion(request: Request, version: string): void {
    // Store the version in the request for later use
    (request as any).urlVersion = version;
  }
}