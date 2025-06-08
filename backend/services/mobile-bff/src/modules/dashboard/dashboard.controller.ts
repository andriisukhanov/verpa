import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DashboardService, DashboardData } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get mobile dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatar: { type: 'string' },
            subscriptionType: { type: 'string' },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalAquariums: { type: 'number' },
            activeAlerts: { type: 'number' },
            upcomingTasks: { type: 'number' },
            lastWaterChange: { type: 'string', format: 'date-time' },
          },
        },
        aquariums: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              volume: { type: 'number' },
              imageUrl: { type: 'string' },
              health: { type: 'string', enum: ['good', 'warning', 'critical'] },
              lastMeasurement: {
                type: 'object',
                properties: {
                  temperature: { type: 'number' },
                  ph: { type: 'number' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        recentEvents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              aquariumId: { type: 'string' },
              aquariumName: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              isCompleted: { type: 'boolean' },
            },
          },
        },
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['info', 'warning', 'error'] },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              isRead: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async getDashboard(@Req() req: Request): Promise<DashboardData> {
    // Extract user ID and token from request (would come from auth guard)
    const userId = req['user']?.id || 'demo-user';
    const token = req.headers.authorization?.split(' ')[1] || '';

    return this.dashboardService.getDashboardData(userId, token);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Refresh dashboard cache' })
  @ApiResponse({ status: 204, description: 'Dashboard cache cleared successfully' })
  async refreshDashboard(@Req() req: Request): Promise<void> {
    const userId = req['user']?.id || 'demo-user';
    await this.dashboardService.refreshDashboard(userId);
  }

  @Get('summary')
  @Version('1')
  @ApiOperation({ summary: 'Get dashboard summary only (lightweight)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(@Req() req: Request) {
    const userId = req['user']?.id || 'demo-user';
    const token = req.headers.authorization?.split(' ')[1] || '';

    const fullData = await this.dashboardService.getDashboardData(userId, token);
    
    // Return only summary and user info for quick loading
    return {
      user: fullData.user,
      summary: fullData.summary,
      hasNotifications: fullData.notifications.filter(n => !n.isRead).length > 0,
    };
  }
}