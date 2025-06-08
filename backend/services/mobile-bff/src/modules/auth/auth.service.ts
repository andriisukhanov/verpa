import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface LoginDto {
  emailOrUsername: string;
  password: string;
  deviceId?: string;
  deviceInfo?: {
    platform: 'ios' | 'android';
    version: string;
    model: string;
  };
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified: boolean;
    subscriptionType: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  requiresOnboarding: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/login`;
      
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, {
          emailOrUsername: loginDto.emailOrUsername,
          password: loginDto.password,
        }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
            'X-Device-Id': loginDto.deviceId,
            'X-Platform': loginDto.deviceInfo?.platform,
          },
        }),
      );

      const { user, accessToken, refreshToken, expiresIn } = response.data;

      // Cache user session
      if (loginDto.deviceId) {
        await this.cacheManager.set(
          `session:${user._id}:${loginDto.deviceId}`,
          {
            userId: user._id,
            deviceId: loginDto.deviceId,
            deviceInfo: loginDto.deviceInfo,
            lastActivity: new Date(),
          },
          expiresIn,
        );
      }

      // Check if user needs onboarding
      const requiresOnboarding = await this.checkOnboardingStatus(user._id, accessToken);

      return {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          subscriptionType: user.subscriptionType || 'FREE',
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        requiresOnboarding,
      };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/register`;
      
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, registerDto, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
          },
        }),
      );

      const { user, accessToken, refreshToken, expiresIn } = response.data;

      return {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          emailVerified: false,
          subscriptionType: 'FREE',
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        requiresOnboarding: true,
      };
    } catch (error) {
      this.logger.error('Registration failed', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string, deviceId?: string): Promise<AuthResponse> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/refresh`;
      
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, { refreshToken }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
            'X-Device-Id': deviceId,
          },
        }),
      );

      const { user, accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

      // Update session cache
      if (deviceId) {
        await this.cacheManager.set(
          `session:${user._id}:${deviceId}`,
          {
            userId: user._id,
            deviceId,
            lastActivity: new Date(),
          },
          expiresIn,
        );
      }

      return {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          subscriptionType: user.subscriptionType || 'FREE',
        },
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn,
        },
        requiresOnboarding: false,
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string, deviceId?: string): Promise<void> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/logout`;
      
      await firstValueFrom(
        this.httpService.post(apiUrl, { refreshToken }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
          },
        }),
      );

      // Clear session cache
      if (deviceId) {
        await this.cacheManager.del(`session:${userId}:${deviceId}`);
      }
    } catch (error) {
      this.logger.error('Logout failed', error);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/verify-email`;
      
      await firstValueFrom(
        this.httpService.post(apiUrl, { token }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
          },
        }),
      );
    } catch (error) {
      this.logger.error('Email verification failed', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/forgot-password`;
      
      await firstValueFrom(
        this.httpService.post(apiUrl, { email }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
          },
        }),
      );
    } catch (error) {
      this.logger.error('Forgot password request failed', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const apiUrl = `${this.configService.get('services.apiGateway')}/api/v1/auth/reset-password`;
      
      await firstValueFrom(
        this.httpService.post(apiUrl, { token, newPassword }, {
          headers: {
            'X-API-Key': this.configService.get('security.apiKey'),
          },
        }),
      );
    } catch (error) {
      this.logger.error('Password reset failed', error);
      throw error;
    }
  }

  private async checkOnboardingStatus(userId: string, token: string): Promise<boolean> {
    try {
      // Check if user has any aquariums
      const apiUrl = `${this.configService.get('services.aquariumService')}/aquariums`;
      
      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId,
            limit: 1,
          },
        }),
      );

      const aquariums = response.data.data || response.data.aquariums || [];
      return aquariums.length === 0;
    } catch (error) {
      // If we can't check, assume they need onboarding
      return true;
    }
  }
}