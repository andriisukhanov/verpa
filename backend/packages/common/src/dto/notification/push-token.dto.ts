import { IsString, IsIn, IsOptional } from 'class-validator';
import { Trim } from '../../decorators';

export class RegisterPushTokenDto {
  @IsString()
  @Trim()
  token: string;

  @IsIn(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UnregisterPushTokenDto {
  @IsString()
  @Trim()
  token: string;
}