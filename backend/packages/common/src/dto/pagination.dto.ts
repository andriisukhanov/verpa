import { IsOptional, IsInt, IsString, IsIn, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ToNumber, Default } from '../decorators';
import { IPaginationQuery } from '../interfaces';
import { APP_CONSTANTS } from '../constants';

export class PaginationQueryDto implements IPaginationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ToNumber()
  @Default(APP_CONSTANTS.PAGINATION.DEFAULT_PAGE)
  page?: number = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(APP_CONSTANTS.PAGINATION.MAX_LIMIT)
  @Type(() => Number)
  @ToNumber()
  @Default(APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT)
  limit?: number = APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  @Default('createdAt')
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Default('desc')
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}