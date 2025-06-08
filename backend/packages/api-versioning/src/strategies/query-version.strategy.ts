import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { VersionStrategy } from './version.strategy';
import { VersioningType } from '../utils/version.types';
import { VERSION_QUERY } from '../utils/version.constants';

@Injectable()
export class QueryVersionStrategy extends VersionStrategy {
  type = VersioningType.QUERY;

  constructor(private readonly queryParam: string = VERSION_QUERY) {
    super();
  }

  extractVersion(request: Request): string | undefined {
    const version = request.query[this.queryParam];
    return Array.isArray(version) ? version[0] : version as string;
  }

  applyVersion(request: Request, version: string): void {
    request.query[this.queryParam] = version;
  }
}