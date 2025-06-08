import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  ApiResponse,
} from '@nestjs/swagger';
import { ProxyService } from '../../services/proxy/proxy.service';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { SkipApiKey } from '../../common/decorators/skip-api-key.decorator';

@ApiTags('notifications')
@Controller('api/v1/notifications')
@UseGuards(ApiKeyGuard)
@UseInterceptors(TransformInterceptor)
export class NotificationsController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email notification' })
  @ApiResponse({ status: 202, description: 'Email queued for sending' })
  async sendEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'notification-service',
      '/notifications/email',
      req,
      res,
    );
  }

  @Post('sms')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send SMS notification' })
  @ApiResponse({ status: 202, description: 'SMS queued for sending' })
  async sendSms(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'notification-service',
      '/notifications/sms',
      req,
      res,
    );
  }

  @Post('push')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 202, description: 'Push notification queued for sending' })
  async sendPush(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'notification-service',
      '/notifications/push',
      req,
      res,
    );
  }

  @Post('bulk-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk email notifications' })
  @ApiResponse({ status: 202, description: 'Bulk emails queued for sending' })
  async sendBulkEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'notification-service',
      '/notifications/bulk-email',
      req,
      res,
    );
  }

  @Get('templates')
  @SkipApiKey()
  @ApiOperation({ summary: 'List available email templates' })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  async getTemplates(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest(
      'notification-service',
      '/notifications/templates',
      req,
      res,
    );
  }
}