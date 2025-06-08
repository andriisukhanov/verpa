import { Request } from 'express';
import { VersioningType } from '../utils/version.types';

export abstract class VersionStrategy {
  abstract type: VersioningType;

  abstract extractVersion(request: Request): string | undefined;

  abstract applyVersion(request: Request, version: string): void;
}