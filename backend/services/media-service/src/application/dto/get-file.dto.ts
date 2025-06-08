import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFileDto {
  @ApiProperty()
  @IsString()
  fileId: string;
}

export class GetSignedUrlDto {
  @ApiProperty()
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Expiry time in seconds', default: 3600 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(60)
  @Max(86400) // Max 24 hours
  expiresIn?: number;
}

export class ListFilesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class FileInfo {
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
  thumbnails?: Record<string, string>;

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SignedUrlResponse {
  @ApiProperty()
  url: string;

  @ApiProperty()
  expiresAt: Date;
}