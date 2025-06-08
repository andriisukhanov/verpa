import { IsString, IsEnum, IsOptional, IsDate, IsArray, IsObject, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority } from '../../enums';
import { IsValidObjectId, Trim, ToDate } from '../../decorators';

export class CreateNotificationDto {
  @IsString()
  @IsValidObjectId()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType = NotificationType.IN_APP;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority = NotificationPriority.MEDIUM;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Trim()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsArray()
  @IsEnum(NotificationType, { each: true })
  channels: NotificationType[] = [NotificationType.IN_APP];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  expiresAt?: Date;
}