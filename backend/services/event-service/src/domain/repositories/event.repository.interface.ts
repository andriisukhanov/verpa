import { Event } from '../entities/event.entity';
import { EventType, EventStatus } from '@verpa/common';

export interface IEventRepository {
  create(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Event | null>;
  findByAquariumId(aquariumId: string, options?: FindEventsOptions): Promise<Event[]>;
  findByUserId(userId: string, options?: FindEventsOptions): Promise<Event[]>;
  findUpcoming(userId: string, days?: number): Promise<Event[]>;
  findOverdue(userId: string): Promise<Event[]>;
  findDueReminders(timeWindow?: number): Promise<Event[]>;
  update(event: Event): Promise<Event>;
  delete(id: string): Promise<boolean>;
  countByUserId(userId: string, status?: EventStatus): Promise<number>;
  countByAquariumId(aquariumId: string, status?: EventStatus): Promise<number>;
}

export interface FindEventsOptions {
  type?: EventType;
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date;
  recurring?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}