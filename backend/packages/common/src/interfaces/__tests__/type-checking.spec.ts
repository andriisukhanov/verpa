import {
  IUser,
  IAquarium,
  IEvent,
  INotification,
  IPaginatedResponse,
  IApiResponse,
} from '../index';
import {
  UserRole,
  SubscriptionType,
  WaterType,
  EventType,
  NotificationType,
  NotificationPriority,
  AuthProvider,
} from '../../enums';

describe('Interface Type Checking', () => {
  describe('IUser Interface', () => {
    it('should accept valid user object', () => {
      const validUser: IUser = {
        _id: '123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        subscriptionType: SubscriptionType.FREE,
        emailVerified: true,
        phoneVerified: false,
        timezone: 'UTC',
        language: 'en',
        authProviders: [
          {
            provider: AuthProvider.LOCAL,
            providerId: '123',
            linkedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validUser).toBeDefined();
      expect(validUser.email).toBe('test@example.com');
    });

    it('should enforce required fields', () => {
      const userWithoutRequired = {
        email: 'test@example.com',
        // Missing required fields
      };

      // This test verifies TypeScript compilation would fail
      // @ts-expect-error - Missing required fields
      const invalidUser: IUser = userWithoutRequired;
      expect(userWithoutRequired).toBeDefined();
    });
  });

  describe('IAquarium Interface', () => {
    it('should accept valid aquarium object', () => {
      const validAquarium: IAquarium = {
        _id: '123',
        userId: 'user123',
        name: 'My Reef Tank',
        waterType: WaterType.SALTWATER,
        volume: 200,
        volumeUnit: 'liters',
        setupDate: new Date(),
        photos: [],
        equipment: [],
        inhabitants: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validAquarium).toBeDefined();
      expect(validAquarium.waterType).toBe(WaterType.SALTWATER);
    });

    it('should accept optional fields', () => {
      const aquariumWithOptionals: IAquarium = {
        _id: '123',
        userId: 'user123',
        name: 'My Tank',
        description: 'A beautiful planted tank',
        waterType: WaterType.FRESHWATER,
        volume: 100,
        volumeUnit: 'gallons',
        dimensions: {
          length: 120,
          width: 50,
          height: 60,
          unit: 'cm',
        },
        setupDate: new Date(),
        mainPhoto: 'photo.jpg',
        photos: ['photo1.jpg', 'photo2.jpg'],
        equipment: [
          {
            _id: 'eq1',
            name: 'Canister Filter',
            type: 'filter',
            brand: 'Fluval',
            model: 'FX6',
          },
        ],
        inhabitants: [
          {
            _id: 'fish1',
            type: 'fish',
            species: 'Pterophyllum scalare',
            commonName: 'Angelfish',
            quantity: 5,
            addedDate: new Date(),
          },
        ],
        waterParameters: {
          temperature: 25,
          ph: 7.2,
          lastUpdated: new Date(),
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(aquariumWithOptionals.dimensions).toBeDefined();
      expect(aquariumWithOptionals.equipment).toHaveLength(1);
    });
  });

  describe('IEvent Interface', () => {
    it('should accept valid event object', () => {
      const validEvent: IEvent = {
        _id: '123',
        userId: 'user123',
        aquariumId: 'aquarium123',
        type: EventType.WATER_CHANGE,
        title: 'Weekly Water Change',
        scheduledFor: new Date(),
        isRecurring: true,
        recurringPattern: {
          frequency: 'weekly',
          daysOfWeek: [0, 3], // Sunday and Wednesday
        },
        reminder: {
          enabled: true,
          minutesBefore: 30,
          notificationTypes: ['push', 'email'],
        },
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validEvent).toBeDefined();
      expect(validEvent.recurringPattern?.frequency).toBe('weekly');
    });
  });

  describe('INotification Interface', () => {
    it('should accept valid notification object', () => {
      const validNotification: INotification = {
        _id: '123',
        userId: 'user123',
        type: NotificationType.PUSH,
        priority: NotificationPriority.HIGH,
        title: 'Water Change Reminder',
        body: 'Time for your weekly water change!',
        channels: [NotificationType.PUSH, NotificationType.EMAIL],
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validNotification).toBeDefined();
      expect(validNotification.priority).toBe(NotificationPriority.HIGH);
    });
  });

  describe('Generic Interfaces', () => {
    it('should work with IPaginatedResponse', () => {
      const paginatedUsers: IPaginatedResponse<IUser> = {
        data: [],
        meta: {
          currentPage: 1,
          totalPages: 10,
          pageSize: 20,
          totalItems: 200,
          hasNext: true,
          hasPrevious: false,
        },
      };

      expect(paginatedUsers.meta.totalItems).toBe(200);
    });

    it('should work with IApiResponse', () => {
      const successResponse: IApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Operation successful' },
        timestamp: new Date(),
      };

      const errorResponse: IApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
        timestamp: new Date(),
      };

      expect(successResponse.success).toBe(true);
      expect(errorResponse.success).toBe(false);
    });
  });
});