import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService, LoginDto, RegisterDto, AuthResponse } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mobile user login' })
  @ApiHeader({ name: 'X-Device-Id', description: 'Unique device identifier', required: false })
  @ApiHeader({ name: 'X-Platform', description: 'Platform (ios/android)', required: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatar: { type: 'string' },
            emailVerified: { type: 'boolean' },
            subscriptionType: { type: 'string' },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
          },
        },
        requiresOnboarding: { type: 'boolean' },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-platform') platform?: string,
    @Headers('x-device-model') model?: string,
    @Headers('x-app-version') version?: string,
  ): Promise<AuthResponse> {
    const enrichedLoginDto = {
      ...loginDto,
      deviceId,
      deviceInfo: platform ? {
        platform: platform as 'ios' | 'android',
        version: version || 'unknown',
        model: model || 'unknown',
      } : undefined,
    };

    return this.authService.login(enrichedLoginDto);
  }

  @Post('register')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiHeader({ name: 'X-Device-Id', description: 'Unique device identifier', required: false })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Body() body: { refreshToken: string },
    @Headers('x-device-id') deviceId?: string,
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(body.refreshToken, deviceId);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiHeader({ name: 'X-Device-Id', description: 'Unique device identifier', required: false })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @Body() body: { userId: string; refreshToken?: string },
    @Headers('x-device-id') deviceId?: string,
  ): Promise<void> {
    await this.authService.logout(body.userId, body.refreshToken, deviceId);
  }

  @Post('verify-email')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() body: { token: string }): Promise<{ message: string }> {
    await this.authService.verifyEmail(body.token);
    return { message: 'Email verified successfully' };
  }

  @Post('forgot-password')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Reset email sent if user exists' })
  async forgotPassword(@Body() body: { email: string }): Promise<void> {
    await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password reset successfully' };
  }
}