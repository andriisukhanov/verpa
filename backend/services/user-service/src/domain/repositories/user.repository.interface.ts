import { User } from '../entities/user.entity';
import { FilterQuery } from 'mongoose';

export interface IUserRepository {
  create(userData: Partial<User>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailOrUsername(emailOrUsername: string): Promise<User | null>;
  findByAuthProvider(provider: string, providerId: string): Promise<User | null>;
  findAll(filter?: FilterQuery<User>, options?: any): Promise<User[]>;
  findPaginated(
    filter?: FilterQuery<User>,
    page?: number,
    limit?: number,
    sort?: any
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  update(id: string, updateData: Partial<User>): Promise<User | null>;
  updateByEmail(email: string, updateData: Partial<User>): Promise<User | null>;
  updateMany(filter: FilterQuery<User>, updateData: any): Promise<{ modifiedCount: number }>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  count(filter?: FilterQuery<User>): Promise<number>;
  exists(filter: FilterQuery<User>): Promise<boolean>;
  incrementLoginAttempts(userId: string): Promise<User | null>;
  resetLoginAttempts(userId: string): Promise<User | null>;
  lockAccount(userId: string, until: Date): Promise<User | null>;
  unlockAccount(userId: string): Promise<User | null>;
  addRefreshToken(userId: string, token: string): Promise<User | null>;
  removeRefreshToken(userId: string, token: string): Promise<User | null>;
  removeAllRefreshTokens(userId: string): Promise<User | null>;
  updateLastLogin(userId: string, ip?: string): Promise<User | null>;
  verifyEmail(userId: string): Promise<User | null>;
  verifyPhone(userId: string): Promise<User | null>;
}