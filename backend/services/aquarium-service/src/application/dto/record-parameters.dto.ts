import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsDateString, Min, Max, MaxLength } from 'class-validator';

export class RecordParametersDto {
  @ApiProperty({ description: 'Temperature in Celsius', minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  temperature: number;

  @ApiProperty({ description: 'pH level', minimum: 0, maximum: 14 })
  @IsNumber()
  @Min(0)
  @Max(14)
  ph: number;

  @ApiPropertyOptional({ description: 'Ammonia level (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ammonia?: number;

  @ApiPropertyOptional({ description: 'Nitrite level (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrite?: number;

  @ApiPropertyOptional({ description: 'Nitrate level (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrate?: number;

  @ApiPropertyOptional({ description: 'Phosphate level (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  phosphate?: number;

  @ApiPropertyOptional({ description: 'Carbonate hardness (dKH)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kh?: number;

  @ApiPropertyOptional({ description: 'General hardness (dGH)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gh?: number;

  @ApiPropertyOptional({ description: 'Calcium level (ppm) - for saltwater', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calcium?: number;

  @ApiPropertyOptional({ description: 'Magnesium level (ppm) - for saltwater', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  magnesium?: number;

  @ApiPropertyOptional({ description: 'Alkalinity (dKH) - for saltwater', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alkalinity?: number;

  @ApiPropertyOptional({ description: 'Salinity (ppt) - for saltwater', minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  salinity?: number;

  @ApiPropertyOptional({ description: 'Total dissolved solids (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional({ description: 'CO2 level (ppm)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  co2?: number;

  @ApiPropertyOptional({ description: 'Oxygen level (mg/L)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  oxygen?: number;

  @ApiPropertyOptional({ description: 'Recording date and time', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Notes about the measurement', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Last water change date', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  lastWaterChange?: string;

  @ApiPropertyOptional({ description: 'Water change percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  waterChangePercentage?: number;
}