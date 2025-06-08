import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsArray, Min, Max, MaxLength, MinLength } from 'class-validator';
import { InhabitantType } from '@verpa/common';

export class AddInhabitantDto {
  @ApiProperty({ description: 'Common name', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Inhabitant type', enum: InhabitantType })
  @IsEnum(InhabitantType)
  type: InhabitantType;

  @ApiProperty({ description: 'Species name', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  species: string;

  @ApiPropertyOptional({ description: 'Scientific name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  scientificName?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiProperty({ description: 'Size category', enum: ['small', 'medium', 'large'] })
  @IsEnum(['small', 'medium', 'large'])
  size: 'small' | 'medium' | 'large';

  @ApiProperty({ description: 'Minimum temperature (°C)', minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  temperatureMin: number;

  @ApiProperty({ description: 'Maximum temperature (°C)', minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  temperatureMax: number;

  @ApiProperty({ description: 'Minimum pH', minimum: 0, maximum: 14 })
  @IsNumber()
  @Min(0)
  @Max(14)
  phMin: number;

  @ApiProperty({ description: 'Maximum pH', minimum: 0, maximum: 14 })
  @IsNumber()
  @Min(0)
  @Max(14)
  phMax: number;

  @ApiProperty({ description: 'Care level', enum: ['easy', 'moderate', 'difficult'] })
  @IsEnum(['easy', 'moderate', 'difficult'])
  careLevel: 'easy' | 'moderate' | 'difficult';

  @ApiPropertyOptional({ description: 'Diet information', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  diet?: string;

  @ApiPropertyOptional({ description: 'Compatible species', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  compatibility?: string[];

  @ApiPropertyOptional({ description: 'Notes about the inhabitant', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Image URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}