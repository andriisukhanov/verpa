import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRepository } from '../../src/infrastructure/repositories/user.repository';
import { User, UserDocument } from '../../src/domain/entities/user.entity';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('UserRepository', () => {
  let repository: UserRepository;
  let model: jest.Mocked<Model<UserDocument>>;

  const mockUser = {
    _id: '123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    subscriptionType: SubscriptionType.FREE,
    emailVerified: true,
    isActive: true,
    isDeleted: false,
    save: jest.fn(),
  };

  const mockQuery = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(User.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUser),
            constructor: jest.fn().mockResolvedValue(mockUser),
            find: jest.fn().mockReturnValue(mockQuery),
            findOne: jest.fn().mockReturnValue(mockQuery),
            findById: jest.fn().mockReturnValue(mockQuery),
            findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
            findOneAndUpdate: jest.fn().mockReturnValue(mockQuery),
            deleteOne: jest.fn().mockReturnValue(mockQuery),
            updateOne: jest.fn().mockReturnValue(mockQuery),
            countDocuments: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    model = module.get<Model<UserDocument>>(getModelToken(User.name)) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hash',
        firstName: 'New',
        lastName: 'User',
      };

      const savedUser = { ...mockUser, ...userData, save: jest.fn().mockResolvedValue(mockUser) };
      jest.spyOn(model as any, 'create').mockImplementation(() => savedUser);
      (model as any).mockImplementation(() => savedUser);

      const result = await repository.create(userData);

      expect(savedUser.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockQuery.exec.mockResolvedValue(mockUser);

      const result = await repository.findById('123');

      expect(model.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.exec.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockQuery.exec.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(model.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      const users = [mockUser, { ...mockUser, _id: '456' }];
      mockQuery.exec.mockResolvedValue(users);
      model.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(50) } as any);

      const result = await repository.findPaginated({}, 2, 20, { createdAt: -1 });

      expect(mockQuery.skip).toHaveBeenCalledWith(20);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual({
        data: users,
        total: 50,
        page: 2,
        totalPages: 3,
      });
    });
  });

  describe('update', () => {
    it('should update user by id', async () => {
      const updateData = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updateData };
      mockQuery.exec.mockResolvedValue(updatedUser);

      const result = await repository.update('123', updateData);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: updateData },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      mockQuery.exec.mockResolvedValue({ modifiedCount: 1 });

      const result = await repository.softDelete('123');

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $set: { isDeleted: true, deletedAt: expect.any(Date) } },
      );
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockQuery.exec.mockResolvedValue({ modifiedCount: 0 });

      const result = await repository.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when user exists', async () => {
      model.countDocuments.mockReturnValue({
        limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      } as any);

      const result = await repository.exists({ email: 'test@example.com' });

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      model.countDocuments.mockReturnValue({
        limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      } as any);

      const result = await repository.exists({ email: 'nonexistent@example.com' });

      expect(result).toBe(false);
    });
  });

  describe('incrementLoginAttempts', () => {
    it('should increment login attempts', async () => {
      const updatedUser = { ...mockUser, loginAttempts: 1 };
      mockQuery.exec.mockResolvedValue(updatedUser);

      const result = await repository.incrementLoginAttempts('123');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $inc: { loginAttempts: 1 } },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('resetLoginAttempts', () => {
    it('should reset login attempts and unlock account', async () => {
      mockQuery.exec.mockResolvedValue(mockUser);

      const result = await repository.resetLoginAttempts('123');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } },
        { new: true },
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('addRefreshToken', () => {
    it('should add refresh token to user', async () => {
      const token = 'newRefreshToken';
      const updatedUser = { ...mockUser, refreshTokens: [token] };
      mockQuery.exec.mockResolvedValue(updatedUser);

      const result = await repository.addRefreshToken('123', token);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $push: { refreshTokens: token } },
        { new: true },
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockQuery.exec.mockResolvedValue(verifiedUser);

      const result = await repository.verifyEmail('123');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        {
          $set: { emailVerified: true },
          $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
        },
        { new: true },
      );
      expect(result).toEqual(verifiedUser);
    });
  });
});