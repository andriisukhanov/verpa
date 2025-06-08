import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import {
  Trim,
  Lowercase,
  Uppercase,
  Capitalize,
  SanitizeInput,
  ToBoolean,
  ToNumber,
  ToDate,
  ToArray,
  RemoveEmpty,
  Default,
} from '../transform.decorators';

describe('Transform Decorators', () => {
  describe('Trim', () => {
    class TestClass {
      @Trim()
      value: string;
    }

    it('should trim whitespace', () => {
      const plain = { value: '  hello world  ' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('hello world');
    });

    it('should handle non-string values', () => {
      const plain = { value: 123 };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe(123);
    });
  });

  describe('Lowercase', () => {
    class TestClass {
      @Lowercase()
      value: string;
    }

    it('should convert to lowercase', () => {
      const plain = { value: 'HELLO WORLD' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('hello world');
    });

    it('should handle non-string values', () => {
      const plain = { value: 123 };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe(123);
    });
  });

  describe('Uppercase', () => {
    class TestClass {
      @Uppercase()
      value: string;
    }

    it('should convert to uppercase', () => {
      const plain = { value: 'hello world' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('HELLO WORLD');
    });
  });

  describe('Capitalize', () => {
    class TestClass {
      @Capitalize()
      value: string;
    }

    it('should capitalize first letter', () => {
      const plain = { value: 'hello world' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('Hello world');
    });
  });

  describe('SanitizeInput', () => {
    class TestClass {
      @SanitizeInput()
      value: string;
    }

    it('should sanitize input', () => {
      const plain = { value: '  <script>alert("xss")</script>  ' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('scriptalert("xss")/script');
    });
  });

  describe('ToBoolean', () => {
    class TestClass {
      @ToBoolean()
      value: any;
    }

    it('should convert string values to boolean', () => {
      const trueValues = ['true', '1', 'yes', 'on', 'TRUE', 'Yes'];
      const falseValues = ['false', '0', 'no', 'off', 'FALSE', 'No'];

      trueValues.forEach((val) => {
        const instance = plainToClass(TestClass, { value: val });
        expect(instance.value).toBe(true);
      });

      falseValues.forEach((val) => {
        const instance = plainToClass(TestClass, { value: val });
        expect(instance.value).toBe(false);
      });
    });

    it('should handle numeric values', () => {
      expect(plainToClass(TestClass, { value: 1 }).value).toBe(true);
      expect(plainToClass(TestClass, { value: 0 }).value).toBe(false);
      expect(plainToClass(TestClass, { value: -1 }).value).toBe(true);
    });

    it('should handle boolean values', () => {
      expect(plainToClass(TestClass, { value: true }).value).toBe(true);
      expect(plainToClass(TestClass, { value: false }).value).toBe(false);
    });
  });

  describe('ToNumber', () => {
    class TestClass {
      @ToNumber()
      value: any;
    }

    it('should convert string numbers to number', () => {
      const plain = { value: '123.45' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe(123.45);
    });

    it('should handle invalid numbers', () => {
      const plain = { value: 'not a number' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('not a number');
    });

    it('should handle existing numbers', () => {
      const plain = { value: 42 };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe(42);
    });
  });

  describe('ToDate', () => {
    class TestClass {
      @ToDate()
      value: any;
    }

    it('should convert string to Date', () => {
      const dateString = '2024-01-15T10:00:00.000Z';
      const plain = { value: dateString };
      const instance = plainToClass(TestClass, plain);
      
      expect(instance.value).toBeInstanceOf(Date);
      expect(instance.value.toISOString()).toBe(dateString);
    });

    it('should convert timestamp to Date', () => {
      const timestamp = Date.now();
      const plain = { value: timestamp };
      const instance = plainToClass(TestClass, plain);
      
      expect(instance.value).toBeInstanceOf(Date);
      expect(instance.value.getTime()).toBe(timestamp);
    });

    it('should handle invalid dates', () => {
      const plain = { value: 'invalid date' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('invalid date');
    });

    it('should handle existing Date objects', () => {
      const date = new Date();
      const plain = { value: date };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual(date);
    });
  });

  describe('ToArray', () => {
    class TestClass {
      @ToArray()
      value: any;
    }

    it('should convert comma-separated string to array', () => {
      const plain = { value: 'apple, banana, orange' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual(['apple', 'banana', 'orange']);
    });

    it('should wrap single value in array', () => {
      const plain = { value: 'single' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual(['single']);
    });

    it('should handle existing arrays', () => {
      const plain = { value: ['a', 'b', 'c'] };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual(['a', 'b', 'c']);
    });
  });

  describe('RemoveEmpty', () => {
    class TestClass {
      @RemoveEmpty()
      value: any;
    }

    it('should remove empty values from array', () => {
      const plain = { value: ['a', '', null, 'b', undefined, 'c'] };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual(['a', 'b', 'c']);
    });

    it('should remove empty values from object', () => {
      const plain = {
        value: {
          a: 'value',
          b: '',
          c: null,
          d: undefined,
          e: 'another',
        },
      };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toEqual({ a: 'value', e: 'another' });
    });

    it('should handle non-array/object values', () => {
      const plain = { value: 'string' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.value).toBe('string');
    });
  });

  describe('Default', () => {
    class TestClass {
      @Default('default value')
      stringValue: string;

      @Default(42)
      numberValue: number;

      @Default([])
      arrayValue: any[];
    }

    it('should use default value when undefined', () => {
      const plain = {
        stringValue: undefined,
        numberValue: undefined,
        arrayValue: undefined,
      };
      const instance = plainToClass(TestClass, plain);
      
      expect(instance.stringValue).toBe('default value');
      expect(instance.numberValue).toBe(42);
      expect(instance.arrayValue).toEqual([]);
    });

    it('should use default value when null', () => {
      const plain = {
        stringValue: null,
        numberValue: null,
        arrayValue: null,
      };
      const instance = plainToClass(TestClass, plain);
      
      expect(instance.stringValue).toBe('default value');
      expect(instance.numberValue).toBe(42);
      expect(instance.arrayValue).toEqual([]);
    });

    it('should use default value when empty string', () => {
      const plain = { stringValue: '' };
      const instance = plainToClass(TestClass, plain);
      expect(instance.stringValue).toBe('default value');
    });

    it('should not use default when value exists', () => {
      const plain = {
        stringValue: 'actual',
        numberValue: 0,
        arrayValue: [1, 2, 3],
      };
      const instance = plainToClass(TestClass, plain);
      
      expect(instance.stringValue).toBe('actual');
      expect(instance.numberValue).toBe(0);
      expect(instance.arrayValue).toEqual([1, 2, 3]);
    });
  });
});