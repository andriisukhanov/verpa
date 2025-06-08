import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@verpa/common';
import { EventService } from '../services/event.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import { EventType, EventStatus } from '@verpa/common';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('aquarium/:aquariumId')
  @ApiOperation({ summary: 'Create a new event for an aquarium' })
  @ApiParam({ name: 'aquariumId', description: 'Aquarium ID' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  async create(
    @Param('aquariumId') aquariumId: string,
    @Body() createEventDto: CreateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.create(
      req.user.sub,
      aquariumId,
      createEventDto,
      req.user.subscriptionType,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all events for the current user' })
  @ApiQuery({ name: 'type', enum: EventType, required: false })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'recurring', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of events',
    type: [EventResponseDto],
  })
  async findAll(@Query() query: any, @Request() req: any): Promise<EventResponseDto[]> {
    const options = {
      type: query.type,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      recurring: query.recurring === 'true',
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    };

    return this.eventService.findAll(req.user.sub, options);
  }

  @Get('aquarium/:aquariumId')
  @ApiOperation({ summary: 'Get all events for a specific aquarium' })
  @ApiParam({ name: 'aquariumId', description: 'Aquarium ID' })
  @ApiQuery({ name: 'type', enum: EventType, required: false })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of aquarium events',
    type: [EventResponseDto],
  })
  async findByAquarium(
    @Param('aquariumId') aquariumId: string,
    @Query() query: any,
    @Request() req: any,
  ): Promise<EventResponseDto[]> {
    const options = {
      type: query.type,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    };

    return this.eventService.findByAquarium(aquariumId, req.user.sub, options);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days to look ahead (default: 7)' })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming events',
    type: [EventResponseDto],
  })
  async findUpcoming(
    @Query('days') days?: string,
    @Request() req?: any,
  ): Promise<EventResponseDto[]> {
    const daysNum = days ? parseInt(days) : 7;
    return this.eventService.findUpcoming(req.user.sub, daysNum);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue events' })
  @ApiResponse({
    status: 200,
    description: 'List of overdue events',
    type: [EventResponseDto],
  })
  async findOverdue(@Request() req: any): Promise<EventResponseDto[]> {
    return this.eventService.findOverdue(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<EventResponseDto> {
    return this.eventService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.update(id, req.user.sub, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.eventService.remove(id, req.user.sub);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark event as completed' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event completed successfully',
    type: EventResponseDto,
  })
  async complete(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.complete(id, req.user.sub, notes);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event cancelled successfully',
    type: EventResponseDto,
  })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.cancel(id, req.user.sub, reason);
  }

  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event rescheduled successfully',
    type: EventResponseDto,
  })
  async reschedule(
    @Param('id') id: string,
    @Body('scheduledDate') scheduledDate: string,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    if (!scheduledDate) {
      throw new BadRequestException('scheduledDate is required');
    }
    return this.eventService.reschedule(id, req.user.sub, scheduledDate);
  }

  @Post(':id/reminders')
  @ApiOperation({ summary: 'Add reminder to event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Reminder added successfully',
    type: EventResponseDto,
  })
  async addReminder(
    @Param('id') id: string,
    @Body() createReminderDto: CreateReminderDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.addReminder(
      id,
      req.user.sub,
      createReminderDto,
      req.user.subscriptionType,
    );
  }

  @Delete(':id/reminders/:reminderId')
  @ApiOperation({ summary: 'Remove reminder from event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiParam({ name: 'reminderId', description: 'Reminder ID' })
  @ApiResponse({
    status: 200,
    description: 'Reminder removed successfully',
    type: EventResponseDto,
  })
  async removeReminder(
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    return this.eventService.removeReminder(id, req.user.sub, reminderId);
  }
}