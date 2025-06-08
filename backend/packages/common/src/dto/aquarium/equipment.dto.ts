import { IsString, IsOptional, IsDate, IsIn, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidObjectId, Trim, SanitizeInput, ToDate } from '../../decorators';

export class EquipmentDto {
  @IsString()
  @IsValidObjectId()
  _id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  @SanitizeInput()
  name: string;

  @IsIn(['filter', 'heater', 'light', 'pump', 'co2', 'other'])
  type: 'filter' | 'heater' | 'light' | 'pump' | 'co2' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Trim()
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Trim()
  model?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  purchaseDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  warrantyExpiry?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  notes?: string;
}

export class CreateEquipmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  @SanitizeInput()
  name: string;

  @IsIn(['filter', 'heater', 'light', 'pump', 'co2', 'other'])
  type: 'filter' | 'heater' | 'light' | 'pump' | 'co2' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Trim()
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Trim()
  model?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  purchaseDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  warrantyExpiry?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  notes?: string;
}