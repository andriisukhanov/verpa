import { IsOptional, IsString, MinLength, MaxLength, IsUrl } from 'class-validator';
import { IsValidPhone, IsTimezone, Trim, SanitizeInput } from '../../decorators';

export class UpdateUserDto {
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
  @IsValidPhone()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  @IsTimezone()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language?: string;
}