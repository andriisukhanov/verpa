import { v4 as uuidv4 } from 'uuid';
import { NotificationType } from '@verpa/common';

export class Reminder {
  id: string;
  type: NotificationType;
  timeBefore: number; // minutes before event
  sent: boolean;
  sentAt?: Date;
  error?: string;
  createdAt: Date;

  constructor(partial: Partial<Reminder>) {
    this.id = partial.id || uuidv4();
    this.type = partial.type || NotificationType.EMAIL;
    this.timeBefore = partial.timeBefore || 60; // Default 1 hour
    this.sent = partial.sent || false;
    this.sentAt = partial.sentAt;
    this.error = partial.error;
    this.createdAt = partial.createdAt || new Date();
  }

  getReminderTime(eventDate: Date): Date {
    const reminderTime = new Date(eventDate);
    reminderTime.setMinutes(reminderTime.getMinutes() - this.timeBefore);
    return reminderTime;
  }

  shouldSend(eventDate: Date): boolean {
    if (this.sent) return false;
    
    const reminderTime = this.getReminderTime(eventDate);
    const now = new Date();
    
    return now >= reminderTime;
  }

  markAsSent(): void {
    this.sent = true;
    this.sentAt = new Date();
  }

  markAsFailed(error: string): void {
    this.sent = false;
    this.error = error;
  }

  toJSON(): any {
    return {
      ...this,
      readableTimeBefore: this.getReadableTimeBefore(),
    };
  }

  private getReadableTimeBefore(): string {
    if (this.timeBefore < 60) {
      return `${this.timeBefore} minute${this.timeBefore !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(this.timeBefore / 60);
    const minutes = this.timeBefore % 60;
    
    if (hours < 24 && minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    if (hours === 24 && minutes === 0) {
      return '1 day';
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0 && remainingHours === 0 && minutes === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    
    let result = '';
    if (days > 0) result += `${days} day${days !== 1 ? 's' : ''} `;
    if (remainingHours > 0) result += `${remainingHours} hour${remainingHours !== 1 ? 's' : ''} `;
    if (minutes > 0) result += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    return result.trim();
  }
}