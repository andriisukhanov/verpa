import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, SubscriptionType, IsValidUsername, IsValidPhone, Trim, Lowercase, SanitizeInput } from '@verpa/common';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase())
  @Trim()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsValidUsername()
  @MinLength(3)
  @MaxLength(30)
  @Trim()
  @Lowercase()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsValidPhone()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserSubscriptionDto {
  @ApiProperty({ enum: SubscriptionType })
  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  subscription?: {
    planId: string;
    status: 'active' | 'cancelled' | 'expired';
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
}