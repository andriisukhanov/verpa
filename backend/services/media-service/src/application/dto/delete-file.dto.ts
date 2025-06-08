import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class DeleteFileDto {
  @ApiProperty()
  @IsString()
  fileId: string;
}

export class DeleteMultipleFilesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  fileIds: string[];
}

export class DeleteFileResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  deletedCount: number;

  @ApiProperty({ type: [String] })
  deletedFiles: string[];

  @ApiProperty({ type: [String] })
  errors?: string[];
}