import { StringUtils } from '../string.utils';

describe('StringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello');
      expect(StringUtils.capitalize('HELLO')).toBe('Hello');
      expect(StringUtils.capitalize('hELLO')).toBe('Hello');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.capitalize('')).toBe('');
      expect(StringUtils.capitalize('a')).toBe('A');
      expect(StringUtils.capitalize('123')).toBe('123');
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize all words', () => {
      expect(StringUtils.capitalizeWords('hello world')).toBe('Hello World');
      expect(StringUtils.capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.capitalizeWords('')).toBe('');
      expect(StringUtils.capitalizeWords('hello')).toBe('Hello');
      expect(StringUtils.capitalizeWords('  hello   world  ')).toBe('  Hello   World  ');
    });
  });

  describe('camelCase', () => {
    it('should convert to camelCase', () => {
      expect(StringUtils.camelCase('hello world')).toBe('helloWorld');
      expect(StringUtils.camelCase('Hello World')).toBe('helloWorld');
      expect(StringUtils.camelCase('hello-world')).toBe('helloWorld');
      expect(StringUtils.camelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.camelCase('')).toBe('');
      expect(StringUtils.camelCase('hello')).toBe('hello');
      expect(StringUtils.camelCase('HelloWorld')).toBe('helloWorld');
    });
  });

  describe('snakeCase', () => {
    it('should convert to snake_case', () => {
      expect(StringUtils.snakeCase('hello world')).toBe('hello_world');
      expect(StringUtils.snakeCase('HelloWorld')).toBe('hello_world');
      expect(StringUtils.snakeCase('hello-world')).toBe('hello_world');
      expect(StringUtils.snakeCase('hello_world')).toBe('hello_world');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.snakeCase('')).toBe('');
      expect(StringUtils.snakeCase('hello')).toBe('hello');
      expect(StringUtils.snakeCase('ABC')).toBe('a_b_c');
    });
  });

  describe('kebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(StringUtils.kebabCase('hello world')).toBe('hello-world');
      expect(StringUtils.kebabCase('HelloWorld')).toBe('hello-world');
      expect(StringUtils.kebabCase('hello_world')).toBe('hello-world');
      expect(StringUtils.kebabCase('hello-world')).toBe('hello-world');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.kebabCase('')).toBe('');
      expect(StringUtils.kebabCase('hello')).toBe('hello');
      expect(StringUtils.kebabCase('ABC')).toBe('a-b-c');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(StringUtils.truncate('Hello World', 5)).toBe('He...');
      expect(StringUtils.truncate('Hello World', 8)).toBe('Hello...');
      expect(StringUtils.truncate('Hello World', 11)).toBe('Hello World');
    });

    it('should handle custom suffix', () => {
      expect(StringUtils.truncate('Hello World', 5, '…')).toBe('Hell…');
      expect(StringUtils.truncate('Hello World', 7, ' [...]')).toBe('H [...]');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.truncate('', 5)).toBe('');
      expect(StringUtils.truncate(null as any, 5)).toBe('');
      expect(StringUtils.truncate('Hi', 5)).toBe('Hi');
    });
  });

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(StringUtils.slugify('Hello World!')).toBe('hello-world');
      expect(StringUtils.slugify('This & That')).toBe('this-that');
      expect(StringUtils.slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(StringUtils.slugify('Special@#$Characters')).toBe('specialcharacters');
    });

    it('should handle edge cases', () => {
      expect(StringUtils.slugify('')).toBe('');
      expect(StringUtils.slugify('---')).toBe('');
      expect(StringUtils.slugify('already-slugified')).toBe('already-slugified');
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of correct length', () => {
      const lengths = [5, 10, 20];
      lengths.forEach((length) => {
        const result = StringUtils.generateRandomString(length);
        expect(result).toHaveLength(length);
        expect(result).toMatch(/^[A-Za-z0-9]+$/);
      });
    });

    it('should use custom charset', () => {
      const result = StringUtils.generateRandomString(10, 'ABC');
      expect(result).toHaveLength(10);
      expect(result).toMatch(/^[ABC]+$/);
    });
  });

  describe('generateCode', () => {
    it('should generate numeric code', () => {
      const result = StringUtils.generateCode();
      expect(result).toHaveLength(6);
      expect(result).toMatch(/^\d+$/);
    });

    it('should generate code of specified length', () => {
      const result = StringUtils.generateCode(8);
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^\d+$/);
    });
  });

  describe('isBlank', () => {
    it('should identify blank strings', () => {
      expect(StringUtils.isBlank('')).toBe(true);
      expect(StringUtils.isBlank('   ')).toBe(true);
      expect(StringUtils.isBlank('\t\n')).toBe(true);
      expect(StringUtils.isBlank(null)).toBe(true);
      expect(StringUtils.isBlank(undefined)).toBe(true);
    });

    it('should identify non-blank strings', () => {
      expect(StringUtils.isBlank('hello')).toBe(false);
      expect(StringUtils.isBlank('  hello  ')).toBe(false);
      expect(StringUtils.isBlank('0')).toBe(false);
    });
  });

  describe('padStart', () => {
    it('should pad string at start', () => {
      expect(StringUtils.padStart('5', 3, '0')).toBe('005');
      expect(StringUtils.padStart('hello', 10)).toBe('     hello');
      expect(StringUtils.padStart('test', 4, '-')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.padStart('', 3, '0')).toBe('000');
      expect(StringUtils.padStart(null as any, 3, '0')).toBe('000');
    });
  });

  describe('padEnd', () => {
    it('should pad string at end', () => {
      expect(StringUtils.padEnd('5', 3, '0')).toBe('500');
      expect(StringUtils.padEnd('hello', 10)).toBe('hello     ');
      expect(StringUtils.padEnd('test', 4, '-')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.padEnd('', 3, '0')).toBe('000');
      expect(StringUtils.padEnd(null as any, 3, '0')).toBe('000');
    });
  });

  describe('removeAccents', () => {
    it('should remove accents from characters', () => {
      expect(StringUtils.removeAccents('café')).toBe('cafe');
      expect(StringUtils.removeAccents('naïve')).toBe('naive');
      expect(StringUtils.removeAccents('Zürich')).toBe('Zurich');
      expect(StringUtils.removeAccents('São Paulo')).toBe('Sao Paulo');
    });

    it('should handle strings without accents', () => {
      expect(StringUtils.removeAccents('hello')).toBe('hello');
      expect(StringUtils.removeAccents('')).toBe('');
    });
  });

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      expect(StringUtils.escapeRegex('.')).toBe('\\.');
      expect(StringUtils.escapeRegex('*')).toBe('\\*');
      expect(StringUtils.escapeRegex('[test]')).toBe('\\[test\\]');
      expect(StringUtils.escapeRegex('a+b')).toBe('a\\+b');
    });

    it('should handle normal strings', () => {
      expect(StringUtils.escapeRegex('hello')).toBe('hello');
      expect(StringUtils.escapeRegex('')).toBe('');
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      expect(StringUtils.parseJSON('{"key": "value"}', {})).toEqual({ key: 'value' });
      expect(StringUtils.parseJSON('[1, 2, 3]', [])).toEqual([1, 2, 3]);
      expect(StringUtils.parseJSON('"string"', '')).toBe('string');
    });

    it('should return default value for invalid JSON', () => {
      const defaultValue = { default: true };
      expect(StringUtils.parseJSON('invalid', defaultValue)).toBe(defaultValue);
      expect(StringUtils.parseJSON('', defaultValue)).toBe(defaultValue);
      expect(StringUtils.parseJSON('{incomplete', defaultValue)).toBe(defaultValue);
    });
  });
});