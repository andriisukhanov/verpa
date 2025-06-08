import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'FRONTEND_URL': 'http://localhost:3000',
        'API_URL': 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('getEmailTemplate', () => {
    it('should return email template by name', () => {
      const template = service.getEmailTemplate('VERIFICATION');
      expect(template).toBeDefined();
      expect(template?.subject).toBeDefined();
      expect(template?.html).toBeDefined();
    });

    it('should return undefined for non-existent template', () => {
      const template = service.getEmailTemplate('NON_EXISTENT');
      expect(template).toBeUndefined();
    });

    it('should return legacy templates', () => {
      const template = service.getEmailTemplate('EMAIL_VERIFIED');
      expect(template).toBeDefined();
      expect(template?.subject).toBe('Email Verified Successfully');
      expect(typeof template?.html).toBe('string');
    });
  });

  describe('renderEmailTemplate', () => {
    it('should render built-in template with variables', () => {
      const result = service.renderEmailTemplate('VERIFICATION', {
        name: 'John Doe',
        emailVerificationToken: 'test-token-123',
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('http://localhost:3000/auth/verify-email?token=test-token-123');
      expect(result.text).toBeDefined();
    });

    it('should render password reset template', () => {
      const result = service.renderEmailTemplate('PASSWORD_RESET', {
        name: 'Jane Smith',
        resetToken: 'reset-token-456',
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('http://localhost:3000/auth/reset-password?token=reset-token-456');
    });

    it('should render welcome template', () => {
      const result = service.renderEmailTemplate('WELCOME', {
        name: 'New User',
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toContain('New User');
      expect(result.html).toContain('http://localhost:3000/auth/login');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        service.renderEmailTemplate('INVALID_TEMPLATE', {});
      }).toThrow('Email template INVALID_TEMPLATE not found');
    });

    it('should include enriched variables', () => {
      const currentYear = new Date().getFullYear();
      const result = service.renderEmailTemplate('VERIFICATION', {
        name: 'Test User',
        emailVerificationToken: 'token',
      });

      expect(result.html).toContain('http://localhost:3000');
      expect(result.html).toContain(currentYear.toString());
    });

    it('should render legacy string-based templates', () => {
      const result = service.renderEmailTemplate('EMAIL_VERIFIED', {});

      expect(result.subject).toBe('Email Verified Successfully');
      expect(result.html).toContain('Email Verified!');
      expect(result.html).toContain('Create and manage your aquariums');
    });

    it('should render account locked template with variables', () => {
      const lockUntil = new Date('2024-06-10T10:00:00Z');
      const result = service.renderEmailTemplate('ACCOUNT_LOCKED', {
        lockUntil: lockUntil.toISOString(),
      });

      expect(result.subject).toBe('Account Security Alert');
      expect(result.html).toContain('Account Security Alert');
      expect(result.html).toContain(lockUntil.toISOString());
    });

    it('should handle templates without text version', () => {
      const result = service.renderEmailTemplate('EMAIL_VERIFIED', {});

      expect(result.html).toBeDefined();
      expect(result.text).toBeUndefined();
    });
  });

  describe('renderTemplate', () => {
    it('should render registered template', () => {
      const result = service.renderTemplate('PUSH_REMINDER', {
        title: 'Water Change',
        message: 'Time to change water in Tank 1',
      });

      expect(result).toBe('Water Change: Time to change water in Tank 1');
    });

    it('should render event confirmation template', () => {
      const result = service.renderTemplate('PUSH_EVENT_CONFIRMATION', {
        eventType: 'water change',
        aquariumName: 'Main Tank',
      });

      expect(result).toBe('Confirm water change for Main Tank');
    });

    it('should render maintenance due template', () => {
      const result = service.renderTemplate('PUSH_MAINTENANCE_DUE', {
        aquariumName: 'Reef Tank',
        maintenanceType: 'filter cleaning',
      });

      expect(result).toBe('Reef Tank needs filter cleaning');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        service.renderTemplate('NON_EXISTENT', {});
      }).toThrow('Template NON_EXISTENT not found');
    });
  });

  describe('renderPushTemplate', () => {
    it('should render push notification template', () => {
      const result = service.renderPushTemplate('REMINDER', {
        title: 'Feeding Time',
        message: 'Feed your fish',
      });

      expect(result).toBe('Feeding Time: Feed your fish');
    });

    it('should render maintenance due push template', () => {
      const result = service.renderPushTemplate('MAINTENANCE_DUE', {
        aquariumName: 'Tropical Tank',
        maintenanceType: 'water testing',
      });

      expect(result).toBe('Tropical Tank needs water testing');
    });

    it('should throw error for non-existent push template', () => {
      expect(() => {
        service.renderPushTemplate('INVALID', {});
      }).toThrow('Template PUSH_INVALID not found');
    });
  });

  describe('renderSmsTemplate', () => {
    it('should render SMS verification template', () => {
      const result = service.renderSmsTemplate('VERIFICATION', {
        code: '123456',
      });

      expect(result).toBe('Your Verpa verification code is: 123456');
    });

    it('should render SMS password reset template', () => {
      const result = service.renderSmsTemplate('PASSWORD_RESET', {
        code: '654321',
      });

      expect(result).toBe('Your Verpa password reset code is: 654321. Valid for 10 minutes.');
    });

    it('should throw error for non-existent SMS template', () => {
      expect(() => {
        service.renderSmsTemplate('INVALID', {});
      }).toThrow('Template SMS_INVALID not found');
    });
  });

  describe('edge cases', () => {
    it('should handle missing variables in template', () => {
      const result = service.renderTemplate('PUSH_REMINDER', {});
      expect(result).toBe(': ');
    });

    it('should handle null/undefined variables', () => {
      const result = service.renderEmailTemplate('VERIFICATION', {
        name: null,
        emailVerificationToken: undefined,
      });

      expect(result.html).toBeDefined();
      expect(result.html).not.toContain('null');
      expect(result.verificationUrl).toBeUndefined();
    });

    it('should use config default values', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'FRONTEND_URL' || key === 'API_URL') {
          return undefined;
        }
        return defaultValue;
      });

      const result = service.renderEmailTemplate('VERIFICATION', {
        name: 'Test',
        emailVerificationToken: 'token',
      });

      expect(result.html).toContain('http://localhost:3000/auth/verify-email?token=token');
    });

    it('should handle template rendering with special characters', () => {
      const result = service.renderTemplate('PUSH_REMINDER', {
        title: '<script>alert("XSS")</script>',
        message: 'Test & Message',
      });

      expect(result).toContain('<script>alert("XSS")</script>');
      expect(result).toContain('Test & Message');
    });

    it('should render email notification template', () => {
      const result = service.renderTemplate('EMAIL_EVENT_REMINDER', {
        username: 'John',
        eventType: 'water change',
        aquariumName: 'Main Tank',
        timeRemaining: '2 hours',
      });

      expect(result).toContain('Aquarium Event Reminder');
      expect(result).toContain('Hi John');
      expect(result).toContain('water change');
      expect(result).toContain('Main Tank');
      expect(result).toContain('2 hours');
    });

    it('should render subscription renewal template', () => {
      const result = service.renderTemplate('EMAIL_SUBSCRIPTION_RENEWAL', {
        username: 'Jane',
        planName: 'Premium',
        renewalDate: '2024-07-01',
        amount: '$9.99',
      });

      expect(result).toContain('Subscription Renewal Notice');
      expect(result).toContain('Hi Jane');
      expect(result).toContain('Premium');
      expect(result).toContain('2024-07-01');
      expect(result).toContain('$9.99');
    });
  });

  describe('initialization', () => {
    it('should load and compile all templates on construction', () => {
      const newService = new TemplateService(mockConfigService as ConfigService);
      
      // Test that templates are accessible
      expect(() => newService.renderTemplate('PUSH_REMINDER', { title: 'Test', message: 'Test' })).not.toThrow();
      expect(() => newService.renderTemplate('SMS_VERIFICATION', { code: '123' })).not.toThrow();
      expect(() => newService.renderEmailTemplate('VERIFICATION', { name: 'Test' })).not.toThrow();
    });
  });
});