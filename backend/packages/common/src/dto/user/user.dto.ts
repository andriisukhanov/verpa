import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsEmail, IsEnum, IsBoolean, IsOptional, IsDate, IsArray } from 'class-validator';
import { UserRole, SubscriptionType, AuthProvider } from '../../enums';
import { IUser, IAuthProvider } from '../../interfaces';

export class AuthProviderDto implements IAuthProvider {
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @IsString()
  providerId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsDate()
  @Type(() => Date)
  linkedAt: Date;
}

export class UserDto implements Partial<IUser> {
  @Expose()
  @IsString()
  _id: string;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  username: string;

  @Expose()
  @IsOptional()
  @IsString()
  firstName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  lastName?: string;

  @Expose()
  @IsEnum(UserRole)
  role: UserRole;

  @Expose()
  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @Expose()
  @IsBoolean()
  emailVerified: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Expose()
  @IsBoolean()
  phoneVerified: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @Expose()
  @IsString()
  timezone: string;

  @Expose()
  @IsString()
  language: string;

  @Expose()
  @IsArray()
  @Type(() => AuthProviderDto)
  authProviders: AuthProviderDto[];

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastLoginAt?: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @Exclude()
  password?: string;

  @Exclude()
  deletedAt?: Date;

  @Expose()
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.username;
  }
}