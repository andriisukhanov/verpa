import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, SubscriptionType, IsStrongPassword, IsValidUsername, Trim, Lowercase, SanitizeInput } from '@verpa/common';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase())
  @Trim()
  email: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsValidUsername()
  @MinLength(3)
  @MaxLength(30)
  @Trim()
  @Lowercase()
  username: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  lastName: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.USER;

  @ApiProperty({ enum: SubscriptionType, default: SubscriptionType.FREE })
  @IsOptional()
  @IsEnum(SubscriptionType)
  subscriptionType?: SubscriptionType = SubscriptionType.FREE;

  @ApiProperty({ example: 'America/New_York', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiProperty({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string = 'en';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean = true;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean = true;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean = false;
}