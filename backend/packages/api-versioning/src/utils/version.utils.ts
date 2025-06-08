import * as semver from 'semver';
import { VERSION_PREFIX } from './version.constants';

export class VersionUtils {
  static normalizeVersion(version: string): string {
    // Remove prefix if present
    if (version.startsWith(VERSION_PREFIX)) {
      version = version.slice(VERSION_PREFIX.length);
    }

    // Ensure it's a valid version
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return version;
  }

  static isValidVersion(version: string): boolean {
    // Check if it's a simple numeric version (1, 2, 3) or semver
    return /^\d+$/.test(version) || semver.valid(`${version}.0.0`) !== null;
  }

  static compareVersions(v1: string, v2: string): number {
    const normalized1 = this.normalizeVersion(v1);
    const normalized2 = this.normalizeVersion(v2);

    // If simple numeric versions
    if (/^\d+$/.test(normalized1) && /^\d+$/.test(normalized2)) {
      return parseInt(normalized1) - parseInt(normalized2);
    }

    // Convert to semver for comparison
    const semver1 = this.toSemver(normalized1);
    const semver2 = this.toSemver(normalized2);

    return semver.compare(semver1, semver2);
  }

  static toSemver(version: string): string {
    if (semver.valid(version)) {
      return version;
    }

    // Convert simple version to semver
    if (/^\d+$/.test(version)) {
      return `${version}.0.0`;
    }

    throw new Error(`Cannot convert version to semver: ${version}`);
  }

  static isVersionSupported(
    requestedVersion: string,
    supportedVersions: string[],
  ): boolean {
    const normalized = this.normalizeVersion(requestedVersion);
    return supportedVersions.some(
      (supported) => this.normalizeVersion(supported) === normalized,
    );
  }

  static selectBestVersion(
    requestedVersion: string | undefined,
    supportedVersions: string[],
    defaultVersion: string,
  ): string {
    if (!requestedVersion) {
      return defaultVersion;
    }

    const normalized = this.normalizeVersion(requestedVersion);

    // Exact match
    if (this.isVersionSupported(normalized, supportedVersions)) {
      return normalized;
    }

    // Find closest lower version
    const sortedVersions = supportedVersions
      .map((v) => this.normalizeVersion(v))
      .sort((a, b) => this.compareVersions(b, a)); // Sort descending

    for (const version of sortedVersions) {
      if (this.compareVersions(version, normalized) <= 0) {
        return version;
      }
    }

    return defaultVersion;
  }

  static extractVersionFromUrl(url: string, prefix: string = VERSION_PREFIX): string | undefined {
    const regex = new RegExp(`/${prefix}(\\d+(?:\\.\\d+)?)`);
    const match = url.match(regex);
    return match ? match[1] : undefined;
  }

  static buildVersionedUrl(baseUrl: string, version: string, prefix: string = VERSION_PREFIX): string {
    const versionSegment = `${prefix}${version}`;
    
    // If baseUrl already contains a version, replace it
    const existingVersionRegex = new RegExp(`/${prefix}\\d+(?:\\.\\d+)?`);
    if (existingVersionRegex.test(baseUrl)) {
      return baseUrl.replace(existingVersionRegex, `/${versionSegment}`);
    }

    // Otherwise, prepend the version
    return `/${versionSegment}${baseUrl}`;
  }

  static isVersionDeprecated(
    version: string,
    deprecatedVersions: string[],
  ): boolean {
    const normalized = this.normalizeVersion(version);
    return deprecatedVersions.some(
      (deprecated) => this.normalizeVersion(deprecated) === normalized,
    );
  }

  static generateDeprecationMessage(
    version: string,
    deprecationDate?: Date,
    removalDate?: Date,
    migrationGuide?: string,
  ): string {
    let message = `API version ${version} is deprecated`;

    if (deprecationDate) {
      message += ` since ${deprecationDate.toISOString()}`;
    }

    if (removalDate) {
      message += ` and will be removed on ${removalDate.toISOString()}`;
    }

    if (migrationGuide) {
      message += `. Migration guide: ${migrationGuide}`;
    }

    return message;
  }
}