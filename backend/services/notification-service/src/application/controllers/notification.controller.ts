import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { SendEmailDto } from '../dto/send-email.dto';
import { SendSmsDto } from '../dto/send-sms.dto';
import { SendPushDto } from '../dto/send-push.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('email')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email notification' })
  @ApiResponse({ status: 202, description: 'Email queued for sending' })
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationService.sendEmail(dto);
  }

  @Post('sms')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send SMS notification' })
  @ApiResponse({ status: 202, description: 'SMS queued for sending' })
  async sendSms(@Body() dto: SendSmsDto) {
    return this.notificationService.sendSms(dto);
  }

  @Post('push')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 202, description: 'Push notification queued for sending' })
  async sendPush(@Body() dto: SendPushDto) {
    return this.notificationService.sendPush(dto);
  }

  @Post('bulk-email')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk email notifications' })
  @ApiResponse({ status: 202, description: 'Bulk emails queued for sending' })
  async sendBulkEmail(
    @Body() dto: { recipients: string[]; email: Partial<SendEmailDto> },
  ) {
    return this.notificationService.sendBulkEmail(dto.recipients, dto.email);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available email templates' })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  getTemplates() {
    return {
      templates: ['WELCOME', 'EMAIL_VERIFIED', 'PASSWORD_RESET', 'ACCOUNT_LOCKED'],
    };
  }
}