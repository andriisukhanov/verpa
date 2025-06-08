import {
  APP_CONSTANTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  VALIDATION_RULES,
  SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_PRICES,
  AUTH_CONSTANTS,
} from '../index';
import { SubscriptionType } from '../../enums';

describe('Constants', () => {
  describe('APP_CONSTANTS', () => {
    it('should have correct app metadata', () => {
      expect(APP_CONSTANTS.APP_NAME).toBe('Verpa');
      expect(APP_CONSTANTS.APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
      expect(APP_CONSTANTS.API_VERSION).toBe('v1');
    });

    it('should have valid pagination defaults', () => {
      expect(APP_CONSTANTS.PAGINATION.DEFAULT_PAGE).toBeGreaterThan(0);
      expect(APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT).toBeGreaterThan(0);
      expect(APP_CONSTANTS.PAGINATION.MAX_LIMIT).toBeGreaterThanOrEqual(
        APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT
      );
    });

    it('should have valid file upload limits', () => {
      expect(APP_CONSTANTS.FILE_UPLOAD.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(APP_CONSTANTS.FILE_UPLOAD.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(APP_CONSTANTS.FILE_UPLOAD.MAX_FILES_PER_UPLOAD).toBeGreaterThan(0);
    });

    it('should have rate limit configurations', () => {
      expect(APP_CONSTANTS.RATE_LIMITS.GENERAL.WINDOW_MS).toBeGreaterThan(0);
      expect(APP_CONSTANTS.RATE_LIMITS.GENERAL.MAX_REQUESTS).toBeGreaterThan(0);
      expect(APP_CONSTANTS.RATE_LIMITS.AUTH.MAX_REQUESTS).toBeLessThan(
        APP_CONSTANTS.RATE_LIMITS.GENERAL.MAX_REQUESTS
      );
    });

    it('should have cache TTL values in seconds', () => {
      Object.values(APP_CONSTANTS.CACHE_TTL).forEach((ttl) => {
        expect(ttl).toBeGreaterThan(0);
      });
    });
  });

  describe('ERROR_CODES and ERROR_MESSAGES', () => {
    it('should have message for every error code', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    it('should have properly formatted error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(code).toMatch(/^[A-Z]+_\d{4}$/);
      });
    });

    it('should have categorized error codes', () => {
      const authErrors = Object.values(ERROR_CODES).filter((code) => code.startsWith('AUTH_'));
      const userErrors = Object.values(ERROR_CODES).filter((code) => code.startsWith('USER_'));
      const sysErrors = Object.values(ERROR_CODES).filter((code) => code.startsWith('SYS_'));

      expect(authErrors.length).toBeGreaterThan(0);
      expect(userErrors.length).toBeGreaterThan(0);
      expect(sysErrors.length).toBeGreaterThan(0);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should have valid password rules', () => {
      expect(VALIDATION_RULES.PASSWORD.MIN_LENGTH).toBeLessThan(
        VALIDATION_RULES.PASSWORD.MAX_LENGTH
      );
      expect(VALIDATION_RULES.PASSWORD.MIN_LENGTH).toBeGreaterThanOrEqual(8);
      expect(VALIDATION_RULES.PASSWORD.SPECIAL_CHARS).toContain('!');
    });

    it('should have valid username rules', () => {
      expect(VALIDATION_RULES.USERNAME.MIN_LENGTH).toBeLessThan(
        VALIDATION_RULES.USERNAME.MAX_LENGTH
      );
      expect(VALIDATION_RULES.USERNAME.PATTERN).toBeInstanceOf(RegExp);
      expect(VALIDATION_RULES.USERNAME.RESERVED_WORDS).toContain('admin');
    });

    it('should have valid email pattern', () => {
      const emailPattern = VALIDATION_RULES.EMAIL.PATTERN;
      expect('test@example.com').toMatch(emailPattern);
      expect('invalid.email').not.toMatch(emailPattern);
    });

    it('should have valid file size limits', () => {
      expect(VALIDATION_RULES.FILE.IMAGE.MAX_SIZE).toBeLessThanOrEqual(
        APP_CONSTANTS.FILE_UPLOAD.MAX_FILE_SIZE
      );
      expect(VALIDATION_RULES.FILE.DOCUMENT.MAX_SIZE).toBeGreaterThan(
        VALIDATION_RULES.FILE.IMAGE.MAX_SIZE
      );
    });
  });

  describe('SUBSCRIPTION_LIMITS', () => {
    it('should have limits for all subscription types', () => {
      expect(SUBSCRIPTION_LIMITS[SubscriptionType.FREE]).toBeDefined();
      expect(SUBSCRIPTION_LIMITS[SubscriptionType.PREMIUM]).toBeDefined();
      expect(SUBSCRIPTION_LIMITS[SubscriptionType.ENTERPRISE]).toBeDefined();
    });

    it('should have progressive limits', () => {
      const freeLimits = SUBSCRIPTION_LIMITS[SubscriptionType.FREE];
      const premiumLimits = SUBSCRIPTION_LIMITS[SubscriptionType.PREMIUM];
      const enterpriseLimits = SUBSCRIPTION_LIMITS[SubscriptionType.ENTERPRISE];

      // Free should have most restrictive limits
      expect(freeLimits.AQUARIUMS).toBe(1);
      expect(premiumLimits.AQUARIUMS).toBe(-1); // unlimited
      expect(enterpriseLimits.AQUARIUMS).toBe(-1); // unlimited

      // Photo size should increase with tier
      expect(freeLimits.PHOTO_SIZE_MB).toBeLessThan(premiumLimits.PHOTO_SIZE_MB);
      expect(premiumLimits.PHOTO_SIZE_MB).toBeLessThan(enterpriseLimits.PHOTO_SIZE_MB);
    });

    it('should have valid export formats', () => {
      const freeFormats = SUBSCRIPTION_LIMITS[SubscriptionType.FREE].EXPORT_FORMATS;
      const premiumFormats = SUBSCRIPTION_LIMITS[SubscriptionType.PREMIUM].EXPORT_FORMATS;
      
      expect(freeFormats).toContain('csv');
      expect(premiumFormats).toContain('csv');
      expect(premiumFormats).toContain('pdf');
      expect(premiumFormats.length).toBeGreaterThan(freeFormats.length);
    });
  });

  describe('SUBSCRIPTION_FEATURES', () => {
    it('should have basic features available to all tiers', () => {
      const basicFeatures = [
        'BASIC_AQUARIUM_MANAGEMENT',
        'EVENT_SCHEDULING',
        'PHOTO_UPLOAD',
        'EMAIL_REMINDERS',
      ];

      basicFeatures.forEach((feature) => {
        expect((SUBSCRIPTION_FEATURES as any)[feature]).toContain(SubscriptionType.FREE);
        expect((SUBSCRIPTION_FEATURES as any)[feature]).toContain(SubscriptionType.PREMIUM);
        expect((SUBSCRIPTION_FEATURES as any)[feature]).toContain(SubscriptionType.ENTERPRISE);
      });
    });

    it('should have premium features not available to free tier', () => {
      const premiumFeatures = ['PUSH_NOTIFICATIONS', 'SMS_NOTIFICATIONS', 'API_ACCESS'];

      premiumFeatures.forEach((feature) => {
        expect((SUBSCRIPTION_FEATURES as any)[feature]).not.toContain(SubscriptionType.FREE);
        expect((SUBSCRIPTION_FEATURES as any)[feature]).toContain(SubscriptionType.PREMIUM);
      });
    });

    it('should have enterprise-only features', () => {
      const enterpriseFeatures = ['TEAM_COLLABORATION', 'WHITE_LABEL', 'DEDICATED_SUPPORT'];

      enterpriseFeatures.forEach((feature) => {
        expect((SUBSCRIPTION_FEATURES as any)[feature]).toEqual([SubscriptionType.ENTERPRISE]);
      });
    });
  });

  describe('SUBSCRIPTION_PRICES', () => {
    it('should have free tier at zero cost', () => {
      expect(SUBSCRIPTION_PRICES[SubscriptionType.FREE].MONTHLY).toBe(0);
      expect(SUBSCRIPTION_PRICES[SubscriptionType.FREE].YEARLY).toBe(0);
    });

    it('should have yearly discount for paid tiers', () => {
      const premiumMonthly = SUBSCRIPTION_PRICES[SubscriptionType.PREMIUM].MONTHLY;
      const premiumYearly = SUBSCRIPTION_PRICES[SubscriptionType.PREMIUM].YEARLY;
      const premiumYearlyEquivalent = premiumMonthly * 12;
      
      expect(premiumYearly).toBeLessThan(premiumYearlyEquivalent);
      
      const discount = (premiumYearlyEquivalent - premiumYearly) / premiumYearlyEquivalent;
      expect(discount).toBeGreaterThan(0.1); // At least 10% discount
    });

    it('should have progressive pricing', () => {
      expect(SUBSCRIPTION_PRICES[SubscriptionType.FREE].MONTHLY).toBeLessThan(
        SUBSCRIPTION_PRICES[SubscriptionType.PREMIUM].MONTHLY
      );
      expect(SUBSCRIPTION_PRICES[SubscriptionType.PREMIUM].MONTHLY).toBeLessThan(
        SUBSCRIPTION_PRICES[SubscriptionType.ENTERPRISE].MONTHLY
      );
    });
  });

  describe('AUTH_CONSTANTS', () => {
    it('should have valid JWT expiry times', () => {
      expect(AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY).toMatch(/^\d+[mhd]$/);
      expect(AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY).toMatch(/^\d+[mhd]$/);
      
      // Access token should expire before refresh token
      expect(AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY).toBe('15m');
      expect(AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY).toBe('7d');
    });

    it('should have secure bcrypt rounds', () => {
      expect(AUTH_CONSTANTS.SECURITY.BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10);
      expect(AUTH_CONSTANTS.SECURITY.BCRYPT_ROUNDS).toBeLessThanOrEqual(15);
    });

    it('should have OAuth provider configurations', () => {
      expect(AUTH_CONSTANTS.OAUTH.GOOGLE.SCOPES).toContain('email');
      expect(AUTH_CONSTANTS.OAUTH.APPLE.RESPONSE_TYPE).toContain('id_token');
      expect(AUTH_CONSTANTS.OAUTH.FACEBOOK.FIELDS).toContain('email');
    });

    it('should have security headers defined', () => {
      const headers = Object.values(AUTH_CONSTANTS.HEADERS);
      expect(headers).toContain('authorization');
      expect(headers.every((h) => typeof h === 'string')).toBe(true);
    });
  });
});