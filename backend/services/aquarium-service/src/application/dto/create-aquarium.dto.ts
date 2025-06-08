import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, Min, MaxLength, MinLength, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { WaterType } from '@verpa/common';

class DimensionsDto {
  @ApiProperty({ description: 'Length in cm', minimum: 1 })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: 'Width in cm', minimum: 1 })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Height in cm', minimum: 1 })
  @IsNumber()
  @Min(1)
  height: number;
}

export class CreateAquariumDto {
  @ApiProperty({ description: 'Aquarium name', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Aquarium description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Water type', enum: WaterType })
  @IsEnum(WaterType)
  waterType: WaterType;

  @ApiProperty({ description: 'Volume in liters', minimum: 1 })
  @IsNumber()
  @Min(1)
  volume: number;

  @ApiPropertyOptional({ description: 'Aquarium dimensions', type: DimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @ApiPropertyOptional({ description: 'Setup date', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  setupDate?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Make aquarium public', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}