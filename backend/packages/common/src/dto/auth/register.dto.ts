import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword, IsValidUsername, IsTimezone, Lowercase, Trim, SanitizeInput } from '../../decorators';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @Lowercase()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsValidUsername()
  @Trim()
  @Lowercase()
  username: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Trim()
  @SanitizeInput()
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsTimezone()
  timezone?: string = 'UTC';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string = 'en';
}