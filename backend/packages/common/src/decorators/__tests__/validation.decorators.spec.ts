import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  IsStrongPassword,
  IsValidUsername,
  IsValidPhone,
  IsValidObjectId,
  IsFutureDate,
  IsPastDate,
  IsTimezone,
  Match,
} from '../validation.decorators';

describe('Validation Decorators', () => {
  describe('IsStrongPassword', () => {
    class TestClass {
      @IsStrongPassword()
      password: string;
    }

    it('should validate strong passwords', async () => {
      const instance = new TestClass();
      instance.password = 'StrongP@ss123';
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
    });

    it('should reject weak passwords', async () => {
      const instance = new TestClass();
      const weakPasswords = ['weak', 'password123', 'PASSWORD123', 'Pass123'];
      
      for (const password of weakPasswords) {
        instance.password = password;
        const errors = await validate(instance);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('password');
      }
    });
  });

  describe('IsValidUsername', () => {
    class TestClass {
      @IsValidUsername()
      username: string;
    }

    it('should validate correct usernames', async () => {
      const instance = new TestClass();
      const validUsernames = ['user123', 'test_user', 'user-name'];
      
      for (const username of validUsernames) {
        instance.username = username;
        const errors = await validate(instance);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid usernames', async () => {
      const instance = new TestClass();
      const invalidUsernames = ['ab', 'user name', 'admin', 'user@name'];
      
      for (const username of invalidUsernames) {
        instance.username = username;
        const errors = await validate(instance);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('username');
      }
    });
  });

  describe('IsValidPhone', () => {
    class TestClass {
      @IsValidPhone()
      phone: string;
    }

    it('should validate correct phone numbers', async () => {
      const instance = new TestClass();
      const validPhones = ['+1234567890', '1234567890'];
      
      for (const phone of validPhones) {
        instance.phone = phone;
        const errors = await validate(instance);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid phone numbers', async () => {
      const instance = new TestClass();
      const invalidPhones = ['123', 'abcdefghij', '123-456-7890'];
      
      for (const phone of invalidPhones) {
        instance.phone = phone;
        const errors = await validate(instance);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('phone');
      }
    });
  });

  describe('IsValidObjectId', () => {
    class TestClass {
      @IsValidObjectId()
      id: string;
    }

    it('should validate correct ObjectIds', async () => {
      const instance = new TestClass();
      instance.id = '507f1f77bcf86cd799439011';
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid ObjectIds', async () => {
      const instance = new TestClass();
      const invalidIds = ['123', '507f1f77bcf86cd79943901', 'invalid-id'];
      
      for (const id of invalidIds) {
        instance.id = id;
        const errors = await validate(instance);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('id');
      }
    });
  });

  describe('IsFutureDate', () => {
    class TestClass {
      @IsFutureDate()
      date: Date;
    }

    it('should validate future dates', async () => {
      const instance = new TestClass();
      instance.date = new Date(Date.now() + 86400000); // Tomorrow
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
    });

    it('should reject past dates', async () => {
      const instance = new TestClass();
      instance.date = new Date(Date.now() - 86400000); // Yesterday
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });
  });

  describe('IsPastDate', () => {
    class TestClass {
      @IsPastDate()
      date: Date;
    }

    it('should validate past dates', async () => {
      const instance = new TestClass();
      instance.date = new Date(Date.now() - 86400000); // Yesterday
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
    });

    it('should reject future dates', async () => {
      const instance = new TestClass();
      instance.date = new Date(Date.now() + 86400000); // Tomorrow
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });
  });

  describe('IsTimezone', () => {
    class TestClass {
      @IsTimezone()
      timezone: string;
    }

    it('should validate correct timezones', async () => {
      const instance = new TestClass();
      const validTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
      
      for (const timezone of validTimezones) {
        instance.timezone = timezone;
        const errors = await validate(instance);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid timezones', async () => {
      const instance = new TestClass();
      const invalidTimezones = ['Invalid/Timezone', 'XYZ', ''];
      
      for (const timezone of invalidTimezones) {
        instance.timezone = timezone;
        const errors = await validate(instance);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('timezone');
      }
    });
  });

  describe('Match', () => {
    class TestClass {
      password: string;
      
      @Match('password')
      confirmPassword: string;
    }

    it('should validate matching fields', async () => {
      const instance = new TestClass();
      instance.password = 'SecureP@ss123';
      instance.confirmPassword = 'SecureP@ss123';
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-matching fields', async () => {
      const instance = new TestClass();
      instance.password = 'SecureP@ss123';
      instance.confirmPassword = 'DifferentPass';
      
      const errors = await validate(instance);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('confirmPassword');
      expect(errors[0].constraints?.match).toContain('must match password');
    });
  });
});