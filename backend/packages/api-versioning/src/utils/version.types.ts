export enum VersioningType {
  URI = 'uri',
  HEADER = 'header',
  QUERY = 'query',
  ACCEPT_HEADER = 'accept',
  CUSTOM = 'custom',
}

export interface VersioningOptions {
  type: VersioningType | VersioningType[];
  defaultVersion?: string;
  header?: string;
  query?: string;
  prefix?: string;
  deprecatedVersions?: string[];
  supportedVersions?: string[];
  fallbackToDefault?: boolean;
}

export interface ApiVersionOptions {
  version: string | string[];
  deprecated?: boolean;
  deprecationDate?: Date;
  removalDate?: Date;
  migrationGuide?: string;
}

export interface VersionInfo {
  version: string;
  isDeprecated: boolean;
  deprecationDate?: Date;
  removalDate?: Date;
  migrationGuide?: string;
}

export interface VersionSelectionResult {
  selectedVersion: string;
  requestedVersion?: string;
  strategy: VersioningType;
  isDefaultVersion: boolean;
}