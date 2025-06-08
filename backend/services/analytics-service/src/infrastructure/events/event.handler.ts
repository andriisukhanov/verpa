import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AnalyticsService } from '../../application/services/analytics.service';
import { TrackEventDto } from '../../application/dto/track-event.dto';

@Injectable()
export class EventHandler {
  private readonly logger = new Logger(EventHandler.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @EventPattern('user.events')
  async handleUserEvent(@Payload() data: any) {
    this.logger.debug(`Received user event: ${JSON.stringify(data)}`);
    
    const trackEvent: TrackEventDto = {
      eventType: data.eventType,
      eventCategory: 'user',
      entityType: 'user',
      entityId: data.userId || data.id,
      userId: data.userId || data.id,
      properties: data,
      metadata: {
        source: 'kafka',
        topic: 'user.events',
      },
    };

    await this.analyticsService.trackEvent(trackEvent);
  }

  @EventPattern('aquarium.events')
  async handleAquariumEvent(@Payload() data: any) {
    this.logger.debug(`Received aquarium event: ${JSON.stringify(data)}`);
    
    const trackEvent: TrackEventDto = {
      eventType: data.eventType,
      eventCategory: 'aquarium',
      entityType: 'aquarium',
      entityId: data.aquariumId || data.id,
      userId: data.userId,
      properties: data,
      metadata: {
        source: 'kafka',
        topic: 'aquarium.events',
      },
    };

    await this.analyticsService.trackEvent(trackEvent);
  }

  @EventPattern('event.events')
  async handleEventEvent(@Payload() data: any) {
    this.logger.debug(`Received event event: ${JSON.stringify(data)}`);
    
    const trackEvent: TrackEventDto = {
      eventType: data.eventType,
      eventCategory: 'event',
      entityType: 'event',
      entityId: data.eventId || data.id,
      userId: data.userId,
      properties: data,
      metadata: {
        source: 'kafka',
        topic: 'event.events',
      },
    };

    await this.analyticsService.trackEvent(trackEvent);
  }

  @EventPattern('system.events')
  async handleSystemEvent(@Payload() data: any) {
    this.logger.debug(`Received system event: ${JSON.stringify(data)}`);
    
    const trackEvent: TrackEventDto = {
      eventType: data.eventType,
      eventCategory: 'system',
      entityType: data.entityType || 'system',
      entityId: data.entityId || 'system',
      userId: data.userId || 'system',
      properties: data,
      metadata: {
        source: 'kafka',
        topic: 'system.events',
      },
    };

    await this.analyticsService.trackEvent(trackEvent);
  }
}