import { v4 as uuidv4 } from 'uuid';
import { EventType, EventStatus } from '@verpa/common';
import { Reminder } from './reminder.entity';

export class Event {
  id: string;
  aquariumId: string;
  userId: string;
  type: EventType;
  title: string;
  description?: string;
  scheduledDate: Date;
  duration?: number; // in minutes
  recurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: Date;
  reminders: Reminder[];
  status: EventStatus;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Event>) {
    this.id = partial.id || uuidv4();
    this.aquariumId = partial.aquariumId!;
    this.userId = partial.userId!;
    this.type = partial.type!;
    this.title = partial.title!;
    this.description = partial.description;
    this.scheduledDate = partial.scheduledDate || new Date();
    this.duration = partial.duration;
    this.recurring = partial.recurring || false;
    this.recurrencePattern = partial.recurrencePattern;
    this.recurrenceEndDate = partial.recurrenceEndDate;
    this.reminders = partial.reminders || [];
    this.status = partial.status || EventStatus.SCHEDULED;
    this.completedAt = partial.completedAt;
    this.completedBy = partial.completedBy;
    this.notes = partial.notes;
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = partial.updatedAt || new Date();
  }

  isOverdue(): boolean {
    return this.status === EventStatus.SCHEDULED && 
           this.scheduledDate < new Date();
  }

  isDue(): boolean {
    if (this.status !== EventStatus.SCHEDULED) return false;
    
    const now = new Date();
    const dueTime = new Date(this.scheduledDate);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    return dueTime >= now && dueTime <= oneHourFromNow;
  }

  complete(completedBy: string, notes?: string): void {
    this.status = EventStatus.COMPLETED;
    this.completedAt = new Date();
    this.completedBy = completedBy;
    if (notes) {
      this.notes = (this.notes ? `${this.notes}\n` : '') + notes;
    }
    this.updatedAt = new Date();
  }

  cancel(reason?: string): void {
    this.status = EventStatus.CANCELLED;
    if (reason) {
      this.notes = (this.notes ? `${this.notes}\n` : '') + `Cancelled: ${reason}`;
    }
    this.updatedAt = new Date();
  }

  reschedule(newDate: Date): void {
    this.scheduledDate = newDate;
    this.status = EventStatus.SCHEDULED;
    this.updatedAt = new Date();
  }

  addReminder(reminder: Reminder): void {
    this.reminders.push(reminder);
    this.updatedAt = new Date();
  }

  removeReminder(reminderId: string): void {
    this.reminders = this.reminders.filter(r => r.id !== reminderId);
    this.updatedAt = new Date();
  }

  getNextOccurrence(): Date | null {
    if (!this.recurring || !this.recurrencePattern) {
      return null;
    }

    const baseDate = this.completedAt || this.scheduledDate;
    let nextDate = new Date(baseDate);

    switch (this.recurrencePattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (this.recurrencePattern.interval || 1));
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7 * (this.recurrencePattern.interval || 1));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + (this.recurrencePattern.interval || 1));
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + (this.recurrencePattern.interval || 1));
        break;
    }

    // Check if next occurrence is beyond end date
    if (this.recurrenceEndDate && nextDate > this.recurrenceEndDate) {
      return null;
    }

    return nextDate;
  }

  shouldCreateNextOccurrence(): boolean {
    if (!this.recurring) return false;
    if (this.status !== EventStatus.COMPLETED) return false;
    
    const nextOccurrence = this.getNextOccurrence();
    return nextOccurrence !== null;
  }

  toJSON(): any {
    return {
      ...this,
      isOverdue: this.isOverdue(),
      isDue: this.isDue(),
      nextOccurrence: this.getNextOccurrence(),
    };
  }
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
}