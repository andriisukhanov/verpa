import { IsNumber, IsOptional, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ToDate } from '../../decorators';

export class WaterParametersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ammonia?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrite?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phosphate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  salinity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tds?: number;

  @IsDate()
  @Type(() => Date)
  @ToDate()
  lastUpdated: Date = new Date();
}

export class UpdateWaterParametersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  ph?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ammonia?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrite?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nitrate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phosphate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  salinity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tds?: number;
}