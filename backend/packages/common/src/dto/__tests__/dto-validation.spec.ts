import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  LoginDto,
  RegisterDto,
  CreateAquariumDto,
  CreateEventDto,
  QuickEventDto,
  PaginationQueryDto,
} from '../index';
import { WaterType, EventType } from '../../enums';

describe('DTO Validation', () => {
  describe('LoginDto', () => {
    it('should validate valid login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };
      
      const dto = plainToClass(LoginDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('test@example.com');
      expect(dto.rememberMe).toBe(true);
    });

    it('should transform email to lowercase', async () => {
      const data = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
      };
      
      const dto = plainToClass(LoginDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      const dto = plainToClass(LoginDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should reject empty password', async () => {
      const data = {
        email: 'test@example.com',
        password: '',
      };
      
      const dto = plainToClass(LoginDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
    });
  });

  describe('RegisterDto', () => {
    it('should validate valid registration data', async () => {
      const validData = {
        email: 'newuser@example.com',
        username: 'newuser123',
        password: 'StrongP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
        language: 'en',
      };
      
      const dto = plainToClass(RegisterDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should reject weak password', async () => {
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      };
      
      const dto = plainToClass(RegisterDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
    });

    it('should reject invalid username', async () => {
      const invalidUsernames = [
        'ab', // too short
        'user name', // contains space
        'admin', // reserved
        'user@name', // invalid chars
      ];
      
      for (const username of invalidUsernames) {
        const dto = plainToClass(RegisterDto, {
          email: 'test@example.com',
          username,
          password: 'StrongP@ss123',
        });
        
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'username')).toBe(true);
      }
    });

    it('should sanitize user input', async () => {
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongP@ss123',
        firstName: '  <script>John</script>  ',
        lastName: '  Doe  ',
      };
      
      const dto = plainToClass(RegisterDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('scriptJohn/script');
      expect(dto.lastName).toBe('Doe');
    });
  });

  describe('CreateAquariumDto', () => {
    it('should validate valid aquarium data', async () => {
      const validData = {
        name: 'My Reef Tank',
        description: 'Beautiful reef aquarium',
        waterType: WaterType.SALTWATER,
        volume: 200,
        volumeUnit: 'liters',
        setupDate: new Date('2024-01-01'),
        dimensions: {
          length: 120,
          width: 50,
          height: 60,
          unit: 'cm',
        },
      };
      
      const dto = plainToClass(CreateAquariumDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid water type', async () => {
      const data = {
        name: 'Tank',
        waterType: 'invalid',
        volume: 100,
        volumeUnit: 'liters',
        setupDate: new Date(),
      };
      
      const dto = plainToClass(CreateAquariumDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('waterType');
    });

    it('should reject negative volume', async () => {
      const data = {
        name: 'Tank',
        waterType: WaterType.FRESHWATER,
        volume: -10,
        volumeUnit: 'liters',
        setupDate: new Date(),
      };
      
      const dto = plainToClass(CreateAquariumDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('volume');
    });

    it('should use default volume unit', async () => {
      const data = {
        name: 'Tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        setupDate: new Date(),
      };
      
      const dto = plainToClass(CreateAquariumDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.volumeUnit).toBe('liters');
    });
  });

  describe('CreateEventDto', () => {
    it('should validate valid event data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const validData = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: EventType.WATER_CHANGE,
        title: 'Weekly Water Change',
        description: 'Change 25% of water',
        scheduledFor: futureDate,
        isRecurring: true,
        recurringPattern: {
          frequency: 'weekly',
          daysOfWeek: [0],
        },
        reminder: {
          enabled: true,
          minutesBefore: 30,
          notificationTypes: ['push', 'email'],
        },
      };
      
      const dto = plainToClass(CreateEventDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should reject past dates for scheduledFor', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const data = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: EventType.FEEDING,
        title: 'Feeding',
        scheduledFor: pastDate,
      };
      
      const dto = plainToClass(CreateEventDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('scheduledFor');
    });

    it('should validate recurring pattern', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const data = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: EventType.WATER_CHANGE,
        title: 'Water Change',
        scheduledFor: futureDate,
        isRecurring: true,
        recurringPattern: {
          frequency: 'invalid', // Invalid frequency
          interval: 0, // Invalid interval
        },
      };
      
      const dto = plainToClass(CreateEventDto, data);
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('QuickEventDto', () => {
    it('should validate temperature event', async () => {
      const data = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: 'temperature',
        value: 25.5,
        notes: 'Normal temperature',
      };
      
      const dto = plainToClass(QuickEventDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should validate photo event', async () => {
      const data = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: 'photo',
        photo: 'https://example.com/photo.jpg',
        notes: 'Weekly photo',
      };
      
      const dto = plainToClass(QuickEventDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should use current timestamp by default', async () => {
      const data = {
        aquariumId: '507f1f77bcf86cd799439011',
        type: 'feeding',
      };
      
      const beforeCreate = new Date();
      const dto = plainToClass(QuickEventDto, data);
      const afterCreate = new Date();
      
      expect(dto.timestamp).toBeInstanceOf(Date);
      expect(dto.timestamp!.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(dto.timestamp!.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('PaginationQueryDto', () => {
    it('should use default values', async () => {
      const dto = plainToClass(PaginationQueryDto, {});
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
      expect(dto.sortBy).toBe('createdAt');
      expect(dto.sortOrder).toBe('desc');
    });

    it('should convert string numbers to numbers', async () => {
      const data = {
        page: '5',
        limit: '50',
      };
      
      const dto = plainToClass(PaginationQueryDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(5);
      expect(dto.limit).toBe(50);
    });

    it('should enforce max limit', async () => {
      const data = {
        limit: 200, // Exceeds max
      };
      
      const dto = plainToClass(PaginationQueryDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should validate sort order', async () => {
      const data = {
        sortOrder: 'invalid',
      };
      
      const dto = plainToClass(PaginationQueryDto, data);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sortOrder');
    });
  });
});