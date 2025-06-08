import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum FileCategory {
  AQUARIUM_PHOTO = 'aquarium_photo',
  FISH_PHOTO = 'fish_photo',
  AVATAR = 'avatar',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum FileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: FileVisibility })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility = FileVisibility.PRIVATE;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Related entity ID (e.g., aquarium ID)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Related entity type (e.g., aquarium, user)' })
  @IsOptional()
  @IsString()
  entityType?: string;
}

export class FileUploadedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty()
  createdAt: Date;
}