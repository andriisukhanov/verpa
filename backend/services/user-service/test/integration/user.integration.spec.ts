import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { UserService } from '../../src/domain/services/user.service';
import { UserRepository } from '../../src/infrastructure/repositories/user.repository';
import { AuthService } from '../../src/application/services/auth.service';
import { UserRole, SubscriptionType } from '@verpa/common';

describe('User Service Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let userService: UserService;
  let authService: AuthService;
  let userRepository: UserRepository;

  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
  };

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    authService = moduleFixture.get<AuthService>(AuthService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up database between tests
    const collections = await mongoServer.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register(testUser);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.username).toBe(testUser.username);
      expect(result.user.emailVerified).toBe(false);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should hash password during registration', async () => {
      const result = await authService.register(testUser);
      const user = await userRepository.findById(result.user.id);

      expect(user.password).not.toBe(testUser.password);
      const isPasswordValid = await bcrypt.compare(testUser.password, user.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should prevent duplicate email registration', async () => {
      await authService.register(testUser);

      await expect(
        authService.register({ ...testUser, username: 'different' }),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should prevent duplicate username registration', async () => {
      await authService.register(testUser);

      await expect(
        authService.register({ ...testUser, email: 'different@example.com' }),
      ).rejects.toThrow('Username already taken');
    });

    it('should set default role and subscription type', async () => {
      const result = await authService.register(testUser);

      expect(result.user.role).toBe(UserRole.USER);
      expect(result.user.subscriptionType).toBe(SubscriptionType.FREE);
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      await authService.register(testUser);
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login(testUser.email, testUser.password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(testUser.email);
    });

    it('should update last login timestamp', async () => {
      const loginResult = await authService.login(testUser.email, testUser.password);
      const user = await userRepository.findById(loginResult.user.id);

      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.login(testUser.email, 'WrongPassword'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(
        authService.login('nonexistent@example.com', testUser.password),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle account locking after failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login(testUser.email, 'WrongPassword');
        } catch (error) {
          // Expected to fail
        }
      }

      // Account should be locked now
      await expect(
        authService.login(testUser.email, testUser.password),
      ).rejects.toThrow('Account is locked');
    });
  });

  describe('Token Management', () => {
    let userId: string;
    let refreshToken: string;

    beforeEach(async () => {
      const result = await authService.register(testUser);
      userId = result.user.id;
      refreshToken = result.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const result = await authService.refreshTokens(userId, refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(refreshToken); // Should be rotated
    });

    it('should invalidate old refresh token after use', async () => {
      await authService.refreshTokens(userId, refreshToken);

      // Try to use the old refresh token again
      await expect(
        authService.refreshTokens(userId, refreshToken),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should logout and remove all refresh tokens', async () => {
      await authService.logout(userId);

      await expect(
        authService.refreshTokens(userId, refreshToken),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Email Verification', () => {
    let userId: string;
    let verificationToken: string;

    beforeEach(async () => {
      const result = await authService.register(testUser);
      userId = result.user.id;
      
      // Get verification token from user
      const user = await userRepository.findById(userId);
      verificationToken = user.emailVerificationToken;
    });

    it('should verify email with valid token', async () => {
      const result = await authService.verifyEmail(verificationToken);

      expect(result.emailVerified).toBe(true);
      expect(result.emailVerificationToken).toBeUndefined();
    });

    it('should reject invalid verification token', async () => {
      await expect(
        authService.verifyEmail('invalid-token'),
      ).rejects.toThrow('Invalid or expired verification token');
    });

    it('should reject expired verification token', async () => {
      // Update token expiry to past
      await userRepository.update(userId, {
        emailVerificationExpires: new Date(Date.now() - 1000),
      });

      await expect(
        authService.verifyEmail(verificationToken),
      ).rejects.toThrow('Invalid or expired verification token');
    });
  });

  describe('Password Reset Flow', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register(testUser);
      userId = result.user.id;
    });

    it('should initiate password reset', async () => {
      await authService.forgotPassword(testUser.email);

      const user = await userRepository.findById(userId);
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpires).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      await authService.forgotPassword(testUser.email);
      
      const user = await userRepository.findById(userId);
      const resetToken = user.resetPasswordToken;

      const newPassword = 'NewPassword123!';
      await authService.resetPassword(resetToken, newPassword);

      // Should be able to login with new password
      const loginResult = await authService.login(testUser.email, newPassword);
      expect(loginResult).toBeDefined();
    });

    it('should invalidate reset token after use', async () => {
      await authService.forgotPassword(testUser.email);
      
      const user = await userRepository.findById(userId);
      const resetToken = user.resetPasswordToken;

      await authService.resetPassword(resetToken, 'NewPassword123!');

      // Try to use the same token again
      await expect(
        authService.resetPassword(resetToken, 'AnotherPassword123!'),
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('User Profile Management', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register(testUser);
      userId = result.user.id;
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210',
        bio: 'Test bio',
        location: 'Test City',
      };

      const result = await userService.update(userId, updateData);

      expect(result.firstName).toBe(updateData.firstName);
      expect(result.lastName).toBe(updateData.lastName);
      expect(result.phone).toBe(updateData.phone);
      expect(result.bio).toBe(updateData.bio);
    });

    it('should not update protected fields', async () => {
      const updateData = {
        email: 'newemail@example.com',
        role: UserRole.ADMIN,
        emailVerified: true,
      };

      await userService.update(userId, updateData);

      const user = await userRepository.findById(userId);
      expect(user.email).toBe(testUser.email); // Should not change
      expect(user.role).toBe(UserRole.USER); // Should not change
      expect(user.emailVerified).toBe(false); // Should not change
    });

    it('should change password', async () => {
      const newPassword = 'NewPassword123!';
      
      await userService.changePassword(userId, {
        currentPassword: testUser.password,
        newPassword,
      });

      // Should be able to login with new password
      const loginResult = await authService.login(testUser.email, newPassword);
      expect(loginResult).toBeDefined();
    });

    it('should reject password change with wrong current password', async () => {
      await expect(
        userService.changePassword(userId, {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('User Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple users
      await authService.register(testUser);
      await authService.register({
        ...testUser,
        email: 'user2@example.com',
        username: 'user2',
      });
      await authService.register({
        ...testUser,
        email: 'admin@example.com',
        username: 'admin',
      });
    });

    it('should search users by email', async () => {
      const result = await userService.findPaginated(
        { email: 'user2@example.com' },
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe('user2@example.com');
    });

    it('should search users by partial match', async () => {
      const result = await userService.findPaginated(
        { $or: [
          { email: { $regex: 'example.com', $options: 'i' } },
        ]},
        1,
        10,
      );

      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(user => {
        expect(user.email).toContain('example.com');
      });
    });

    it('should handle pagination correctly', async () => {
      const page1 = await userService.findPaginated({}, 1, 2);
      const page2 = await userService.findPaginated({}, 2, 2);

      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(1);
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
      expect(page1.totalPages).toBe(2);
    });
  });

  describe('OAuth Integration', () => {
    it('should handle Google OAuth login', async () => {
      const googleProfile = {
        id: 'google123',
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        picture: 'https://example.com/picture.jpg',
        emailVerified: true,
      };

      const result = await authService.oauthLogin('google', googleProfile);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(googleProfile.email);
      expect(result.user.emailVerified).toBe(true);
      expect(result.user.authProviders).toContainEqual({
        provider: 'google',
        providerId: googleProfile.id,
      });
    });

    it('should link OAuth account to existing user', async () => {
      // Create user with email/password
      const result = await authService.register(testUser);
      const userId = result.user.id;

      // Link Google account
      const googleProfile = {
        id: 'google123',
        email: testUser.email,
        emailVerified: true,
      };

      await authService.linkOAuthAccount(userId, 'google', googleProfile);

      const user = await userRepository.findById(userId);
      expect(user.authProviders).toContainEqual({
        provider: 'google',
        providerId: googleProfile.id,
      });
    });
  });

  describe('User Statistics', () => {
    beforeEach(async () => {
      // Create users with different attributes
      await authService.register(testUser);
      
      const adminUser = await authService.register({
        ...testUser,
        email: 'admin@example.com',
        username: 'admin',
      });
      await userRepository.update(adminUser.user.id, {
        role: UserRole.ADMIN,
        emailVerified: true,
      });

      const premiumUser = await authService.register({
        ...testUser,
        email: 'premium@example.com',
        username: 'premium',
      });
      await userRepository.update(premiumUser.user.id, {
        subscriptionType: SubscriptionType.PREMIUM,
        emailVerified: true,
      });
    });

    it('should calculate user statistics correctly', async () => {
      const stats = await userService.getStats();

      expect(stats.totalUsers).toBe(3);
      expect(stats.verifiedUsers).toBe(2);
      expect(stats.usersByRole[UserRole.USER]).toBe(2);
      expect(stats.usersByRole[UserRole.ADMIN]).toBe(1);
      expect(stats.usersBySubscription[SubscriptionType.FREE]).toBe(2);
      expect(stats.usersBySubscription[SubscriptionType.PREMIUM]).toBe(1);
    });
  });

  describe('Soft Delete and Restore', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register(testUser);
      userId = result.user.id;
    });

    it('should soft delete user', async () => {
      await userService.delete(userId);

      const user = await userRepository.findById(userId);
      expect(user.isDeleted).toBe(true);
      expect(user.deletedAt).toBeDefined();
    });

    it('should exclude soft deleted users from normal queries', async () => {
      await userService.delete(userId);

      const result = await userService.findPaginated({}, 1, 10);
      expect(result.items).toHaveLength(0);
    });

    it('should restore soft deleted user', async () => {
      await userService.delete(userId);
      const restored = await userService.restore(userId);

      expect(restored.isDeleted).toBe(false);
      expect(restored.deletedAt).toBeUndefined();
    });

    it('should prevent login for soft deleted users', async () => {
      await userService.delete(userId);

      await expect(
        authService.login(testUser.email, testUser.password),
      ).rejects.toThrow('Account has been deleted');
    });
  });
});