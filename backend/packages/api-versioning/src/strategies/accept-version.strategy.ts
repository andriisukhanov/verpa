import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { VersionStrategy } from './version.strategy';
import { VersioningType } from '../utils/version.types';
import { ACCEPT_VERSION_REGEX } from '../utils/version.constants';

@Injectable()
export class AcceptVersionStrategy extends VersionStrategy {
  type = VersioningType.ACCEPT_HEADER;

  extractVersion(request: Request): string | undefined {
    const acceptHeader = request.headers.accept;
    if (!acceptHeader) {
      return undefined;
    }

    const acceptValue = Array.isArray(acceptHeader) ? acceptHeader[0] : acceptHeader;
    const match = acceptValue.match(ACCEPT_VERSION_REGEX);
    
    return match ? match[1] : undefined;
  }

  applyVersion(request: Request, version: string): void {
    request.headers.accept = `application/vnd.verpa.v${version}+json`;
  }
}