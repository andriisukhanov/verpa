import { Expose, Type } from 'class-transformer';
import { IsString, IsEnum, IsNumber, IsOptional, IsDate, IsBoolean, IsArray, ValidateNested, IsIn } from 'class-validator';
import { WaterType } from '../../enums';
import { IAquarium } from '../../interfaces';
import { EquipmentDto } from './equipment.dto';
import { InhabitantDto } from './inhabitant.dto';
import { WaterParametersDto } from './water-parameters.dto';

export class AquariumDimensionsDto {
  @IsNumber()
  length: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsIn(['cm', 'inches'])
  unit: 'cm' | 'inches';
}

export class AquariumDto implements Partial<IAquarium> {
  @Expose()
  @IsString()
  _id: string;

  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsEnum(WaterType)
  waterType: WaterType;

  @Expose()
  @IsNumber()
  volume: number;

  @Expose()
  @IsIn(['liters', 'gallons'])
  volumeUnit: 'liters' | 'gallons';

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => AquariumDimensionsDto)
  dimensions?: AquariumDimensionsDto;

  @Expose()
  @IsDate()
  @Type(() => Date)
  setupDate: Date;

  @Expose()
  @IsOptional()
  @IsString()
  mainPhoto?: string;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentDto)
  equipment: EquipmentDto[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InhabitantDto)
  inhabitants: InhabitantDto[];

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WaterParametersDto)
  waterParameters?: WaterParametersDto;

  @Expose()
  @IsBoolean()
  isActive: boolean;

  @Expose()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}