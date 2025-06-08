import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { VersionStrategy } from './version.strategy';
import { VersioningType } from '../utils/version.types';
import { VERSION_HEADER } from '../utils/version.constants';

@Injectable()
export class HeaderVersionStrategy extends VersionStrategy {
  type = VersioningType.HEADER;

  constructor(private readonly headerName: string = VERSION_HEADER) {
    super();
  }

  extractVersion(request: Request): string | undefined {
    const version = request.headers[this.headerName.toLowerCase()];
    return Array.isArray(version) ? version[0] : version;
  }

  applyVersion(request: Request, version: string): void {
    request.headers[this.headerName.toLowerCase()] = version;
  }
}