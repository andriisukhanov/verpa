import { IsString, IsEnum, IsNumber, IsOptional, IsDate, IsIn, ValidateNested, MinLength, MaxLength, Min, IsUrl, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { WaterType } from '../../enums';
import { Trim, SanitizeInput, ToDate } from '../../decorators';
import { AquariumDimensionsDto } from './aquarium.dto';

export class UpdateAquariumDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  @SanitizeInput()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  description?: string;

  @IsOptional()
  @IsEnum(WaterType)
  waterType?: WaterType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  volume?: number;

  @IsOptional()
  @IsIn(['liters', 'gallons'])
  volumeUnit?: 'liters' | 'gallons';

  @IsOptional()
  @ValidateNested()
  @Type(() => AquariumDimensionsDto)
  dimensions?: AquariumDimensionsDto;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  setupDate?: Date;

  @IsOptional()
  @IsString()
  @IsUrl()
  mainPhoto?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}