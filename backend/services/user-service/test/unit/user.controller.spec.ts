import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/application/controllers/user.controller';
import { UserService } from '../../src/domain/services/user.service';
import { User } from '../../src/domain/entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UpdateUserSubscriptionDto,
} from '../../src/application/dto';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUser: Partial<User> = {
    _id: '123' as any,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    subscriptionType: SubscriptionType.FREE,
    emailVerified: true,
    isActive: true,
  };

  const mockPaginatedResponse = {
    data: [mockUser],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findPaginated: jest.fn(),
            update: jest.fn(),
            changePassword: jest.fn(),
            delete: jest.fn(),
            restore: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'SecureP@ssw0rd!',
        firstName: 'New',
        lastName: 'User',
      };

      userService.create.mockResolvedValue(mockUser as User);

      const result = await controller.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const query: QueryUserDto = {
        page: 1,
        limit: 20,
        search: 'test',
      };

      userService.findPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(userService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { email: { $regex: 'test', $options: 'i' } },
            { username: { $regex: 'test', $options: 'i' } },
          ]),
        }),
        1,
        20,
        { createdAt: -1 },
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should apply filters correctly', async () => {
      const query: QueryUserDto = {
        email: 'test@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: false,
      };

      userService.findPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query);

      expect(userService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: UserRole.ADMIN,
          isActive: true,
          emailVerified: false,
        }),
        1,
        20,
        { createdAt: -1 },
      );
    });

    it('should parse sort parameter', async () => {
      const query: QueryUserDto = {
        sort: 'username:asc',
      };

      userService.findPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query);

      expect(userService.findPaginated).toHaveBeenCalledWith(
        {},
        1,
        20,
        { username: 1 },
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      userService.findById.mockResolvedValue(mockUser as User);

      const result = await controller.getProfile(mockUser as User);

      expect(userService.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update current user profile', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      userService.update.mockResolvedValue(updatedUser as User);

      const result = await controller.updateProfile(mockUser as User, updateDto);

      expect(userService.update).toHaveBeenCalledWith('123', updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('changePassword', () => {
    it('should change current user password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'NewSecureP@ssw0rd!',
      };

      userService.changePassword.mockResolvedValue();

      await controller.changePassword(mockUser as User, changePasswordDto);

      expect(userService.changePassword).toHaveBeenCalledWith('123', changePasswordDto);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const stats = {
        total: 100,
        active: 90,
        verified: 80,
        unverified: 20,
        bySubscription: {
          [SubscriptionType.FREE]: 70,
          [SubscriptionType.PREMIUM]: 20,
          [SubscriptionType.ENTERPRISE]: 10,
        },
      };

      userService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(userService.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      userService.findById.mockResolvedValue(mockUser as User);

      const result = await controller.findById('123');

      expect(userService.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user by id', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      userService.update.mockResolvedValue(updatedUser as User);

      const result = await controller.update('123', updateDto);

      expect(userService.update).toHaveBeenCalledWith('123', updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const updateRoleDto: UpdateUserRoleDto = {
        role: UserRole.ADMIN,
      };

      const updatedUser = { ...mockUser, role: UserRole.ADMIN };
      userService.update.mockResolvedValue(updatedUser as User);

      const result = await controller.updateRole('123', updateRoleDto);

      expect(userService.update).toHaveBeenCalledWith('123', { role: UserRole.ADMIN });
      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('updateSubscription', () => {
    it('should update user subscription', async () => {
      const updateSubscriptionDto: UpdateUserSubscriptionDto = {
        subscriptionType: SubscriptionType.PREMIUM,
        subscription: {
          planId: 'premium-monthly',
          status: 'active',
          startDate: new Date(),
          autoRenew: true,
        },
      };

      const updatedUser = { ...mockUser, ...updateSubscriptionDto };
      userService.update.mockResolvedValue(updatedUser as User);

      const result = await controller.updateSubscription('123', updateSubscriptionDto);

      expect(userService.update).toHaveBeenCalledWith('123', updateSubscriptionDto);
      expect(result.subscriptionType).toBe(SubscriptionType.PREMIUM);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      userService.delete.mockResolvedValue();

      await controller.delete('123');

      expect(userService.delete).toHaveBeenCalledWith('123');
    });
  });

  describe('restore', () => {
    it('should restore deleted user', async () => {
      userService.restore.mockResolvedValue(mockUser as User);

      const result = await controller.restore('123');

      expect(userService.restore).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });
  });
});