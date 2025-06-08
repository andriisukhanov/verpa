import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User, UserDocument } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.userModel
      .findOne({
        $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
      })
      .exec();
  }

  async findByAuthProvider(provider: string, providerId: string): Promise<User | null> {
    return this.userModel
      .findOne({
        'authProviders.provider': provider,
        'authProviders.providerId': providerId,
      })
      .exec();
  }

  async findAll(filter: FilterQuery<User> = {}, options: any = {}): Promise<User[]> {
    const query = this.userModel.find(filter);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.skip) {
      query.skip(options.skip);
    }

    if (options.select) {
      query.select(options.select);
    }

    return query.exec();
  }

  async findPaginated(
    filter: FilterQuery<User> = {},
    page = 1,
    limit = 20,
    sort: any = { createdAt: -1 },
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async updateByEmail(email: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  async updateMany(filter: FilterQuery<User>, updateData: any): Promise<{ modifiedCount: number }> {
    const result = await this.userModel.updateMany(filter, updateData).exec();
    return { modifiedCount: result.modifiedCount };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.userModel
      .updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date() } })
      .exec();
    return result.modifiedCount > 0;
  }

  async restore(id: string): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        { _id: id },
        { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async count(filter: FilterQuery<User> = {}): Promise<number> {
    return this.userModel.countDocuments(filter);
  }

  async exists(filter: FilterQuery<User>): Promise<boolean> {
    const count = await this.userModel.countDocuments(filter).limit(1);
    return count > 0;
  }

  async incrementLoginAttempts(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $inc: { loginAttempts: 1 } },
        { new: true },
      )
      .exec();
  }

  async resetLoginAttempts(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } },
        { new: true },
      )
      .exec();
  }

  async lockAccount(userId: string, until: Date): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { lockUntil: until } },
        { new: true },
      )
      .exec();
  }

  async unlockAccount(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $unset: { lockUntil: 1 }, $set: { loginAttempts: 0 } },
        { new: true },
      )
      .exec();
  }

  async addRefreshToken(userId: string, token: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $push: { refreshTokens: token } },
        { new: true },
      )
      .exec();
  }

  async removeRefreshToken(userId: string, token: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $pull: { refreshTokens: token } },
        { new: true },
      )
      .exec();
  }

  async removeAllRefreshTokens(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { refreshTokens: [] } },
        { new: true },
      )
      .exec();
  }

  async updateLastLogin(userId: string, ip?: string): Promise<User | null> {
    const updateData: any = { lastLoginAt: new Date() };
    if (ip) {
      updateData.lastLoginIp = ip;
    }
    return this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .exec();
  }

  async verifyEmail(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: { emailVerified: true },
          $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
        },
        { new: true },
      )
      .exec();
  }

  async verifyPhone(userId: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: { phoneVerified: true },
          $unset: { phoneVerificationCode: 1, phoneVerificationExpires: 1 },
        },
        { new: true },
      )
      .exec();
  }
}