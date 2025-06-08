import { IsString, IsOptional, IsNumber, IsDate, IsIn, IsUrl, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidObjectId, Trim, SanitizeInput, ToDate } from '../../decorators';

export class QuickEventDto {
  @IsString()
  @IsValidObjectId()
  aquariumId: string;

  @IsIn(['temperature', 'photo', 'feeding'])
  type: 'temperature' | 'photo' | 'feeding';

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  photo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @SanitizeInput()
  notes?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ToDate()
  timestamp?: Date = new Date();
}