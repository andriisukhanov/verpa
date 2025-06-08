import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { LoggerService } from '@verpa/logging';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../domain/entities/user.entity';
import { SessionService } from '../../domain/services/session.service';
import {
  GetSessionsResponseDto,
  InvalidateSessionDto,
  InvalidateAllSessionsDto,
} from '../dto/session.dto';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SessionController');
  }

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: [GetSessionsResponseDto],
  })
  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Current session refresh token to identify it',
    required: false,
  })
  async getSessions(
    @CurrentUser() user: User,
    @Headers('x-refresh-token') refreshToken?: string,
  ): Promise<GetSessionsResponseDto[]> {
    this.logger.info('Getting user sessions', { userId: user._id.toString() });
    return this.sessionService.getUserSessions(user._id.toString(), refreshToken);
  }

  @Post('invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate a specific session' })
  @ApiResponse({ status: 204, description: 'Session invalidated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid session ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized to manage this session' })
  async invalidateSession(
    @CurrentUser() user: User,
    @Body() dto: InvalidateSessionDto,
  ): Promise<void> {
    this.logger.info('Invalidating session', {
      userId: user._id.toString(),
      sessionId: dto.sessionId,
    });
    await this.sessionService.invalidateSession(dto.sessionId, user._id.toString());
  }

  @Post('invalidate-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate all sessions for the current user' })
  @ApiResponse({ status: 204, description: 'All sessions invalidated successfully' })
  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Current session refresh token to keep it active',
    required: false,
  })
  async invalidateAllSessions(
    @CurrentUser() user: User,
    @Body() dto: InvalidateAllSessionsDto,
    @Headers('x-refresh-token') refreshToken?: string,
  ): Promise<void> {
    this.logger.warn('Invalidating all user sessions', {
      userId: user._id.toString(),
      exceptCurrent: dto.exceptCurrent,
    });
    
    const tokenToKeep = dto.exceptCurrent ? refreshToken : undefined;
    await this.sessionService.invalidateAllSessions(user._id.toString(), tokenToKeep);
  }

  @Delete('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate the current session (logout from this device)' })
  @ApiResponse({ status: 204, description: 'Current session invalidated' })
  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Current session refresh token',
    required: true,
  })
  async invalidateCurrentSession(
    @CurrentUser() user: User,
    @Headers('x-refresh-token') refreshToken: string,
  ): Promise<void> {
    if (!refreshToken) {
      this.logger.warn('No refresh token provided for session invalidation', {
        userId: user._id.toString(),
      });
      return;
    }

    this.logger.info('Invalidating current session', {
      userId: user._id.toString(),
    });
    await this.sessionService.invalidateSessionByToken(refreshToken);
  }
}