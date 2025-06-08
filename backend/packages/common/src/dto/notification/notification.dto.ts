import { Expose, Type } from 'class-transformer';
import { IsString, IsEnum, IsBoolean, IsOptional, IsDate, IsArray, IsObject } from 'class-validator';
import { NotificationType, NotificationPriority } from '../../enums';
import { INotification } from '../../interfaces';

export class NotificationDto implements Partial<INotification> {
  @Expose()
  @IsString()
  _id: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsEnum(NotificationType)
  type: NotificationType;

  @Expose()
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsString()
  body: string;

  @Expose()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @Expose()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  channels: NotificationType[];

  @Expose()
  @IsBoolean()
  read: boolean;

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  readAt?: Date;

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sentAt?: Date;

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledFor?: Date;

  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}