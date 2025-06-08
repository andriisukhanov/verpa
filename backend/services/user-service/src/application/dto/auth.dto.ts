import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';
import { IsStrongPassword, Trim, Lowercase } from '@verpa/common';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or username' })
  @IsString()
  @Trim()
  emailOrUsername: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @Trim()
  @Lowercase()
  email: string;

  @ApiProperty()
  @IsString()
  @Trim()
  username: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty()
  @IsString()
  @Trim()
  firstName: string;

  @ApiProperty()
  @IsString()
  @Trim()
  lastName: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @Trim()
  @Lowercase()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ResendVerificationDto {
  @ApiProperty()
  @IsEmail()
  @Trim()
  @Lowercase()
  email: string;
}

export class ValidateResetTokenDto {
  @ApiProperty()
  @IsString()
  token: string;
}