import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class TokenResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsNumber()
  @IsPositive()
  expiresIn: number;

  @IsString()
  tokenType: string = 'Bearer';
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}