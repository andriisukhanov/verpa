import { Expose, Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsDate, IsBoolean, IsArray, ValidateNested, IsObject, IsNumber, IsIn, Min } from 'class-validator';
import { EventType } from '../../enums';
import { IEvent, IRecurringPattern, IEventReminder, IEventAttachment } from '../../interfaces';

export class RecurringPatternDto implements IRecurringPattern {
  @IsIn(['daily', 'weekly', 'biweekly', 'monthly', 'custom'])
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  dayOfMonth?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  occurrences?: number;
}

export class EventReminderDto implements IEventReminder {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  @Min(0)
  minutesBefore: number;

  @IsArray()
  @IsIn(['push', 'email', 'sms'], { each: true })
  notificationTypes: Array<'push' | 'email' | 'sms'>;
}

export class EventAttachmentDto implements IEventAttachment {
  @IsString()
  _id: string;

  @IsIn(['photo', 'document'])
  type: 'photo' | 'document';

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsString()
  filename: string;

  @IsNumber()
  @Min(0)
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsDate()
  @Type(() => Date)
  uploadedAt: Date;
}

export class EventDto implements Partial<IEvent> {
  @Expose()
  @IsString()
  _id: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsString()
  aquariumId: string;

  @Expose()
  @IsEnum(EventType)
  type: EventType;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsDate()
  @Type(() => Date)
  scheduledFor: Date;

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;

  @Expose()
  @IsBoolean()
  isRecurring: boolean;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringPatternDto)
  recurringPattern?: RecurringPatternDto;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => EventReminderDto)
  reminder?: EventReminderDto;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAttachmentDto)
  attachments: EventAttachmentDto[];

  @Expose()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @Expose()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @Expose()
  get isOverdue(): boolean {
    return !this.completedAt && this.scheduledFor < new Date();
  }

  @Expose()
  get status(): 'pending' | 'completed' | 'overdue' {
    if (this.completedAt) return 'completed';
    if (this.isOverdue) return 'overdue';
    return 'pending';
  }
}