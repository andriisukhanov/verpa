import { VALIDATION_RULES } from '../constants';

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    if (!email || email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
      return false;
    }
    return VALIDATION_RULES.EMAIL.PATTERN.test(email);
  }

  static isValidPassword(password: string): boolean {
    if (!password) return false;
    
    const rules = VALIDATION_RULES.PASSWORD;
    
    if (password.length < rules.MIN_LENGTH || password.length > rules.MAX_LENGTH) {
      return false;
    }

    let hasUpperCase = false;
    let hasLowerCase = false;
    let hasNumber = false;
    let hasSpecialChar = false;

    for (const char of password) {
      if (rules.REQUIRE_UPPERCASE && /[A-Z]/.test(char)) hasUpperCase = true;
      if (rules.REQUIRE_LOWERCASE && /[a-z]/.test(char)) hasLowerCase = true;
      if (rules.REQUIRE_NUMBER && /[0-9]/.test(char)) hasNumber = true;
      if (rules.REQUIRE_SPECIAL_CHAR && rules.SPECIAL_CHARS.includes(char)) {
        hasSpecialChar = true;
      }
    }

    return (
      (!rules.REQUIRE_UPPERCASE || hasUpperCase) &&
      (!rules.REQUIRE_LOWERCASE || hasLowerCase) &&
      (!rules.REQUIRE_NUMBER || hasNumber) &&
      (!rules.REQUIRE_SPECIAL_CHAR || hasSpecialChar)
    );
  }

  static isValidUsername(username: string): boolean {
    if (!username) return false;
    
    const rules = VALIDATION_RULES.USERNAME;
    
    if (username.length < rules.MIN_LENGTH || username.length > rules.MAX_LENGTH) {
      return false;
    }

    if (!rules.PATTERN.test(username)) {
      return false;
    }

    if (rules.RESERVED_WORDS.includes(username.toLowerCase() as any)) {
      return false;
    }

    return true;
  }

  static isValidPhone(phone: string): boolean {
    if (!phone) return false;
    
    const cleaned = phone.replace(/\s/g, '');
    return VALIDATION_RULES.PHONE.PATTERN.test(cleaned);
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  static isValidUUID(uuid: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(uuid);
  }

  static isValidObjectId(id: string): boolean {
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(id);
  }

  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  static validateFileSize(sizeInBytes: number, maxSizeInBytes: number): boolean {
    return sizeInBytes > 0 && sizeInBytes <= maxSizeInBytes;
  }
}