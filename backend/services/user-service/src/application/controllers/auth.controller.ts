import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Headers,
  Ip,
  Redirect,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { UserService } from '../../domain/services/user.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
  ResendVerificationDto,
  ValidateResetTokenDto,
} from '../dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../domain/entities/user.entity';
import { AuthProvider } from '@verpa/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: User,
    @Body() body: { refreshToken?: string },
  ): Promise<void> {
    await this.authService.logout(user._id.toString(), body.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Reset email sent if user exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    await this.userService.initiatePasswordReset(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 204, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void> {
    await this.userService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    const isValid = await this.userService.validateResetToken(dto.token);
    return {
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Invalid or expired token',
    };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.userService.verifyEmail(verifyEmailDto.token);
    return {
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 204, description: 'Verification email sent if user exists and not verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto): Promise<void> {
    await this.userService.resendVerificationEmail(resendVerificationDto.email);
  }

  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check email verification status' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@CurrentUser() user: User) {
    const currentUser = await this.userService.findById(user._id.toString());
    return {
      emailVerified: currentUser.emailVerified,
      email: currentUser.email,
      requiresVerification: !currentUser.emailVerified,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user retrieved' })
  async getCurrentUser(@CurrentUser() user: User) {
    return this.userService.findById(user._id.toString());
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async validateToken(@Body() body: { token: string }) {
    const payload = await this.authService.validateToken(body.token);
    return {
      valid: true,
      payload,
    };
  }

  // OAuth endpoints
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @Redirect()
  async googleAuthCallback(@Request() req: any) {
    const { user, accessToken, refreshToken } = req.user;
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`,
    };
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Login with Apple' })
  async appleAuth() {
    // Guard redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleAuthCallback(@Request() req: any) {
    return req.user;
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Login with Facebook' })
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @Redirect()
  async facebookAuthCallback(@Request() req: any) {
    const { user, accessToken, refreshToken } = req.user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`,
    };
  }

  // Link/unlink OAuth providers
  @Post('link/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link OAuth provider to account' })
  @ApiParam({ name: 'provider', enum: AuthProvider })
  @ApiResponse({ status: 200, description: 'Provider linked successfully' })
  async linkProvider(
    @CurrentUser() user: User,
    @Param('provider') provider: AuthProvider,
  ) {
    // This would redirect to OAuth provider
    // In real implementation, you'd generate state and redirect
    return {
      message: `Redirect to ${provider} for linking`,
      redirectUrl: `/auth/${provider}?link=true&userId=${user._id}`,
    };
  }

  @Delete('link/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  @ApiParam({ name: 'provider', enum: AuthProvider })
  @ApiResponse({ status: 200, description: 'Provider unlinked successfully' })
  async unlinkProvider(
    @CurrentUser() user: User,
    @Param('provider') provider: AuthProvider,
  ) {
    const updatedUser = await this.userService.unlinkAuthProvider(
      user._id.toString(),
      provider,
    );
    return {
      message: 'Provider unlinked successfully',
      user: updatedUser,
    };
  }

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked OAuth providers' })
  async getLinkedProviders(@CurrentUser() user: User) {
    const currentUser = await this.userService.findById(user._id.toString());
    return {
      providers: currentUser.authProviders.map((ap) => ({
        provider: ap.provider,
        email: ap.email,
        linkedAt: ap.linkedAt,
      })),
    };
  }
}