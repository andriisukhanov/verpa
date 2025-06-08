import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoggerService, LogAsync, LogPerformance, LogError } from '@verpa/logging';
import { IUserRepository } from '../repositories/user.repository.interface';
import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from '../../application/dto';
import { CryptoUtils, StringUtils, ValidationUtils, AuthProvider } from '@verpa/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEvents } from '../../application/events/user.events';

export interface CreateOAuthUserDto {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
  authProviders: Array<{
    provider: AuthProvider;
    providerId: string;
    email?: string;
    linkedAt: Date;
  }>;
}

export interface LinkAuthProviderDto {
  provider: AuthProvider;
  providerId: string;
  email?: string;
  linkedAt: Date;
}

@Injectable()
export class UserService {
  private readonly maxLoginAttempts = 5;
  private readonly lockTime = 2 * 60 * 60 * 1000; // 2 hours

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserService');
  }

  @LogAsync({ message: 'Creating new user', level: 'info' })
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmailOrUsername(
      createUserDto.email || createUserDto.username,
    );
    if (existingUser) {
      this.logger.warn('User creation failed - already exists', {
        email: createUserDto.email,
        username: createUserDto.username,
      });
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash password
    const rounds = this.configService.get<number>('auth.bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(createUserDto.password, rounds);

    // Generate verification token
    const emailVerificationToken = CryptoUtils.generateRandomToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    // Create user
    const user = await this.userRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      emailVerificationToken,
      emailVerificationExpires,
      isActive: true,
    });

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_CREATED, {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      emailVerificationToken,
    });

    this.logger.info('User created successfully', {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User> {
    const user = await this.userRepository.findByEmailOrUsername(emailOrUsername);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(filter: any = {}, options: any = {}): Promise<User[]> {
    return this.userRepository.findAll(
      { ...filter, isDeleted: false },
      options,
    );
  }

  async findPaginated(
    filter: any = {},
    page = 1,
    limit = 20,
    sort: any = { createdAt: -1 },
  ) {
    return this.userRepository.findPaginated(
      { ...filter, isDeleted: false },
      page,
      limit,
      sort,
    );
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Check for duplicate email/username if being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findByEmail(updateUserDto.email);
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existing = await this.userRepository.findByUsername(updateUserDto.username);
      if (existing) {
        throw new ConflictException('Username already in use');
      }
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_UPDATED, {
      userId: updatedUser._id.toString(),
      changes: updateUserDto,
    });

    return updatedUser;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findById(userId);

    // Verify current password
    const isValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const rounds = this.configService.get<number>('auth.bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, rounds);

    // Update password and clear refresh tokens
    await this.userRepository.update(userId, { passwordHash });
    await this.userRepository.removeAllRefreshTokens(userId);

    // Emit event
    this.eventEmitter.emit(UserEvents.PASSWORD_CHANGED, {
      userId: user._id.toString(),
      email: user.email,
    });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softDelete(id);

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_DELETED, {
      userId: user._id.toString(),
      email: user.email,
    });
  }

  async restore(id: string): Promise<User> {
    const success = await this.userRepository.restore(id);
    if (!success) {
      throw new NotFoundException('User not found');
    }
    return this.findById(id);
  }

  @LogPerformance({ warningThreshold: 500 })
  async validateUser(emailOrUsername: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findByEmailOrUsername(emailOrUsername);
    if (!user || user.isDeleted || !user.isActive) {
      this.logger.debug('User validation failed - user not found or inactive', {
        emailOrUsername,
      });
      return null;
    }

    // Check if account is locked
    if (user.isLocked) {
      this.logger.warn('Login attempt on locked account', {
        userId: user._id.toString(),
        email: user.email,
      });
      throw new UnauthorizedException('Account is locked due to too many failed login attempts');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Increment login attempts
      await this.handleFailedLogin(user);
      this.logger.warn('Failed login attempt', {
        userId: user._id.toString(),
        email: user.email,
        loginAttempts: user.loginAttempts + 1,
      });
      return null;
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await this.userRepository.resetLoginAttempts(user._id.toString());
    }

    this.logger.info('User validated successfully', {
      userId: user._id.toString(),
      email: user.email,
    });

    return user;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const updatedUser = await this.userRepository.incrementLoginAttempts(
      user._id.toString(),
    );

    if (updatedUser && updatedUser.loginAttempts >= this.maxLoginAttempts) {
      const lockUntil = new Date(Date.now() + this.lockTime);
      await this.userRepository.lockAccount(user._id.toString(), lockUntil);

      // Emit event
      this.eventEmitter.emit(UserEvents.ACCOUNT_LOCKED, {
        userId: user._id.toString(),
        email: user.email,
        lockUntil,
      });

      this.logger.warn('Account locked due to excessive failed login attempts', {
        userId: user._id.toString(),
        email: user.email,
        lockUntil,
      });
    }
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepository.findAll({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).then((users) => users[0]);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const verifiedUser = await this.userRepository.verifyEmail(user._id.toString());
    if (!verifiedUser) {
      throw new NotFoundException('User not found');
    }

    // Emit event
    this.eventEmitter.emit(UserEvents.EMAIL_VERIFIED, {
      userId: verifiedUser._id.toString(),
      email: verifiedUser.email,
    });

    return verifiedUser;
  }

  @LogAsync({ message: 'Resending verification email', level: 'info' })
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      return;
    }

    // Check if there's a rate limit (e.g., can only resend every 5 minutes)
    const lastSent = user.emailVerificationExpires;
    if (lastSent) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const tokenAge = new Date(lastSent.getTime() - 24 * 60 * 60 * 1000); // Token was created 24h before expiry
      if (tokenAge > fiveMinutesAgo) {
        throw new BadRequestException('Please wait before requesting another verification email');
      }
    }

    // Generate new verification token
    const verificationToken = CryptoUtils.generateRandomToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    await this.userRepository.update(user._id.toString(), {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Emit event for notification service
    this.eventEmitter.emit(UserEvents.USER_CREATED, {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerificationToken: verificationToken,
    });
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = CryptoUtils.generateRandomToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await this.userRepository.update(user._id.toString(), {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // Emit event
    this.eventEmitter.emit(UserEvents.PASSWORD_RESET_REQUESTED, {
      userId: user._id.toString(),
      email: user.email,
      resetToken,
    });
  }

  @LogAsync({ message: 'Resetting password', level: 'info' })
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findAll({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).then((users) => users[0]);

    if (!user) {
      this.logger.warn('Password reset failed - invalid token');
      throw new BadRequestException('Invalid or expired reset token');
    }

    const rounds = this.configService.get<number>('auth.bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.userRepository.update(user._id.toString(), {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    // Clear all refresh tokens
    await this.userRepository.removeAllRefreshTokens(user._id.toString());

    // Emit event
    this.eventEmitter.emit(UserEvents.PASSWORD_RESET_COMPLETED, {
      userId: user._id.toString(),
      email: user.email,
    });

    this.logger.info('Password reset successfully', {
      userId: user._id.toString(),
      email: user.email,
    });
  }

  async validateResetToken(token: string): Promise<boolean> {
    const user = await this.userRepository.findAll({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).then((users) => users[0]);

    return !!user;
  }

  async updateLastLogin(userId: string, ip?: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId, ip);
  }

  async createOAuthUser(createOAuthUserDto: CreateOAuthUserDto): Promise<User> {
    // Check if user already exists with this email
    const existingUser = await this.userRepository.findByEmail(createOAuthUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate a random secure password for OAuth users
    const randomPassword = CryptoUtils.generateRandomToken(32);
    const rounds = this.configService.get<number>('auth.bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(randomPassword, rounds);

    // Create user
    const user = await this.userRepository.create({
      ...createOAuthUserDto,
      email: createOAuthUserDto.email.toLowerCase(),
      passwordHash,
      isActive: true,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
      },
    });

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_CREATED, {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      provider: createOAuthUserDto.authProviders[0].provider,
    });

    return user;
  }

  async findByAuthProvider(provider: string, providerId: string): Promise<User | null> {
    const user = await this.userRepository.findByAuthProvider(provider, providerId);
    if (!user || user.isDeleted) {
      return null;
    }
    return user;
  }

  async linkAuthProvider(userId: string, authProvider: LinkAuthProviderDto): Promise<User> {
    const user = await this.findById(userId);

    // Check if provider is already linked
    const existingProvider = user.authProviders.find(
      (ap) => ap.provider === authProvider.provider
    );
    if (existingProvider) {
      throw new ConflictException('This provider is already linked to your account');
    }

    // Check if provider is linked to another account
    const otherUser = await this.userRepository.findByAuthProvider(
      authProvider.provider,
      authProvider.providerId
    );
    if (otherUser) {
      throw new ConflictException('This provider is already linked to another account');
    }

    // Add provider to user
    const updatedUser = await this.userRepository.update(userId, {
      authProviders: [...user.authProviders, authProvider],
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_UPDATED, {
      userId: user._id.toString(),
      changes: { authProviderLinked: authProvider.provider },
    });

    return updatedUser;
  }

  async unlinkAuthProvider(userId: string, provider: AuthProvider): Promise<User> {
    const user = await this.findById(userId);

    // Check if user has password or other auth providers
    const hasPassword = !!user.passwordHash;
    const otherProviders = user.authProviders.filter((ap) => ap.provider !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      throw new BadRequestException(
        'Cannot unlink the only authentication method. Please set a password first.'
      );
    }

    // Remove provider
    const updatedUser = await this.userRepository.update(userId, {
      authProviders: otherProviders,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Emit event
    this.eventEmitter.emit(UserEvents.USER_UPDATED, {
      userId: user._id.toString(),
      changes: { authProviderUnlinked: provider },
    });

    return updatedUser;
  }

  async getStats(): Promise<any> {
    const [total, active, verified, bySubscription] = await Promise.all([
      this.userRepository.count({ isDeleted: false }),
      this.userRepository.count({ isDeleted: false, isActive: true }),
      this.userRepository.count({ isDeleted: false, emailVerified: true }),
      this.getSubscriptionStats(),
    ]);

    return {
      total,
      active,
      verified,
      unverified: total - verified,
      bySubscription,
    };
  }

  private async getSubscriptionStats(): Promise<any> {
    const users = await this.userRepository.findAll({ isDeleted: false });
    const stats = users.reduce((acc, user) => {
      acc[user.subscriptionType] = (acc[user.subscriptionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  }

  @LogAsync({ message: 'Cleaning up expired tokens', level: 'info' })
  async cleanupExpiredTokens(): Promise<{ emailVerification: number; passwordReset: number }> {
    const now = new Date();
    
    // Clean up expired email verification tokens
    const emailVerificationResult = await this.userRepository.updateMany(
      {
        emailVerificationToken: { $exists: true },
        emailVerificationExpires: { $lt: now },
      },
      {
        $unset: {
          emailVerificationToken: '',
          emailVerificationExpires: '',
        },
      },
    );

    // Clean up expired password reset tokens
    const passwordResetResult = await this.userRepository.updateMany(
      {
        passwordResetToken: { $exists: true },
        passwordResetExpires: { $lt: now },
      },
      {
        $unset: {
          passwordResetToken: '',
          passwordResetExpires: '',
        },
      },
    );

    return {
      emailVerification: emailVerificationResult.modifiedCount || 0,
      passwordReset: passwordResetResult.modifiedCount || 0,
    };
  }
}