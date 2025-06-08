import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventQueryDto, MetricQueryDto, AggregationQueryDto } from '../dto/analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track an analytics event' })
  @ApiResponse({ status: 204, description: 'Event tracked successfully' })
  async trackEvent(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.trackEvent(dto);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user analytics profile' })
  @ApiResponse({ status: 200, description: 'User analytics data' })
  async getUserAnalytics(@Param('userId') userId: string) {
    const analytics = await this.analyticsService.getUserAnalytics(userId);
    if (!analytics) {
      return {
        userId,
        message: 'No analytics data found for this user',
      };
    }
    return analytics;
  }

  @Get('users/:userId/events')
  @ApiOperation({ summary: 'Get user event history' })
  @ApiResponse({ status: 200, description: 'User event history' })
  async getUserEvents(
    @Param('userId') userId: string,
    @Query() query: EventQueryDto,
  ) {
    const events = await this.analyticsService.getEventHistory(
      userId,
      new Date(query.startDate),
      new Date(query.endDate),
      query.limit,
    );
    return {
      userId,
      events,
      count: events.length,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Query system metrics' })
  @ApiResponse({ status: 200, description: 'Metrics data' })
  async getMetrics(@Query() query: MetricQueryDto) {
    const metrics = await this.analyticsService.getSystemMetrics(
      query.metricName,
      new Date(query.startDate),
      new Date(query.endDate),
      query.tags,
    );
    return {
      metrics,
      count: metrics.length,
    };
  }

  @Get('activity-stats')
  @ApiOperation({ summary: 'Get platform activity statistics' })
  @ApiResponse({ status: 200, description: 'Activity statistics' })
  async getActivityStats(@Query() query: EventQueryDto) {
    const stats = await this.analyticsService.getActivityStats(
      new Date(query.startDate),
      new Date(query.endDate),
    );
    return stats;
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get user segments with counts' })
  @ApiResponse({ status: 200, description: 'User segments' })
  async getUserSegments() {
    return this.analyticsService.getUserSegments();
  }

  @Get('cohort-retention')
  @ApiOperation({ summary: 'Get cohort retention analysis' })
  @ApiResponse({ status: 200, description: 'Cohort retention data' })
  async getCohortRetention(
    @Query('cohortDate') cohortDate: string,
    @Query('periods') periods: number = 12,
  ) {
    return this.analyticsService.getCohortRetention(
      new Date(cohortDate),
      periods,
    );
  }
}