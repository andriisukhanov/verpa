import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProxyService } from '../../services/proxy/proxy.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('media')
@Controller('api/v1/media')
@UseGuards(ApiKeyGuard)
export class MediaController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: ['aquarium_photo', 'fish_photo', 'avatar', 'document', 'other'],
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
        },
        entityId: {
          type: 'string',
        },
        entityType: {
          type: 'string',
        },
      },
    },
  })
  async uploadFile(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      '/api/v1/media/upload',
      req,
      res,
    );
  }

  @Post('upload/multiple')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        category: {
          type: 'string',
          enum: ['aquarium_photo', 'fish_photo', 'avatar', 'document', 'other'],
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
        },
      },
    },
  })
  async uploadMultipleFiles(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      '/api/v1/media/upload/multiple',
      req,
      res,
    );
  }

  @Get('files')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user files' })
  async listFiles(
    @Query() query: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      '/api/v1/media/files',
      req,
      res,
    );
  }

  @Get('files/:fileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file information' })
  async getFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      `/api/v1/media/files/${fileId}`,
      req,
      res,
    );
  }

  @Get('files/:fileId/download')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a file' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      `/api/v1/media/files/${fileId}/download`,
      req,
      res,
    );
  }

  @Get('files/:fileId/signed-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed URL for file access' })
  async getSignedUrl(
    @Param('fileId') fileId: string,
    @Query() query: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      `/api/v1/media/files/${fileId}/signed-url`,
      req,
      res,
    );
  }

  @Delete('files/:fileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      `/api/v1/media/files/${fileId}`,
      req,
      res,
    );
  }

  @Delete('files')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete multiple files' })
  async deleteMultipleFiles(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'media-service',
      '/api/v1/media/files',
      req,
      res,
    );
  }
}