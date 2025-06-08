import { IsBoolean, IsOptional, ValidateNested, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class EventTypePreferencesDto {
  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  updates?: boolean;

  @IsOptional()
  @IsBoolean()
  alerts?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class QuietHoursDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  start: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  end: string;

  @IsString()
  timezone: string;
}

export class ChannelPreferenceDto {
  @IsBoolean()
  enabled: boolean;

  @ValidateNested()
  @Type(() => EventTypePreferencesDto)
  eventTypes: EventTypePreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferenceDto)
  email?: ChannelPreferenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferenceDto)
  push?: ChannelPreferenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferenceDto)
  sms?: ChannelPreferenceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferenceDto)
  inApp?: ChannelPreferenceDto;
}