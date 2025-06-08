import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Req,
  Res,
  StreamableFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { MediaService } from '../services/media.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import {
  UploadFileDto,
  FileUploadedResponse,
  FileCategory,
  FileVisibility,
} from '../dto/upload-file.dto';
import {
  GetFileDto,
  GetSignedUrlDto,
  ListFilesDto,
  FileInfo,
  SignedUrlResponse,
} from '../dto/get-file.dto';
import {
  DeleteFileDto,
  DeleteMultipleFilesDto,
  DeleteFileResponse,
} from '../dto/delete-file.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileUploadedResponse })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Req() req: Request,
  ): Promise<FileUploadedResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Extract user ID from request (would come from auth in real app)
    const userId = req['user']?.id || 'demo-user';

    return this.mediaService.uploadFile(file, userId, {
      category: dto.category,
      visibility: dto.visibility,
      entityId: dto.entityId,
      entityType: dto.entityType,
      metadata: dto.metadata,
    });
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
    @Req() req: Request,
  ): Promise<FileUploadedResponse[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const userId = req['user']?.id || 'demo-user';
    const results: FileUploadedResponse[] = [];

    for (const file of files) {
      const result = await this.mediaService.uploadFile(file, userId, {
        category: dto.category,
        visibility: dto.visibility,
        entityId: dto.entityId,
        entityType: dto.entityType,
        metadata: dto.metadata,
      });
      results.push(result);
    }

    return results;
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({ status: 200, description: 'File information', type: FileInfo })
  async getFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ): Promise<FileInfo> {
    const userId = req['user']?.id || 'demo-user';
    return this.mediaService.getFile(fileId, userId);
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File stream' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const userId = req['user']?.id || 'demo-user';
    const fileInfo = await this.mediaService.getFile(fileId, userId);
    
    // Get file buffer from storage
    const isPublic = fileInfo.metadata?.visibility === FileVisibility.PUBLIC;
    const buffer = await this.storageService.getFile(fileInfo.filename, isPublic);

    // Set headers
    res.set({
      'Content-Type': fileInfo.mimeType,
      'Content-Disposition': `attachment; filename="${fileInfo.originalName}"`,
      'Content-Length': buffer.length.toString(),
    });

    return new StreamableFile(buffer);
  }

  @Get('files/:fileId/signed-url')
  @ApiOperation({ summary: 'Get a signed URL for file access' })
  @ApiResponse({ status: 200, description: 'Signed URL', type: SignedUrlResponse })
  async getSignedUrl(
    @Param('fileId') fileId: string,
    @Query() query: GetSignedUrlDto,
    @Req() req: Request,
  ): Promise<SignedUrlResponse> {
    const userId = req['user']?.id || 'demo-user';
    return this.mediaService.getSignedUrl(fileId, userId, query.expiresIn);
  }

  @Get('files')
  @ApiOperation({ summary: 'List user files' })
  @ApiResponse({ status: 200, description: 'List of files' })
  async listFiles(
    @Query() query: ListFilesDto,
    @Req() req: Request,
  ): Promise<{ files: FileInfo[]; total: number; page: number; limit: number }> {
    const userId = req['user']?.id || 'demo-user';
    return this.mediaService.listFiles(userId, {
      entityId: query.entityId,
      entityType: query.entityType,
      category: query.category,
      page: query.page,
      limit: query.limit,
    });
  }

  @Delete('files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted', type: DeleteFileResponse })
  async deleteFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ): Promise<DeleteFileResponse> {
    const userId = req['user']?.id || 'demo-user';
    return this.mediaService.deleteFile(fileId, userId);
  }

  @Delete('files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple files' })
  @ApiResponse({ status: 200, description: 'Files deleted', type: DeleteFileResponse })
  async deleteMultipleFiles(
    @Body() dto: DeleteMultipleFilesDto,
    @Req() req: Request,
  ): Promise<DeleteFileResponse> {
    const userId = req['user']?.id || 'demo-user';
    return this.mediaService.deleteMultipleFiles(dto.fileIds, userId);
  }
}