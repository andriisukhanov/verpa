import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus, NotificationType } from '@verpa/common';

export class ReminderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  timeBefore: number;

  @ApiProperty()
  sent: boolean;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  readableTimeBefore: string;
}

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  aquariumId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: EventType })
  type: EventType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  scheduledDate: Date;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  recurring: boolean;

  @ApiPropertyOptional()
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };

  @ApiPropertyOptional()
  recurrenceEndDate?: Date;

  @ApiProperty({ type: [ReminderResponseDto] })
  reminders: ReminderResponseDto[];

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  completedBy?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isOverdue: boolean;

  @ApiProperty()
  isDue: boolean;

  @ApiPropertyOptional()
  nextOccurrence?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}