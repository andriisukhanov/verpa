import { VersionUtils } from './version.utils';

describe('VersionUtils', () => {
  describe('normalizeVersion', () => {
    it('should remove version prefix', () => {
      expect(VersionUtils.normalizeVersion('v1')).toBe('1');
      expect(VersionUtils.normalizeVersion('v2.1')).toBe('2.1');
    });

    it('should return version without prefix unchanged', () => {
      expect(VersionUtils.normalizeVersion('1')).toBe('1');
      expect(VersionUtils.normalizeVersion('2.1.0')).toBe('2.1.0');
    });

    it('should throw error for invalid version', () => {
      expect(() => VersionUtils.normalizeVersion('invalid')).toThrow();
      expect(() => VersionUtils.normalizeVersion('')).toThrow();
    });
  });

  describe('isValidVersion', () => {
    it('should validate simple numeric versions', () => {
      expect(VersionUtils.isValidVersion('1')).toBe(true);
      expect(VersionUtils.isValidVersion('10')).toBe(true);
      expect(VersionUtils.isValidVersion('999')).toBe(true);
    });

    it('should validate semver versions', () => {
      expect(VersionUtils.isValidVersion('1.0.0')).toBe(true);
      expect(VersionUtils.isValidVersion('2.1.3')).toBe(true);
      expect(VersionUtils.isValidVersion('10.20.30')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(VersionUtils.isValidVersion('abc')).toBe(false);
      expect(VersionUtils.isValidVersion('1.a')).toBe(false);
      expect(VersionUtils.isValidVersion('')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare simple numeric versions', () => {
      expect(VersionUtils.compareVersions('1', '2')).toBeLessThan(0);
      expect(VersionUtils.compareVersions('2', '1')).toBeGreaterThan(0);
      expect(VersionUtils.compareVersions('1', '1')).toBe(0);
    });

    it('should compare with prefixes', () => {
      expect(VersionUtils.compareVersions('v1', 'v2')).toBeLessThan(0);
      expect(VersionUtils.compareVersions('v2', 'v1')).toBeGreaterThan(0);
    });

    it('should compare semver versions', () => {
      expect(VersionUtils.compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(VersionUtils.compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(VersionUtils.compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });
  });

  describe('isVersionSupported', () => {
    const supportedVersions = ['1', '2', '3'];

    it('should check if version is supported', () => {
      expect(VersionUtils.isVersionSupported('1', supportedVersions)).toBe(true);
      expect(VersionUtils.isVersionSupported('2', supportedVersions)).toBe(true);
      expect(VersionUtils.isVersionSupported('4', supportedVersions)).toBe(false);
    });

    it('should work with prefixed versions', () => {
      expect(VersionUtils.isVersionSupported('v1', supportedVersions)).toBe(true);
      expect(VersionUtils.isVersionSupported('v4', supportedVersions)).toBe(false);
    });
  });

  describe('selectBestVersion', () => {
    const supportedVersions = ['1', '2', '3'];
    const defaultVersion = '3';

    it('should return exact match when available', () => {
      expect(VersionUtils.selectBestVersion('2', supportedVersions, defaultVersion)).toBe('2');
    });

    it('should return default when no version requested', () => {
      expect(VersionUtils.selectBestVersion(undefined, supportedVersions, defaultVersion)).toBe(defaultVersion);
    });

    it('should return closest lower version when exact match not found', () => {
      expect(VersionUtils.selectBestVersion('2.5', supportedVersions, defaultVersion)).toBe('2');
    });

    it('should return default when requested version is too low', () => {
      expect(VersionUtils.selectBestVersion('0.5', supportedVersions, defaultVersion)).toBe(defaultVersion);
    });
  });

  describe('extractVersionFromUrl', () => {
    it('should extract version from URL', () => {
      expect(VersionUtils.extractVersionFromUrl('/v1/users')).toBe('1');
      expect(VersionUtils.extractVersionFromUrl('/v2/products/123')).toBe('2');
      expect(VersionUtils.extractVersionFromUrl('/api/v3/orders')).toBe('3');
    });

    it('should return undefined when no version found', () => {
      expect(VersionUtils.extractVersionFromUrl('/users')).toBeUndefined();
      expect(VersionUtils.extractVersionFromUrl('/api/users')).toBeUndefined();
    });

    it('should work with custom prefix', () => {
      expect(VersionUtils.extractVersionFromUrl('/version1/users', 'version')).toBe('1');
    });
  });

  describe('buildVersionedUrl', () => {
    it('should prepend version to URL', () => {
      expect(VersionUtils.buildVersionedUrl('/users', '1')).toBe('/v1/users');
      expect(VersionUtils.buildVersionedUrl('/products/123', '2')).toBe('/v2/products/123');
    });

    it('should replace existing version', () => {
      expect(VersionUtils.buildVersionedUrl('/v1/users', '2')).toBe('/v2/users');
      expect(VersionUtils.buildVersionedUrl('/v3/products/123', '1')).toBe('/v1/products/123');
    });

    it('should work with custom prefix', () => {
      expect(VersionUtils.buildVersionedUrl('/users', '1', 'version')).toBe('/version1/users');
    });
  });

  describe('generateDeprecationMessage', () => {
    it('should generate basic deprecation message', () => {
      const message = VersionUtils.generateDeprecationMessage('1');
      expect(message).toBe('API version 1 is deprecated');
    });

    it('should include deprecation date', () => {
      const date = new Date('2024-01-01');
      const message = VersionUtils.generateDeprecationMessage('1', date);
      expect(message).toContain('since 2024-01-01');
    });

    it('should include removal date', () => {
      const removalDate = new Date('2024-12-31');
      const message = VersionUtils.generateDeprecationMessage('1', undefined, removalDate);
      expect(message).toContain('will be removed on 2024-12-31');
    });

    it('should include migration guide', () => {
      const guide = 'https://docs.example.com/migration';
      const message = VersionUtils.generateDeprecationMessage('1', undefined, undefined, guide);
      expect(message).toContain(`Migration guide: ${guide}`);
    });

    it('should include all information', () => {
      const deprecationDate = new Date('2024-01-01');
      const removalDate = new Date('2024-12-31');
      const guide = 'https://docs.example.com/migration';
      const message = VersionUtils.generateDeprecationMessage('1', deprecationDate, removalDate, guide);
      
      expect(message).toContain('API version 1 is deprecated');
      expect(message).toContain('since 2024-01-01');
      expect(message).toContain('will be removed on 2024-12-31');
      expect(message).toContain(`Migration guide: ${guide}`);
    });
  });
});