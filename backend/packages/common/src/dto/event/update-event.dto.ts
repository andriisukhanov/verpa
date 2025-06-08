import { IsOptional, IsDate, IsString, IsEnum, ValidateNested, IsObject, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../../enums';
import { Trim, SanitizeInput, ToDate } from '../../decorators';
import { RecurringPatternDto, EventReminderDto } from './event.dto';

export class UpdateEventDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Trim()
  @SanitizeInput()
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  @SanitizeInput()
  description?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringPatternDto)
  recurringPattern?: RecurringPatternDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventReminderDto)
  reminder?: EventReminderDto;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  completedAt?: Date;
}