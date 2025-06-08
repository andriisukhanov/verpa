import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, NotificationType } from '@verpa/common';

export class RecurrencePatternDto {
  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Frequency of recurrence',
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiPropertyOptional({
    description: 'Interval between occurrences',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Days of week for weekly recurrence (0-6, Sunday-Saturday)',
    example: [1, 3, 5],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of month for monthly recurrence (1-31)',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Month of year for yearly recurrence (1-12)',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  monthOfYear?: number;
}

export class CreateReminderDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Minutes before event to send reminder',
    example: 60,
    minimum: 5,
  })
  @IsNumber()
  @Min(5)
  timeBefore: number;
}

export class CreateEventDto {
  @ApiProperty({
    enum: EventType,
    description: 'Type of event',
  })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({
    description: 'Event title',
    example: 'Weekly Water Change',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Change 25% of water and clean filter',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-01T10:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 30,
    minimum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Whether event is recurring',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern for recurring events',
    type: RecurrencePatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern?: RecurrencePatternDto;

  @ApiPropertyOptional({
    description: 'End date for recurring events',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Event reminders',
    type: [CreateReminderDto],
    maxItems: 5,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReminderDto)
  @ArrayMaxSize(5)
  reminders?: CreateReminderDto[];

  @ApiPropertyOptional({
    description: 'Event notes',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}