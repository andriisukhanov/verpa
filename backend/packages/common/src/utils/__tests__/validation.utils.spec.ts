import { ValidationUtils } from '../validation.utils';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
        'a@b.co',
      ];

      validEmails.forEach((email) => {
        expect(ValidationUtils.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid.email',
        '@example.com',
        'user@',
        'user name@example.com',
        'user@.com',
        'user@example',
        'user@@example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(ValidationUtils.isValidEmail(email)).toBe(false);
      });
    });

    it('should reject emails exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(ValidationUtils.isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Test#123Password',
        'Complex1ty!',
      ];

      validPasswords.forEach((password) => {
        expect(ValidationUtils.isValidPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        '',
        'short',
        'password123', // no uppercase or special char
        'PASSWORD123', // no lowercase or special char
        'Password!', // no number
        'Pass123', // no special char
        'password123!', // no uppercase
      ];

      invalidPasswords.forEach((password) => {
        expect(ValidationUtils.isValidPassword(password)).toBe(false);
      });
    });

    it('should enforce length requirements', () => {
      expect(ValidationUtils.isValidPassword('Abc12!')).toBe(false); // too short
      expect(ValidationUtils.isValidPassword('A' + 'a'.repeat(127) + '1!')).toBe(false); // too long
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'user-name',
        'JohnDoe',
        'alice_bob-123',
      ];

      validUsernames.forEach((username) => {
        expect(ValidationUtils.isValidUsername(username)).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        '',
        'ab', // too short
        'user name', // contains space
        'user@name', // contains @
        'user.name', // contains .
        'admin', // reserved word
        'root', // reserved word
        'a'.repeat(31), // too long
      ];

      invalidUsernames.forEach((username) => {
        expect(ValidationUtils.isValidUsername(username)).toBe(false);
      });
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+12345678901234',
        '12345678901',
      ];

      validPhones.forEach((phone) => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123', // too short
        'abcdefghij', // contains letters
        '+0123456789', // starts with +0
        '123-456-7890', // contains dashes
        '(123) 456-7890', // contains parentheses
      ];

      invalidPhones.forEach((phone) => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(false);
      });
    });

    it('should handle phone numbers with spaces', () => {
      expect(ValidationUtils.isValidPhone('+1 234 567 890')).toBe(true);
      expect(ValidationUtils.isValidPhone('1 234 567 890')).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'https://example.com:8080',
        'https://example.com/path?query=value',
      ];

      validUrls.forEach((url) => {
        expect(ValidationUtils.isValidUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'example.com',
        'ftp://example.com',
        'https://',
        'http://.',
        'not a url',
      ];

      invalidUrls.forEach((url) => {
        expect(ValidationUtils.isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach((uuid) => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        '',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-446655440000-extra',
        'not-a-uuid',
        '550e8400-e29b-61d4-a716-446655440000', // wrong version
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('isValidObjectId', () => {
    it('should validate correct MongoDB ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        'aaaaaaaaaaaaaaaaaaaaaaaa',
        'AAAAAAAAAAAAAAAAAAAAAAAA',
      ];

      validIds.forEach((id) => {
        expect(ValidationUtils.isValidObjectId(id)).toBe(true);
      });
    });

    it('should reject invalid ObjectIds', () => {
      const invalidIds = [
        '',
        '507f1f77bcf86cd79943901', // too short
        '507f1f77bcf86cd7994390111', // too long
        '507f1f77bcf86cd79943901g', // contains invalid char
      ];

      invalidIds.forEach((id) => {
        expect(ValidationUtils.isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input strings', () => {
      expect(ValidationUtils.sanitizeInput('  test  ')).toBe('test');
      expect(ValidationUtils.sanitizeInput('test\n\nvalue')).toBe('test value');
      expect(ValidationUtils.sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(ValidationUtils.sanitizeInput('normal text')).toBe('normal text');
    });

    it('should handle empty or null inputs', () => {
      expect(ValidationUtils.sanitizeInput('')).toBe('');
      expect(ValidationUtils.sanitizeInput(null as any)).toBe('');
      expect(ValidationUtils.sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('validateFileType', () => {
    it('should validate allowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      expect(ValidationUtils.validateFileType('image/jpeg', allowedTypes)).toBe(true);
      expect(ValidationUtils.validateFileType('image/png', allowedTypes)).toBe(true);
      expect(ValidationUtils.validateFileType('application/pdf', allowedTypes)).toBe(true);
      expect(ValidationUtils.validateFileType('image/gif', allowedTypes)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate file sizes', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      expect(ValidationUtils.validateFileSize(5 * 1024 * 1024, maxSize)).toBe(true);
      expect(ValidationUtils.validateFileSize(maxSize, maxSize)).toBe(true);
      expect(ValidationUtils.validateFileSize(maxSize + 1, maxSize)).toBe(false);
      expect(ValidationUtils.validateFileSize(0, maxSize)).toBe(false);
      expect(ValidationUtils.validateFileSize(-1, maxSize)).toBe(false);
    });
  });
});