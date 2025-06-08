import { IsEmail, IsNotEmpty, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Lowercase, Trim } from '../../decorators';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @Lowercase()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  rememberMe?: boolean = false;
}

export class OAuthLoginDto {
  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'apple' | 'facebook';

  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}