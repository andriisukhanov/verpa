import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword, Lowercase, Trim, Match } from '../../decorators';

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @Lowercase()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @Match('newPassword')
  confirmPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @Match('newPassword')
  confirmPassword: string;
}