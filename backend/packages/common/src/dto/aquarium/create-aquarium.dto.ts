import { IsString, IsEnum, IsNumber, IsOptional, IsDate, IsIn, ValidateNested, MinLength, MaxLength, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { WaterType } from '../../enums';
import { Trim, SanitizeInput, ToDate } from '../../decorators';
import { AquariumDimensionsDto } from './aquarium.dto';

export class CreateAquariumDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  @SanitizeInput()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  description?: string;

  @IsEnum(WaterType)
  waterType: WaterType;

  @IsNumber()
  @Min(1)
  volume: number;

  @IsIn(['liters', 'gallons'])
  volumeUnit: 'liters' | 'gallons' = 'liters';

  @IsOptional()
  @ValidateNested()
  @Type(() => AquariumDimensionsDto)
  dimensions?: AquariumDimensionsDto;

  @IsDate()
  @Type(() => Date)
  @ToDate()
  setupDate: Date;

  @IsOptional()
  @IsString()
  @IsUrl()
  mainPhoto?: string;
}