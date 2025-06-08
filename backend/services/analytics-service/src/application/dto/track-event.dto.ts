import { IsString, IsObject, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ description: 'Type of event (e.g., viewed, clicked, created)' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Category of event (e.g., user, aquarium, system)' })
  @IsString()
  @IsNotEmpty()
  eventCategory: string;

  @ApiProperty({ description: 'Type of entity (e.g., aquarium, event, user)' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'ID of the entity' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ description: 'User ID who triggered the event' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Custom properties for the event' })
  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Event metadata (device, platform, etc)' })
  @IsObject()
  @IsOptional()
  metadata?: {
    sessionId?: string;
    deviceId?: string;
    platform?: string;
    version?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };
}