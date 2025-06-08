import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '@verpa/logging';
import { ISessionRepository } from '../../domain/repositories/session.repository.interface';
import { Session } from '../../domain/entities/session.entity';
import { SessionDocument, SessionModel } from '../schemas/session.schema';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectModel(SessionModel.name) private sessionModel: Model<SessionDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SessionRepository');
  }

  async create(session: Partial<Session>): Promise<Session> {
    const createdSession = new this.sessionModel(session);
    const savedSession = await createdSession.save();
    return this.toEntity(savedSession);
  }

  async findById(id: string): Promise<Session | null> {
    const session = await this.sessionModel.findById(id).exec();
    return session ? this.toEntity(session) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const session = await this.sessionModel
      .findOne({ refreshToken, isActive: true })
      .exec();
    return session ? this.toEntity(session) : null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const sessions = await this.sessionModel
      .find({ 
        userId: new Types.ObjectId(userId), 
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
      .sort({ lastActive: -1 })
      .exec();
    return sessions.map(session => this.toEntity(session));
  }

  async update(id: string, updates: Partial<Session>): Promise<Session | null> {
    const updated = await this.sessionModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
    return updated ? this.toEntity(updated) : null;
  }

  async updateActivity(refreshToken: string): Promise<void> {
    await this.sessionModel
      .updateOne(
        { refreshToken, isActive: true },
        { $set: { lastActive: new Date() } }
      )
      .exec();
  }

  async invalidate(id: string): Promise<void> {
    await this.sessionModel
      .updateOne({ _id: id }, { $set: { isActive: false } })
      .exec();
    
    this.logger.info('Session invalidated', { sessionId: id });
  }

  async invalidateByRefreshToken(refreshToken: string): Promise<void> {
    const result = await this.sessionModel
      .updateOne(
        { refreshToken },
        { $set: { isActive: false } }
      )
      .exec();
    
    if (result.modifiedCount > 0) {
      this.logger.info('Session invalidated by refresh token');
    }
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    const result = await this.sessionModel
      .updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isActive: false } }
      )
      .exec();
    
    this.logger.info('All sessions invalidated for user', {
      userId,
      count: result.modifiedCount,
    });
  }

  async invalidateOldestForUser(userId: string, keepCount: number): Promise<void> {
    const sessions = await this.sessionModel
      .find({ 
        userId: new Types.ObjectId(userId), 
        isActive: true 
      })
      .sort({ lastActive: -1 })
      .exec();

    if (sessions.length > keepCount) {
      const sessionsToInvalidate = sessions.slice(keepCount);
      const sessionIds = sessionsToInvalidate.map(s => s._id);
      
      await this.sessionModel
        .updateMany(
          { _id: { $in: sessionIds } },
          { $set: { isActive: false } }
        )
        .exec();
      
      this.logger.info('Oldest sessions invalidated', {
        userId,
        invalidatedCount: sessionIds.length,
      });
    }
  }

  async deleteExpired(): Promise<number> {
    const result = await this.sessionModel
      .deleteMany({ expiresAt: { $lt: new Date() } })
      .exec();
    
    if (result.deletedCount > 0) {
      this.logger.info('Expired sessions deleted', {
        count: result.deletedCount,
      });
    }
    
    return result.deletedCount;
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.sessionModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
      .exec();
  }

  private toEntity(doc: SessionDocument): Session {
    return new Session({
      _id: doc._id,
      userId: doc.userId,
      refreshToken: doc.refreshToken,
      deviceInfo: doc.deviceInfo,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      location: doc.location,
      lastActive: doc.lastActive,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      isActive: doc.isActive,
    });
  }
}