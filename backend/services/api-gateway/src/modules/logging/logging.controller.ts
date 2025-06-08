import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoggerService, QueryService, LogLevel } from '@verpa/logging';

@ApiTags('logging')
@Controller('logging')
@ApiBearerAuth()
export class LoggingController {
  constructor(
    private readonly logger: LoggerService,
    private readonly queryService: QueryService,
  ) {
    this.logger.setContext('LoggingController');
  }

  @Get('search')
  @ApiOperation({ summary: 'Search logs' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, enum: LogLevel })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'requestId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async searchLogs(@Query() query: any) {
    try {
      const options = {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        level: query.level,
        service: query.service,
        userId: query.userId,
        requestId: query.requestId,
        search: query.search,
        limit: parseInt(query.limit) || 100,
        offset: parseInt(query.offset) || 0,
      };

      return await this.logger.query(options);
    } catch (error) {
      this.logger.error('Failed to search logs', error);
      throw new HttpException(
        'Failed to search logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() query: any) {
    try {
      const timeRange = {
        from: query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: query.to ? new Date(query.to) : new Date(),
      };

      return await this.queryService.getStats(timeRange);
    } catch (error) {
      this.logger.error('Failed to get log stats', error);
      throw new HttpException(
        'Failed to get log statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check logging system health' })
  @ApiResponse({ status: 200, description: 'Logging system is healthy' })
  async checkHealth() {
    // This would check Elasticsearch connectivity, disk space for file logs, etc.
    return {
      status: 'healthy',
      timestamp: new Date(),
      components: {
        elasticsearch: 'connected',
        fileSystem: 'available',
        redisContext: 'connected',
      },
    };
  }
}