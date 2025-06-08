import { Session } from '../entities/session.entity';

export interface ISessionRepository {
  create(session: Partial<Session>): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByRefreshToken(refreshToken: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  update(id: string, updates: Partial<Session>): Promise<Session | null>;
  updateActivity(refreshToken: string): Promise<void>;
  invalidate(id: string): Promise<void>;
  invalidateByRefreshToken(refreshToken: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
  invalidateOldestForUser(userId: string, keepCount: number): Promise<void>;
  deleteExpired(): Promise<number>;
  countActiveForUser(userId: string): Promise<number>;
}