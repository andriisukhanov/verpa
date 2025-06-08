import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Headers,
  Ip,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { RateLimit, RateLimitPerMinute, RateLimitPerHour } from '@verpa/rate-limiting';
import { ProxyService } from '../../services/proxy/proxy.service';
import { SkipApiKey } from '../../common/decorators/skip-api-key.decorator';

@ApiTags('auth')
@Controller('auth')
@SkipApiKey() // Auth endpoints are public
export class AuthController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('register')
  @RateLimitPerHour(5) // Only 5 registrations per hour per IP
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: any) {
    return this.proxyService.post('user-service', '/auth/register', registerDto);
  }

  @Post('login')
  @RateLimitPerMinute(10) // 10 login attempts per minute per IP
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.proxyService.post('user-service', '/auth/login', loginDto, {
      headers: {
        'x-forwarded-for': ip,
        'user-agent': userAgent,
      },
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshDto: any) {
    return this.proxyService.post('user-service', '/auth/refresh', refreshDto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Request() req: any, @Body() body: any) {
    return this.proxyService.post('user-service', '/auth/logout', body, {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Post('forgot-password')
  @RateLimitPerHour(3) // Only 3 password reset requests per hour per IP
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Reset email sent if user exists' })
  async forgotPassword(@Body() forgotPasswordDto: any) {
    return this.proxyService.post('user-service', '/auth/forgot-password', forgotPasswordDto);
  }

  @Post('reset-password')
  @RateLimitPerHour(5) // 5 reset attempts per hour per IP
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: any) {
    return this.proxyService.post('user-service', '/auth/reset-password', resetPasswordDto);
  }

  @Post('verify-email')
  @RateLimitPerHour(10) // 10 verification attempts per hour per IP
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: any) {
    return this.proxyService.post('user-service', '/auth/verify-email', verifyEmailDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user retrieved' })
  async getCurrentUser(@Request() req: any) {
    return this.proxyService.get('user-service', '/auth/me', {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  // OAuth endpoints
  @Get('google')
  @ApiOperation({ summary: 'Login with Google' })
  async googleAuth() {
    // This would redirect to user service
    return { redirectUrl: `${process.env.USER_SERVICE_URL}/auth/google` };
  }

  @Get('apple')
  @ApiOperation({ summary: 'Login with Apple' })
  async appleAuth() {
    return { redirectUrl: `${process.env.USER_SERVICE_URL}/auth/apple` };
  }

  @Get('facebook')
  @ApiOperation({ summary: 'Login with Facebook' })
  async facebookAuth() {
    return { redirectUrl: `${process.env.USER_SERVICE_URL}/auth/facebook` };
  }

  @Get('providers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked OAuth providers' })
  async getLinkedProviders(@Request() req: any) {
    return this.proxyService.get('user-service', '/auth/providers', {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Post('link/:provider')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link OAuth provider to account' })
  async linkProvider(@Param('provider') provider: string, @Request() req: any) {
    return this.proxyService.post('user-service', `/auth/link/${provider}`, {}, {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Delete('link/:provider')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  async unlinkProvider(@Param('provider') provider: string, @Request() req: any) {
    return this.proxyService.delete('user-service', `/auth/link/${provider}`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }
}