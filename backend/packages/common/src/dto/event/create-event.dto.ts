import { IsString, IsEnum, IsOptional, IsDate, IsBoolean, ValidateNested, IsObject, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../../enums';
import { IsValidObjectId, Trim, SanitizeInput, ToDate, IsFutureDate } from '../../decorators';
import { RecurringPatternDto, EventReminderDto } from './event.dto';

export class CreateEventDto {
  @IsString()
  @IsValidObjectId()
  aquariumId: string;

  @IsEnum(EventType)
  type: EventType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Trim()
  @SanitizeInput()
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  @SanitizeInput()
  description?: string;

  @IsDate()
  @Type(() => Date)
  @ToDate()
  @IsFutureDate()
  scheduledFor: Date;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean = false;

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
}