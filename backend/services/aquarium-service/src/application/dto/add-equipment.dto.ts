import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString, ValidateNested, MaxLength, MinLength, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentType } from '@verpa/common';

export class AddEquipmentDto {
  @ApiProperty({ description: 'Equipment name', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Equipment type', enum: EquipmentType })
  @IsEnum(EquipmentType)
  type: EquipmentType;

  @ApiPropertyOptional({ description: 'Equipment brand', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Equipment model', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Purchase date', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Installation date', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  installDate?: string;

  @ApiPropertyOptional({ description: 'Notes about the equipment', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Equipment specifications', type: Object })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
}