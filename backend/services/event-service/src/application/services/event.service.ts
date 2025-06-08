import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventDomainService } from '../../domain/services/event.domain.service';
import { Event } from '../../domain/entities/event.entity';
import { Reminder } from '../../domain/entities/reminder.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import { SubscriptionType } from '@verpa/common';

@Injectable()
export class EventService {
  constructor(
    private readonly domainService: EventDomainService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    userId: string,
    aquariumId: string,
    createDto: CreateEventDto,
    subscriptionType: SubscriptionType,
  ): Promise<EventResponseDto> {
    const eventData: any = {
      ...createDto,
      scheduledDate: new Date(createDto.scheduledDate),
      recurrenceEndDate: createDto.recurrenceEndDate 
        ? new Date(createDto.recurrenceEndDate)
        : undefined,
    };

    // Remove reminders from eventData as they will be handled by domain service
    delete eventData.reminders;

    const event = await this.domainService.createEvent(
      userId,
      aquariumId,
      eventData,
      subscriptionType,
    );

    return this.toResponseDto(event);
  }

  async findAll(
    userId: string,
    options?: any,
  ): Promise<EventResponseDto[]> {
    const events = await this.domainService.getUserEvents(userId, options);
    return events.map(event => this.toResponseDto(event));
  }

  async findByAquarium(
    aquariumId: string,
    userId: string,
    options?: any,
  ): Promise<EventResponseDto[]> {
    const events = await this.domainService.getAquariumEvents(
      aquariumId,
      userId,
      options,
    );
    return events.map(event => this.toResponseDto(event));
  }

  async findOne(eventId: string, userId: string): Promise<EventResponseDto> {
    const event = await this.domainService.getEvent(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return this.toResponseDto(event);
  }

  async findUpcoming(userId: string, days: number = 7): Promise<EventResponseDto[]> {
    const events = await this.domainService.getUpcomingEvents(userId, days);
    return events.map(event => this.toResponseDto(event));
  }

  async findOverdue(userId: string): Promise<EventResponseDto[]> {
    const events = await this.domainService.getOverdueEvents(userId);
    return events.map(event => this.toResponseDto(event));
  }

  async update(
    eventId: string,
    userId: string,
    updateDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const updateData: any = { ...updateDto };
    if (updateDto.scheduledDate) {
      updateData.scheduledDate = new Date(updateDto.scheduledDate);
    }
    if (updateDto.recurrenceEndDate) {
      updateData.recurrenceEndDate = new Date(updateDto.recurrenceEndDate);
    }

    const event = await this.domainService.updateEvent(
      eventId,
      userId,
      updateData,
    );

    return this.toResponseDto(event);
  }

  async remove(eventId: string, userId: string): Promise<void> {
    await this.domainService.deleteEvent(eventId, userId);
  }

  async complete(
    eventId: string,
    userId: string,
    notes?: string,
  ): Promise<EventResponseDto> {
    const event = await this.domainService.completeEvent(
      eventId,
      userId,
      notes,
    );
    return this.toResponseDto(event);
  }

  async cancel(
    eventId: string,
    userId: string,
    reason?: string,
  ): Promise<EventResponseDto> {
    const event = await this.domainService.cancelEvent(
      eventId,
      userId,
      reason,
    );
    return this.toResponseDto(event);
  }

  async reschedule(
    eventId: string,
    userId: string,
    newDate: Date | string,
  ): Promise<EventResponseDto> {
    const scheduledDate = new Date(newDate);
    const event = await this.domainService.rescheduleEvent(
      eventId,
      userId,
      scheduledDate,
    );
    return this.toResponseDto(event);
  }

  async addReminder(
    eventId: string,
    userId: string,
    reminderDto: CreateReminderDto,
    subscriptionType: SubscriptionType,
  ): Promise<EventResponseDto> {
    const event = await this.domainService.addReminder(
      eventId,
      userId,
      reminderDto,
      subscriptionType,
    );
    return this.toResponseDto(event);
  }

  async removeReminder(
    eventId: string,
    userId: string,
    reminderId: string,
  ): Promise<EventResponseDto> {
    const event = await this.domainService.removeReminder(
      eventId,
      userId,
      reminderId,
    );
    return this.toResponseDto(event);
  }

  // Scheduled jobs
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    try {
      await this.domainService.processReminders();
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processOverdueEvents() {
    try {
      await this.domainService.processOverdueEvents();
    } catch (error) {
      console.error('Error processing overdue events:', error);
    }
  }

  // Event handlers
  onModuleInit() {
    // Listen for domain events and republish for other services
    this.eventEmitter.on('event.created', async (data) => {
      // Could send to notification service, analytics, etc.
      console.log('Event created:', data);
    });

    this.eventEmitter.on('event.completed', async (data) => {
      // Update aquarium statistics, achievement tracking, etc.
      console.log('Event completed:', data);
    });

    this.eventEmitter.on('reminder.due', async (data) => {
      // Send to notification service
      console.log('Reminder due:', data);
    });

    this.eventEmitter.on('event.overdue', async (data) => {
      // Send notification about overdue event
      console.log('Event overdue:', data);
    });
  }

  private toResponseDto(event: Event): EventResponseDto {
    const json = event.toJSON();
    
    return {
      id: event.id,
      aquariumId: event.aquariumId,
      userId: event.userId,
      type: event.type,
      title: event.title,
      description: event.description,
      scheduledDate: event.scheduledDate,
      duration: event.duration,
      recurring: event.recurring,
      recurrencePattern: event.recurrencePattern,
      recurrenceEndDate: event.recurrenceEndDate,
      reminders: event.reminders.map(reminder => ({
        id: reminder.id,
        type: reminder.type,
        timeBefore: reminder.timeBefore,
        sent: reminder.sent,
        sentAt: reminder.sentAt,
        error: reminder.error,
        readableTimeBefore: reminder.toJSON().readableTimeBefore,
      })),
      status: event.status,
      completedAt: event.completedAt,
      completedBy: event.completedBy,
      notes: event.notes,
      isOverdue: json.isOverdue,
      isDue: json.isDue,
      nextOccurrence: json.nextOccurrence,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}