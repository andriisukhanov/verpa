import { IsBoolean, IsOptional, IsString, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  eventReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}

export class PrivacyPreferencesDto {
  @IsOptional()
  @IsIn(['public', 'private', 'friends'])
  profileVisibility?: 'public' | 'private' | 'friends';

  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
}

export class DisplayPreferencesDto {
  @IsOptional()
  @IsIn(['light', 'dark', 'auto'])
  theme?: 'light' | 'dark' | 'auto';

  @IsOptional()
  @IsIn(['celsius', 'fahrenheit'])
  temperatureUnit?: 'celsius' | 'fahrenheit';

  @IsOptional()
  @IsIn(['liters', 'gallons'])
  volumeUnit?: 'liters' | 'gallons';

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsIn(['12h', '24h'])
  timeFormat?: '12h' | '24h';
}

export class UpdateUserPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPreferencesDto)
  privacy?: PrivacyPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DisplayPreferencesDto)
  display?: DisplayPreferencesDto;
}