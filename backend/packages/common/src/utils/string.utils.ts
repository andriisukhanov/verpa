export class StringUtils {
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    if (!str) return '';
    return str
      .split(' ')
      .map((word) => this.capitalize(word))
      .join(' ');
  }

  static camelCase(str: string): string {
    if (!str) return '';
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  static snakeCase(str: string): string {
    if (!str) return '';
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map((word) => word.toLowerCase())
      .join('_');
  }

  static kebabCase(str: string): string {
    if (!str) return '';
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map((word) => word.toLowerCase())
      .join('-');
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (!str || str.length <= length) return str || '';
    return str.substring(0, length - suffix.length) + suffix;
  }

  static slugify(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  static generateRandomString(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  static generateCode(length: number = 6): string {
    return this.generateRandomString(length, '0123456789');
  }

  static isBlank(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  static padStart(str: string, targetLength: number, padString: string = ' '): string {
    if (!str) return padString.repeat(targetLength);
    return str.padStart(targetLength, padString);
  }

  static padEnd(str: string, targetLength: number, padString: string = ' '): string {
    if (!str) return padString.repeat(targetLength);
    return str.padEnd(targetLength, padString);
  }

  static removeAccents(str: string): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  static escapeRegex(str: string): string {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static parseJSON<T>(str: string, defaultValue: T): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return defaultValue;
    }
  }
}