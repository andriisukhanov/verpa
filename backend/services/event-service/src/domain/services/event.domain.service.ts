import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event } from '../entities/event.entity';
import { Reminder } from '../entities/reminder.entity';
import { IEventRepository } from '../repositories/event.repository.interface';
import { EventType, EventStatus, SubscriptionType, NotificationType } from '@verpa/common';

@Injectable()
export class EventDomainService {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createEvent(
    userId: string,
    aquariumId: string,
    eventData: Partial<Event>,
    subscriptionType: SubscriptionType,
  ): Promise<Event> {
    // Validate event limits based on subscription
    const currentCount = await this.eventRepository.countByAquariumId(aquariumId);
    const limits = this.configService.get('limits.eventsPerAquarium');
    const maxEvents = limits[subscriptionType.toLowerCase()];

    if (maxEvents !== -1 && currentCount >= maxEvents) {
      throw new BadRequestException(
        `You have reached the maximum number of events (${maxEvents}) for your ${subscriptionType} subscription`,
      );
    }

    // Validate event data
    this.validateEventData(eventData);

    // Create event
    const event = new Event({
      ...eventData,
      userId,
      aquariumId,
      status: EventStatus.SCHEDULED,
    });

    // Add default reminders based on event type
    if (!event.reminders || event.reminders.length === 0) {
      event.reminders = this.getDefaultReminders(event.type, subscriptionType);
    }

    const created = await this.eventRepository.create(event);

    // Emit event
    this.eventEmitter.emit('event.created', {
      eventId: created.id,
      userId: created.userId,
      aquariumId: created.aquariumId,
      type: created.type,
      scheduledDate: created.scheduledDate,
    });

    return created;
  }

  async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<Event>,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Don't allow updating completed or cancelled events
    if (event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update ${event.status.toLowerCase()} events`);
    }

    // Validate updates
    if (updates.scheduledDate) {
      this.validateScheduledDate(updates.scheduledDate);
    }

    // Apply updates
    Object.assign(event, updates);
    event.updatedAt = new Date();

    const updated = await this.eventRepository.update(event);

    // Emit event
    this.eventEmitter.emit('event.updated', {
      eventId: updated.id,
      userId: updated.userId,
      changes: updates,
    });

    return updated;
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.eventRepository.delete(eventId);

    // Emit event
    this.eventEmitter.emit('event.deleted', {
      eventId: event.id,
      userId: event.userId,
      aquariumId: event.aquariumId,
    });
  }

  async completeEvent(
    eventId: string,
    userId: string,
    notes?: string,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Event is already completed');
    }

    event.complete(userId, notes);
    const updated = await this.eventRepository.update(event);

    // Create next occurrence if recurring
    if (event.shouldCreateNextOccurrence()) {
      await this.createNextOccurrence(event);
    }

    // Emit event
    this.eventEmitter.emit('event.completed', {
      eventId: updated.id,
      userId: updated.userId,
      aquariumId: updated.aquariumId,
      type: updated.type,
      completedAt: updated.completedAt,
    });

    return updated;
  }

  async cancelEvent(
    eventId: string,
    userId: string,
    reason?: string,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    event.cancel(reason);
    const updated = await this.eventRepository.update(event);

    // Emit event
    this.eventEmitter.emit('event.cancelled', {
      eventId: updated.id,
      userId: updated.userId,
      reason,
    });

    return updated;
  }

  async rescheduleEvent(
    eventId: string,
    userId: string,
    newDate: Date,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.validateScheduledDate(newDate);
    event.reschedule(newDate);

    const updated = await this.eventRepository.update(event);

    // Emit event
    this.eventEmitter.emit('event.rescheduled', {
      eventId: updated.id,
      userId: updated.userId,
      oldDate: event.scheduledDate,
      newDate: updated.scheduledDate,
    });

    return updated;
  }

  async addReminder(
    eventId: string,
    userId: string,
    reminderData: Partial<Reminder>,
    subscriptionType: SubscriptionType,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check reminder limits
    const limits = this.configService.get('limits.remindersPerEvent');
    const maxReminders = limits[subscriptionType.toLowerCase()];

    if (maxReminders !== -1 && event.reminders.length >= maxReminders) {
      throw new BadRequestException(
        `You have reached the maximum number of reminders (${maxReminders}) for your ${subscriptionType} subscription`,
      );
    }

    const reminder = new Reminder(reminderData);
    event.addReminder(reminder);

    const updated = await this.eventRepository.update(event);

    // Emit event
    this.eventEmitter.emit('reminder.added', {
      eventId: updated.id,
      reminderId: reminder.id,
      type: reminder.type,
    });

    return updated;
  }

  async removeReminder(
    eventId: string,
    userId: string,
    reminderId: string,
  ): Promise<Event> {
    const event = await this.eventRepository.findByIdAndUserId(eventId, userId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const reminder = event.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    event.removeReminder(reminderId);
    const updated = await this.eventRepository.update(event);

    // Emit event
    this.eventEmitter.emit('reminder.removed', {
      eventId: updated.id,
      reminderId,
    });

    return updated;
  }

  async getEvent(eventId: string, userId: string): Promise<Event | null> {
    return this.eventRepository.findByIdAndUserId(eventId, userId);
  }

  async getUserEvents(
    userId: string,
    options?: any,
  ): Promise<Event[]> {
    return this.eventRepository.findByUserId(userId, options);
  }

  async getAquariumEvents(
    aquariumId: string,
    userId: string,
    options?: any,
  ): Promise<Event[]> {
    // Verify user owns the aquarium (this would normally be done via aquarium service)
    const events = await this.eventRepository.findByAquariumId(aquariumId, options);
    return events.filter(e => e.userId === userId);
  }

  async getUpcomingEvents(userId: string, days: number = 7): Promise<Event[]> {
    return this.eventRepository.findUpcoming(userId, days);
  }

  async getOverdueEvents(userId: string): Promise<Event[]> {
    return this.eventRepository.findOverdue(userId);
  }

  async processReminders(): Promise<void> {
    // Find events with due reminders
    const events = await this.eventRepository.findDueReminders();

    for (const event of events) {
      for (const reminder of event.reminders) {
        if (reminder.shouldSend(event.scheduledDate)) {
          try {
            // Emit reminder event for notification service to handle
            this.eventEmitter.emit('reminder.due', {
              eventId: event.id,
              userId: event.userId,
              reminderId: reminder.id,
              type: reminder.type,
              eventTitle: event.title,
              eventDate: event.scheduledDate,
            });

            reminder.markAsSent();
          } catch (error) {
            reminder.markAsFailed(error.message);
          }
        }
      }

      // Update event with reminder status
      await this.eventRepository.update(event);
    }
  }

  async processOverdueEvents(): Promise<void> {
    const overdueEvents = await this.eventRepository.findOverdue('');

    for (const event of overdueEvents) {
      if (event.status === EventStatus.SCHEDULED && event.isOverdue()) {
        event.status = EventStatus.OVERDUE;
        await this.eventRepository.update(event);

        // Emit overdue event
        this.eventEmitter.emit('event.overdue', {
          eventId: event.id,
          userId: event.userId,
          aquariumId: event.aquariumId,
          type: event.type,
          scheduledDate: event.scheduledDate,
        });
      }
    }
  }

  private async createNextOccurrence(completedEvent: Event): Promise<void> {
    const nextDate = completedEvent.getNextOccurrence();
    if (!nextDate) return;

    const nextEvent = new Event({
      ...completedEvent,
      id: undefined, // Generate new ID
      scheduledDate: nextDate,
      status: EventStatus.SCHEDULED,
      completedAt: undefined,
      completedBy: undefined,
      notes: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Reset reminders
    nextEvent.reminders = completedEvent.reminders.map(
      r => new Reminder({
        ...r,
        id: undefined, // Generate new ID
        sent: false,
        sentAt: undefined,
        error: undefined,
      }),
    );

    await this.eventRepository.create(nextEvent);

    // Emit event
    this.eventEmitter.emit('event.recurring.created', {
      originalEventId: completedEvent.id,
      newEventId: nextEvent.id,
      userId: nextEvent.userId,
      scheduledDate: nextEvent.scheduledDate,
    });
  }

  private validateEventData(eventData: Partial<Event>): void {
    if (!eventData.title || eventData.title.trim().length === 0) {
      throw new BadRequestException('Event title is required');
    }

    if (!eventData.type) {
      throw new BadRequestException('Event type is required');
    }

    if (!eventData.scheduledDate) {
      throw new BadRequestException('Scheduled date is required');
    }

    this.validateScheduledDate(eventData.scheduledDate);

    if (eventData.recurring && !eventData.recurrencePattern) {
      throw new BadRequestException('Recurrence pattern is required for recurring events');
    }

    if (eventData.duration && eventData.duration < 0) {
      throw new BadRequestException('Duration must be positive');
    }
  }

  private validateScheduledDate(date: Date): void {
    const scheduledDate = new Date(date);
    const now = new Date();

    if (scheduledDate < now) {
      throw new BadRequestException('Scheduled date must be in the future');
    }
  }

  private getDefaultReminders(
    eventType: EventType,
    subscriptionType: SubscriptionType,
  ): Reminder[] {
    const reminders: Reminder[] = [];

    // Basic reminder for all subscriptions
    reminders.push(
      new Reminder({
        type: NotificationType.EMAIL,
        timeBefore: 60, // 1 hour before
      }),
    );

    // Additional reminders for premium subscriptions
    if (subscriptionType !== SubscriptionType.BASIC) {
      switch (eventType) {
        case EventType.WATER_CHANGE:
        case EventType.MAINTENANCE:
          reminders.push(
            new Reminder({
              type: NotificationType.PUSH,
              timeBefore: 1440, // 1 day before
            }),
          );
          break;
        case EventType.FEEDING:
          reminders.push(
            new Reminder({
              type: NotificationType.PUSH,
              timeBefore: 15, // 15 minutes before
            }),
          );
          break;
      }
    }

    return reminders;
  }
}