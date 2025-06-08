export class BillingPeriod {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  isActive(): boolean {
    const now = new Date();
    return now >= this.startDate && now < this.endDate;
  }

  getDaysRemaining(): number {
    const now = new Date();
    if (now >= this.endDate) return 0;
    
    const diffTime = this.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  overlaps(other: BillingPeriod): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  toJSON() {
    return {
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    };
  }
}