import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../../domain/services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { User } from '../../domain/entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  ChangePasswordDto,
  UpdateUserRoleDto,
  UpdateUserSubscriptionDto,
} from '../dto';
import { UserRole, SubscriptionType } from '@verpa/common';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUser: User = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: UserRole.USER,
    emailVerified: true,
    phoneVerified: false,
    isActive: true,
    subscriptionType: SubscriptionType.FREE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as any;

  const mockAdmin: User = {
    ...mockUser,
    _id: '507f1f77bcf86cd799439012',
    email: 'admin@example.com',
    username: 'admin',
    role: UserRole.ADMIN,
  } as any;

  const mockUserService = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    changePassword: jest.fn(),
    getStats: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      phone: '+1234567890',
    };

    it('should create a new user successfully', async () => {
      const newUser = { ...mockUser, ...createUserDto };
      userService.create.mockResolvedValue(newUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(newUser);
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if user already exists', async () => {
      userService.create.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid input', async () => {
      userService.create.mockRejectedValue(
        new BadRequestException('Invalid email format'),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const queryDto: QueryUserDto = {
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
      search: 'test',
      role: UserRole.USER,
      isActive: true,
    };

    const paginatedResult = {
      items: [mockUser],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    it('should return paginated users with filters', async () => {
      userService.findPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(userService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { email: { $regex: 'test', $options: 'i' } },
            { username: { $regex: 'test', $options: 'i' } },
            { firstName: { $regex: 'test', $options: 'i' } },
            { lastName: { $regex: 'test', $options: 'i' } },
          ]),
          role: UserRole.USER,
          isActive: true,
        }),
        1,
        10,
        { createdAt: -1 },
      );
    });

    it('should handle empty query parameters', async () => {
      userService.findPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(userService.findPaginated).toHaveBeenCalledWith(
        {},
        undefined,
        undefined,
        { createdAt: -1 },
      );
    });

    it('should handle email filter with lowercase conversion', async () => {
      userService.findPaginated.mockResolvedValue(paginatedResult);

      await controller.findAll({ email: 'TEST@EXAMPLE.COM' });

      expect(userService.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        undefined,
        undefined,
        { createdAt: -1 },
      );
    });

    it('should handle custom sort parameters', async () => {
      userService.findPaginated.mockResolvedValue(paginatedResult);

      await controller.findAll({ sort: 'username:asc' });

      expect(userService.findPaginated).toHaveBeenCalledWith(
        {},
        undefined,
        undefined,
        { username: 1 },
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getProfile(mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+9876543210',
    };

    it('should update current user profile', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        updateDto,
      );
    });

    it('should handle empty update data', async () => {
      userService.update.mockResolvedValue(mockUser);

      const result = await controller.updateProfile(mockUser, {});

      expect(result).toEqual(mockUser);
      expect(userService.update).toHaveBeenCalledWith(mockUser._id.toString(), {});
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldPassword123!',
      newPassword: 'newPassword123!',
    };

    it('should change password successfully', async () => {
      userService.changePassword.mockResolvedValue(undefined);

      await expect(
        controller.changePassword(mockUser, changePasswordDto),
      ).resolves.toBeUndefined();

      expect(userService.changePassword).toHaveBeenCalledWith(
        mockUser._id.toString(),
        changePasswordDto,
      );
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      userService.changePassword.mockRejectedValue(
        new BadRequestException('Current password is incorrect'),
      );

      await expect(
        controller.changePassword(mockUser, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      userService.changePassword.mockRejectedValue(
        new BadRequestException('Password does not meet requirements'),
      );

      await expect(
        controller.changePassword(mockUser, { ...changePasswordDto, newPassword: 'weak' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalUsers: 1000,
      activeUsers: 850,
      verifiedUsers: 750,
      usersByRole: {
        [UserRole.USER]: 950,
        [UserRole.MODERATOR]: 40,
        [UserRole.ADMIN]: 10,
      },
      usersBySubscription: {
        [SubscriptionType.FREE]: 700,
        [SubscriptionType.PREMIUM]: 250,
        [SubscriptionType.PROFESSIONAL]: 50,
      },
      recentSignups: 125,
      growth: {
        daily: 10,
        weekly: 65,
        monthly: 125,
      },
    };

    it('should return user statistics', async () => {
      userService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(userService.getStats).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      userService.getStats.mockRejectedValue(new Error('Database error'));

      await expect(controller.getStats()).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById(mockUser._id.toString());

      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid ID format', async () => {
      userService.findById.mockRejectedValue(
        new BadRequestException('Invalid ID format'),
      );

      await expect(controller.findById('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Admin',
      lastName: 'Updated',
      isActive: false,
    };

    it('should update user by ID', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser._id.toString(), updateDto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        updateDto,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.update.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.update('nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    const updateRoleDto: UpdateUserRoleDto = {
      role: UserRole.MODERATOR,
    };

    it('should update user role', async () => {
      const updatedUser = { ...mockUser, role: UserRole.MODERATOR };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateRole(mockUser._id.toString(), updateRoleDto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        { role: updateRoleDto.role },
      );
    });

    it('should prevent updating to invalid role', async () => {
      userService.update.mockRejectedValue(
        new BadRequestException('Invalid role'),
      );

      await expect(
        controller.updateRole(mockUser._id.toString(), { role: 'INVALID' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSubscription', () => {
    const updateSubscriptionDto: UpdateUserSubscriptionDto = {
      subscriptionType: SubscriptionType.PREMIUM,
      subscriptionStatus: 'active',
      subscriptionEndDate: new Date('2025-01-01'),
    };

    it('should update user subscription', async () => {
      const updatedUser = { ...mockUser, ...updateSubscriptionDto };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateSubscription(
        mockUser._id.toString(),
        updateSubscriptionDto,
      );

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        updateSubscriptionDto,
      );
    });

    it('should handle partial subscription updates', async () => {
      const partialUpdate = { subscriptionType: SubscriptionType.PROFESSIONAL };
      const updatedUser = { ...mockUser, ...partialUpdate };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateSubscription(
        mockUser._id.toString(),
        partialUpdate,
      );

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        partialUpdate,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      userService.delete.mockResolvedValue(undefined);

      await expect(
        controller.delete(mockUser._id.toString()),
      ).resolves.toBeUndefined();

      expect(userService.delete).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.delete.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should prevent deleting own account', async () => {
      userService.delete.mockRejectedValue(
        new BadRequestException('Cannot delete your own account'),
      );

      await expect(controller.delete(mockAdmin._id.toString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restore', () => {
    it('should restore deleted user', async () => {
      const restoredUser = { ...mockUser, isActive: true, deletedAt: null };
      userService.restore.mockResolvedValue(restoredUser);

      const result = await controller.restore(mockUser._id.toString());

      expect(result).toEqual(restoredUser);
      expect(userService.restore).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.restore.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.restore('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not deleted', async () => {
      userService.restore.mockRejectedValue(
        new BadRequestException('User is not deleted'),
      );

      await expect(controller.restore(mockUser._id.toString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Guard Integration', () => {
    it('should use JwtAuthGuard for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', UserController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should enforce role-based access for admin endpoints', () => {
      const createMetadata = Reflect.getMetadata('__guards__', controller.create);
      expect(createMetadata).toContain(RolesGuard);

      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toContain(UserRole.ADMIN);
    });

    it('should allow moderators to view users', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.MODERATOR);
    });
  });
});