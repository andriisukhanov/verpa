import { IsString, IsOptional, IsDate, IsIn, IsNumber, MinLength, MaxLength, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidObjectId, Trim, SanitizeInput, ToDate } from '../../decorators';

export class InhabitantDto {
  @IsString()
  @IsValidObjectId()
  _id: string;

  @IsIn(['fish', 'plant', 'coral', 'invertebrate', 'other'])
  type: 'fish' | 'plant' | 'coral' | 'invertebrate' | 'other';

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  species: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Trim()
  commonName?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsDate()
  @Type(() => Date)
  @ToDate()
  addedDate: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  photo?: string;
}

export class CreateInhabitantDto {
  @IsIn(['fish', 'plant', 'coral', 'invertebrate', 'other'])
  type: 'fish' | 'plant' | 'coral' | 'invertebrate' | 'other';

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Trim()
  species: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Trim()
  commonName?: string;

  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @IsDate()
  @Type(() => Date)
  @ToDate()
  addedDate: Date = new Date();

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  photo?: string;
}