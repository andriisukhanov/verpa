import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { Lowercase, Trim } from '../../decorators';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @Lowercase()
  email: string;
}