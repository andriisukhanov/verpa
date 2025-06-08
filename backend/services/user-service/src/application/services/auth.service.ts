import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserService } from '../../domain/services/user.service';
import { SessionService } from '../../domain/services/session.service';
import { User } from '../../domain/entities/user.entity';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { CryptoUtils } from '@verpa/common';
import { UserEvents } from '../events/user.events';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const user = await this.userService.create(registerDto);
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.userService.validateUser(
      loginDto.emailOrUsername,
      loginDto.password,
    );

    if (!user) {
      this.eventEmitter.emit(UserEvents.LOGIN_FAILED, {
        emailOrUsername: loginDto.emailOrUsername,
        ip,
        reason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Update last login
    await this.userService.updateLastLogin(user._id.toString(), ip);

    // Generate tokens
    const authResponse = await this.generateTokens(user, ip, userAgent);

    // Emit success event
    this.eventEmitter.emit(UserEvents.LOGIN_SUCCESS, {
      userId: user._id.toString(),
      email: user.email,
      ip,
      userAgent,
    });

    return authResponse;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });

      const user = await this.userService.findById(payload.sub);

      // Validate session
      const session = await this.sessionService.getSession(refreshTokenDto.refreshToken);
      if (!session || session.userId.toString() !== user._id.toString()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Invalidate old session
      await this.sessionService.invalidateSessionByToken(refreshTokenDto.refreshToken);

      // Generate new tokens with same device info
      const authResponse = await this.generateTokens(
        user,
        session.ipAddress,
        session.userAgent,
      );

      return authResponse;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.sessionService.invalidateSessionByToken(refreshToken);
    } else {
      await this.sessionService.invalidateAllSessions(userId);
    }

    this.eventEmitter.emit(UserEvents.LOGOUT, { userId });
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async generateTokensForUser(user: User, ip?: string, userAgent?: string): Promise<AuthResponse> {
    return this.generateTokens(user, ip, userAgent);
  }

  private async generateTokens(user: User, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('auth.jwt.refreshTokenExpiry'),
    });

    // Create session if ip and userAgent are provided
    if (ip && userAgent) {
      const refreshExpiresIn = this.configService.get<number>('auth.jwt.refreshTokenExpirySeconds', 7 * 24 * 60 * 60);
      await this.sessionService.createSession({
        userId: user._id.toString(),
        refreshToken,
        ipAddress: ip,
        userAgent,
        expiresIn: refreshExpiresIn,
      });
    } else {
      // Fallback to old token storage for OAuth or other cases
      await this.userRepository.addRefreshToken(user._id.toString(), refreshToken);
    }

    // Calculate expiry in seconds
    const expiresIn = this.getTokenExpiryInSeconds(
      this.configService.get<string>('auth.jwt.accessTokenExpiry', '15m'),
    );

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private getTokenExpiryInSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // 15 minutes default
    }
  }
}