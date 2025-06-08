import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRepository } from './user.repository';
import { User, UserDocument } from '../../domain/entities/user.entity';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('UserRepository', () => {
  let repository: UserRepository;
  let userModel: Model<UserDocument>;

  const mockUser = {
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
    isDeleted: false,
    subscriptionType: SubscriptionType.FREE,
    loginAttempts: 0,
    refreshTokens: [],
    authProviders: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    new: jest.fn().mockReturnValue(mockUser),
    constructor: jest.fn().mockReturnValue(mockUser),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'hashedPassword',
      };

      const mockSave = jest.fn().mockResolvedValue({ ...mockUser, ...userData });
      mockUserModel.new.mockReturnValue({ save: mockSave });

      const result = await repository.create(userData);

      expect(mockUserModel.new).toHaveBeenCalledWith(userData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toMatchObject(userData);
    });

    it('should handle save errors', async () => {
      const userData = { email: 'new@example.com' };
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockUserModel.new.mockReturnValue({ save: mockSave });

      await expect(repository.create(userData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await repository.findById(mockUser._id);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case insensitive)', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await repository.findByUsername('testuser');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should find user by email or username', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await repository.findByEmailOrUsername('test@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle uppercase email', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await repository.findByEmailOrUsername('TEST@EXAMPLE.COM');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'TEST@EXAMPLE.COM' }],
      });
    });
  });

  describe('findByAuthProvider', () => {
    it('should find user by auth provider', async () => {
      const userWithProvider = {
        ...mockUser,
        authProviders: [{ provider: 'google', providerId: '123456' }],
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithProvider),
      });

      const result = await repository.findByAuthProvider('google', '123456');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        'authProviders.provider': 'google',
        'authProviders.providerId': '123456',
      });
      expect(result).toEqual(userWithProvider);
    });
  });

  describe('findAll', () => {
    const mockUsers = [mockUser, { ...mockUser, _id: '2', email: 'test2@example.com' }];

    it('should find all users with default options', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      const result = await repository.findAll();

      expect(mockUserModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockUsers);
    });

    it('should apply sort option', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      await repository.findAll({}, { sort: { createdAt: -1 } });

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should apply limit and skip options', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      await repository.findAll({}, { limit: 10, skip: 20 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.skip).toHaveBeenCalledWith(20);
    });

    it('should apply select option', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserModel.find.mockReturnValue(mockQuery);

      await repository.findAll({}, { select: 'email username' });

      expect(mockQuery.select).toHaveBeenCalledWith('email username');
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      const mockUsers = [mockUser];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserModel.find.mockReturnValue(mockQuery);
      mockUserModel.countDocuments.mockResolvedValue(25);

      const result = await repository.findPaginated({}, 2, 10);

      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page-1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: mockUsers,
        total: 25,
        page: 2,
        totalPages: 3,
      });
    });

    it('should use default pagination values', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(mockQuery);
      mockUserModel.countDocuments.mockResolvedValue(0);

      await repository.findPaginated();

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('update', () => {
    it('should update user by ID', async () => {
      const updateData = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await repository.update(mockUser._id, updateData);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });

    it('should return null if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('updateByEmail', () => {
    it('should update user by email (case insensitive)', async () => {
      const updateData = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await repository.updateByEmail('TEST@EXAMPLE.COM', updateData);

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updateMany', () => {
    it('should update multiple users', async () => {
      mockUserModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
      });

      const result = await repository.updateMany(
        { role: UserRole.USER },
        { $set: { subscriptionType: SubscriptionType.PREMIUM } },
      );

      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        { role: UserRole.USER },
        { $set: { subscriptionType: SubscriptionType.PREMIUM } },
      );
      expect(result).toEqual({ modifiedCount: 5 });
    });
  });

  describe('delete', () => {
    it('should delete user by ID', async () => {
      mockUserModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await repository.delete(mockUser._id);

      expect(mockUserModel.deleteOne).toHaveBeenCalledWith({ _id: mockUser._id });
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockUserModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      mockUserModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.softDelete(mockUser._id);

      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
      expect(result).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore soft deleted user', async () => {
      mockUserModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await repository.restore(mockUser._id);

      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
      );
      expect(result).toBe(true);
    });
  });

  describe('count', () => {
    it('should count documents', async () => {
      mockUserModel.countDocuments.mockResolvedValue(100);

      const result = await repository.count({ role: UserRole.USER });

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({ role: UserRole.USER });
      expect(result).toBe(100);
    });

    it('should count all documents with empty filter', async () => {
      mockUserModel.countDocuments.mockResolvedValue(150);

      const result = await repository.count();

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(150);
    });
  });

  describe('exists', () => {
    it('should return true if document exists', async () => {
      mockUserModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.exists({ email: 'test@example.com' });

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toBe(true);
    });

    it('should return false if document does not exist', async () => {
      mockUserModel.countDocuments.mockReturnValue({
        limit: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.exists({ email: 'nonexistent@example.com' });

      expect(result).toBe(false);
    });
  });

  describe('Account locking methods', () => {
    describe('incrementLoginAttempts', () => {
      it('should increment login attempts', async () => {
        const updatedUser = { ...mockUser, loginAttempts: 1 };
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedUser),
        });

        const result = await repository.incrementLoginAttempts(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $inc: { loginAttempts: 1 } },
          { new: true },
        );
        expect(result).toEqual(updatedUser);
      });
    });

    describe('resetLoginAttempts', () => {
      it('should reset login attempts and unlock account', async () => {
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        });

        const result = await repository.resetLoginAttempts(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } },
          { new: true },
        );
        expect(result).toEqual(mockUser);
      });
    });

    describe('lockAccount', () => {
      it('should lock account until specified date', async () => {
        const lockUntil = new Date('2024-12-31');
        const lockedUser = { ...mockUser, lockUntil };
        
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(lockedUser),
        });

        const result = await repository.lockAccount(mockUser._id, lockUntil);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $set: { lockUntil } },
          { new: true },
        );
        expect(result).toEqual(lockedUser);
      });
    });

    describe('unlockAccount', () => {
      it('should unlock account and reset login attempts', async () => {
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        });

        const result = await repository.unlockAccount(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $unset: { lockUntil: 1 }, $set: { loginAttempts: 0 } },
          { new: true },
        );
        expect(result).toEqual(mockUser);
      });
    });
  });

  describe('Refresh token methods', () => {
    describe('addRefreshToken', () => {
      it('should add refresh token', async () => {
        const token = 'refresh-token-123';
        const updatedUser = { ...mockUser, refreshTokens: [token] };
        
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedUser),
        });

        const result = await repository.addRefreshToken(mockUser._id, token);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $push: { refreshTokens: token } },
          { new: true },
        );
        expect(result).toEqual(updatedUser);
      });
    });

    describe('removeRefreshToken', () => {
      it('should remove specific refresh token', async () => {
        const token = 'refresh-token-123';
        
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        });

        const result = await repository.removeRefreshToken(mockUser._id, token);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $pull: { refreshTokens: token } },
          { new: true },
        );
        expect(result).toEqual(mockUser);
      });
    });

    describe('removeAllRefreshTokens', () => {
      it('should remove all refresh tokens', async () => {
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        });

        const result = await repository.removeAllRefreshTokens(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          { $set: { refreshTokens: [] } },
          { new: true },
        );
        expect(result).toEqual(mockUser);
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time and IP', async () => {
      const ip = '192.168.1.1';
      const updatedUser = {
        ...mockUser,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      };
      
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await repository.updateLastLogin(mockUser._id, ip);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $set: { lastLoginAt: expect.any(Date), lastLoginIp: ip } },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update last login time without IP', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await repository.updateLastLogin(mockUser._id);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $set: { lastLoginAt: expect.any(Date) } },
        { new: true },
      );
    });
  });

  describe('Verification methods', () => {
    describe('verifyEmail', () => {
      it('should verify email and clear verification fields', async () => {
        const verifiedUser = { ...mockUser, emailVerified: true };
        
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(verifiedUser),
        });

        const result = await repository.verifyEmail(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          {
            $set: { emailVerified: true },
            $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
          },
          { new: true },
        );
        expect(result).toEqual(verifiedUser);
      });
    });

    describe('verifyPhone', () => {
      it('should verify phone and clear verification fields', async () => {
        const verifiedUser = { ...mockUser, phoneVerified: true };
        
        mockUserModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue(verifiedUser),
        });

        const result = await repository.verifyPhone(mockUser._id);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          {
            $set: { phoneVerified: true },
            $unset: { phoneVerificationCode: 1, phoneVerificationExpires: 1 },
          },
          { new: true },
        );
        expect(result).toEqual(verifiedUser);
      });
    });
  });
});