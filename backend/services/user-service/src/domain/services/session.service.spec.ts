import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '@verpa/logging';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SessionService } from './session.service';
import { ISessionRepository } from '../repositories/session.repository.interface';
import { Session } from '../entities/session.entity';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<ISessionRepository>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let logger: jest.Mocked<LoggerService>;

  const mockSession: Session = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    refreshToken: 'test-refresh-token',
    deviceInfo: {
      type: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      version: '119.0.0.0',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0',
    lastActive: new Date(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    isExpired: jest.fn().mockReturnValue(false),
    updateActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: 'ISessionRepository',
          useValue: {
            create: jest.fn(),
            findByRefreshToken: jest.fn(),
            findByUserId: jest.fn(),
            findById: jest.fn(),
            invalidate: jest.fn(),
            invalidateByRefreshToken: jest.fn(),
            invalidateAllForUser: jest.fn(),
            invalidateOldestForUser: jest.fn(),
            updateActivity: jest.fn(),
            deleteExpired: jest.fn(),
            countActiveForUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(5),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get('ISessionRepository');
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
    logger = module.get(LoggerService);
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      sessionRepository.countActiveForUser.mockResolvedValue(2);
      sessionRepository.create.mockResolvedValue(mockSession);

      const dto = {
        userId: '123',
        refreshToken: 'test-token',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0',
        expiresIn: 604800,
      };

      const result = await service.createSession(dto);

      expect(result).toEqual(mockSession);
      expect(sessionRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('session.created', expect.any(Object));
    });

    it('should invalidate oldest sessions when limit is reached', async () => {
      sessionRepository.countActiveForUser.mockResolvedValue(5);
      sessionRepository.create.mockResolvedValue(mockSession);

      const dto = {
        userId: '123',
        refreshToken: 'test-token',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        expiresIn: 604800,
      };

      await service.createSession(dto);

      expect(sessionRepository.invalidateOldestForUser).toHaveBeenCalledWith('123', 4);
    });
  });

  describe('getSession', () => {
    it('should return session if valid', async () => {
      sessionRepository.findByRefreshToken.mockResolvedValue(mockSession);

      const result = await service.getSession('test-refresh-token');

      expect(result).toEqual(mockSession);
      expect(sessionRepository.updateActivity).toHaveBeenCalledWith('test-refresh-token');
    });

    it('should return null if session not found', async () => {
      sessionRepository.findByRefreshToken.mockResolvedValue(null);

      const result = await service.getSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should invalidate and return null if session is expired', async () => {
      const expiredSession = {
        ...mockSession,
        isExpired: jest.fn().mockReturnValue(true),
      };
      sessionRepository.findByRefreshToken.mockResolvedValue(expiredSession);

      const result = await service.getSession('expired-token');

      expect(result).toBeNull();
      expect(sessionRepository.invalidate).toHaveBeenCalledWith(expiredSession._id.toString());
    });
  });

  describe('getUserSessions', () => {
    it('should return formatted user sessions', async () => {
      sessionRepository.findByUserId.mockResolvedValue([mockSession]);

      const result = await service.getUserSessions('123', 'test-refresh-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockSession._id.toString(),
        deviceInfo: mockSession.deviceInfo,
        ipAddress: mockSession.ipAddress,
        lastActive: mockSession.lastActive,
        createdAt: mockSession.createdAt,
        isCurrent: true,
      });
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session if authorized', async () => {
      sessionRepository.findById.mockResolvedValue(mockSession);

      await service.invalidateSession(mockSession._id.toString(), mockSession.userId.toString());

      expect(sessionRepository.invalidate).toHaveBeenCalledWith(mockSession._id.toString());
      expect(eventEmitter.emit).toHaveBeenCalledWith('session.invalidated', expect.any(Object));
    });

    it('should throw if session not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      await expect(
        service.invalidateSession('invalid-id', '123')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user is not authorized', async () => {
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(
        service.invalidateSession(mockSession._id.toString(), 'different-user-id')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      sessionRepository.deleteExpired.mockResolvedValue(10);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(10);
      expect(logger.info).toHaveBeenCalledWith('Expired sessions cleaned up', { count: 10 });
    });
  });
});