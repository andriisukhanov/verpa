import { Expose } from 'class-transformer';
import { IApiResponse, IApiError } from '../interfaces';

export class ApiResponseDto<T = unknown> implements IApiResponse<T> {
  @Expose()
  success: boolean;

  @Expose()
  data?: T;

  @Expose()
  message?: string;

  @Expose()
  error?: IApiError;

  @Expose()
  timestamp: Date = new Date();

  @Expose()
  path?: string;

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    response.message = message;
    return response;
  }

  static error(error: IApiError, path?: string): ApiResponseDto {
    const response = new ApiResponseDto();
    response.success = false;
    response.error = error;
    response.path = path;
    return response;
  }
}