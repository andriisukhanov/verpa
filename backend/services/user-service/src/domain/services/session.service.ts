import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService, LogAsync } from '@verpa/logging';
import * as UAParser from 'ua-parser-js';
import { ISessionRepository } from '../repositories/session.repository.interface';
import { Session, DeviceInfo } from '../entities/session.entity';
import { Types } from 'mongoose';

export interface CreateSessionDto {
  userId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiresIn: number; // seconds
}

export interface SessionInfo {
  id: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
  };
  lastActive: Date;
  createdAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class SessionService {
  private readonly maxSessionsPerUser: number;

  constructor(
    @Inject('ISessionRepository') private readonly sessionRepository: ISessionRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SessionService');
    this.maxSessionsPerUser = this.configService.get<number>('auth.maxSessionsPerUser', 5);
  }

  @LogAsync({ message: 'Creating new session', level: 'info' })
  async createSession(dto: CreateSessionDto): Promise<Session> {
    // Parse user agent
    const deviceInfo = this.parseUserAgent(dto.userAgent);

    // Check session limit
    const activeCount = await this.sessionRepository.countActiveForUser(dto.userId);
    if (activeCount >= this.maxSessionsPerUser) {
      // Invalidate oldest sessions
      await this.sessionRepository.invalidateOldestForUser(
        dto.userId,
        this.maxSessionsPerUser - 1
      );
    }

    // Create session
    const session = await this.sessionRepository.create({
      userId: new Types.ObjectId(dto.userId),
      refreshToken: dto.refreshToken,
      deviceInfo,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      expiresAt: new Date(Date.now() + dto.expiresIn * 1000),
      isActive: true,
    });

    this.logger.info('Session created', {
      sessionId: session._id.toString(),
      userId: dto.userId,
      deviceType: deviceInfo.type,
    });

    // Emit event
    this.eventEmitter.emit('session.created', {
      sessionId: session._id.toString(),
      userId: dto.userId,
      deviceInfo,
      ipAddress: dto.ipAddress,
    });

    return session;
  }

  async getSession(refreshToken: string): Promise<Session | null> {
    const session = await this.sessionRepository.findByRefreshToken(refreshToken);
    
    if (!session) {
      return null;
    }

    if (session.isExpired()) {
      await this.sessionRepository.invalidate(session._id.toString());
      return null;
    }

    // Update activity
    await this.sessionRepository.updateActivity(refreshToken);
    
    return session;
  }

  async getUserSessions(userId: string, currentRefreshToken?: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionRepository.findByUserId(userId);
    
    return sessions.map(session => ({
      id: session._id.toString(),
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      isCurrent: session.refreshToken === currentRefreshToken,
    }));
  }

  @LogAsync({ message: 'Invalidating session', level: 'info' })
  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.userId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized to manage this session');
    }

    await this.sessionRepository.invalidate(sessionId);

    // Emit event
    this.eventEmitter.emit('session.invalidated', {
      sessionId,
      userId,
    });
  }

  async invalidateSessionByToken(refreshToken: string): Promise<void> {
    await this.sessionRepository.invalidateByRefreshToken(refreshToken);
  }

  async invalidateAllSessions(userId: string, exceptToken?: string): Promise<void> {
    if (exceptToken) {
      const sessions = await this.sessionRepository.findByUserId(userId);
      const sessionsToInvalidate = sessions.filter(s => s.refreshToken !== exceptToken);
      
      for (const session of sessionsToInvalidate) {
        await this.sessionRepository.invalidate(session._id.toString());
      }
    } else {
      await this.sessionRepository.invalidateAllForUser(userId);
    }

    // Emit event
    this.eventEmitter.emit('session.all_invalidated', {
      userId,
      exceptCurrent: !!exceptToken,
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const deletedCount = await this.sessionRepository.deleteExpired();
    
    if (deletedCount > 0) {
      this.logger.info('Expired sessions cleaned up', { count: deletedCount });
    }
    
    return deletedCount;
  }

  private parseUserAgent(userAgent: string): DeviceInfo {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let type: DeviceInfo['type'] = 'unknown';
    if (result.device.type === 'mobile') {
      type = 'mobile';
    } else if (result.device.type === 'tablet') {
      type = 'tablet';
    } else if (result.device.type === 'desktop' || !result.device.type) {
      type = 'desktop';
    }

    return {
      type,
      browser: result.browser.name,
      os: result.os.name,
      version: result.browser.version,
    };
  }
}