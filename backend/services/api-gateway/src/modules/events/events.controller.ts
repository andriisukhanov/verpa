import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

@ApiTags('events')
@Controller('events')
@ApiBearerAuth()
export class EventsController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'aquariumId', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async findAll(@Query() query: any, @Request() req: any) {
    const userId = req.user?.sub;
    const cacheKey = `events:${userId}:${JSON.stringify(query)}`;
    
    return this.cacheService.remember(
      cacheKey,
      () => this.proxyService.get('event-service', '/events', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 60 } // Cache for 1 minute
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createDto: any, @Request() req: any) {
    const result = await this.proxyService.post('event-service', '/events', createDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (createDto.aquariumId) {
      await this.cacheService.del(`events:aquarium:${createDto.aquariumId}:*`);
    }

    return result;
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days ahead' })
  @ApiQuery({ name: 'aquariumId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved' })
  async getUpcoming(@Query() query: any, @Request() req: any) {
    const userId = req.user?.sub;
    return this.cacheService.remember(
      `events:upcoming:${userId}:${JSON.stringify(query)}`,
      () => this.proxyService.get('event-service', '/events/upcoming', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue events' })
  @ApiQuery({ name: 'aquariumId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Overdue events retrieved' })
  async getOverdue(@Query() query: any, @Request() req: any) {
    const userId = req.user?.sub;
    return this.cacheService.remember(
      `events:overdue:${userId}:${JSON.stringify(query)}`,
      () => this.proxyService.get('event-service', '/events/overdue', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 60 } // Cache for 1 minute
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiQuery({ name: 'aquariumId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() query: any, @Request() req: any) {
    const userId = req.user?.sub;
    return this.cacheService.remember(
      `events:stats:${userId}:${JSON.stringify(query)}`,
      () => this.proxyService.get('event-service', '/events/stats', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 600 } // Cache for 10 minutes
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get event templates' })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'waterType', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Query() query: any, @Request() req: any) {
    return this.cacheService.remember(
      `events:templates:${JSON.stringify(query)}`,
      () => this.proxyService.get('event-service', '/events/templates', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 3600 } // Cache for 1 hour
    );
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple events' })
  @ApiResponse({ status: 201, description: 'Events created successfully' })
  async createBatch(@Body() createBatchDto: any, @Request() req: any) {
    const result = await this.proxyService.post('event-service', '/events/batch', createBatchDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }

    return result;
  }

  @Get('by-aquarium/:aquariumId')
  @ApiOperation({ summary: 'Get events by aquarium' })
  @ApiParam({ name: 'aquariumId', description: 'Aquarium ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async findByAquarium(
    @Param('aquariumId') aquariumId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return this.cacheService.remember(
      `events:aquarium:${aquariumId}:${JSON.stringify(query)}`,
      () => this.proxyService.get(`event-service`, `/events/by-aquarium/${aquariumId}`, {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.cacheService.remember(
      `event:${id}`,
      () => this.proxyService.get('event-service', `/events/${id}`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.put('event-service', `/events/${id}`, updateDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (result.aquariumId) {
      await this.cacheService.del(`events:aquarium:${result.aquariumId}:*`);
    }

    return result;
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark event as completed' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event completed successfully' })
  async complete(
    @Param('id') id: string,
    @Body() completeDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.patch('event-service', `/events/${id}/complete`, completeDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (result.aquariumId) {
      await this.cacheService.del(`events:aquarium:${result.aquariumId}:*`);
    }

    return result;
  }

  @Patch(':id/skip')
  @ApiOperation({ summary: 'Skip event occurrence' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event skipped successfully' })
  async skip(
    @Param('id') id: string,
    @Body() skipDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.patch('event-service', `/events/${id}/skip`, skipDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (result.aquariumId) {
      await this.cacheService.del(`events:aquarium:${result.aquariumId}:*`);
    }

    return result;
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event rescheduled successfully' })
  async reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.patch('event-service', `/events/${id}/reschedule`, rescheduleDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (result.aquariumId) {
      await this.cacheService.del(`events:aquarium:${result.aquariumId}:*`);
    }

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async delete(@Param('id') id: string, @Request() req: any) {
    // Get event details first to clear aquarium cache
    const event = await this.proxyService.get('event-service', `/events/${id}`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    const result = await this.proxyService.delete('event-service', `/events/${id}`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (event.aquariumId) {
      await this.cacheService.del(`events:aquarium:${event.aquariumId}:*`);
    }

    return result;
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore deleted event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event restored successfully' })
  async restore(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.post('event-service', `/events/${id}/restore`, {}, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`event:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`events:${userId}:*`);
    }
    if (result.aquariumId) {
      await this.cacheService.del(`events:aquarium:${result.aquariumId}:*`);
    }

    return result;
  }

  // Reminder endpoints
  @Get(':id/reminders')
  @ApiOperation({ summary: 'Get event reminders' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Reminders retrieved successfully' })
  async getReminders(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get('event-service', `/events/${id}/reminders`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Post(':id/reminders')
  @ApiOperation({ summary: 'Add event reminder' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Reminder added successfully' })
  async addReminder(
    @Param('id') id: string,
    @Body() reminderDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.post(
      'event-service',
      `/events/${id}/reminders`,
      reminderDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate event cache
    await this.cacheService.del(`event:${id}`);

    return result;
  }

  @Delete(':id/reminders/:reminderId')
  @ApiOperation({ summary: 'Remove event reminder' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiParam({ name: 'reminderId', description: 'Reminder ID' })
  @ApiResponse({ status: 204, description: 'Reminder removed successfully' })
  async removeReminder(
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
    @Request() req: any,
  ) {
    const result = await this.proxyService.delete(
      'event-service',
      `/events/${id}/reminders/${reminderId}`,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate event cache
    await this.cacheService.del(`event:${id}`);

    return result;
  }
}