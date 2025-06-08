import { Types } from 'mongoose';

export class WaterParameters {
  id: string;
  aquariumId: string;
  temperature: number; // Celsius
  ph: number;
  ammonia?: number; // ppm
  nitrite?: number; // ppm
  nitrate?: number; // ppm
  phosphate?: number; // ppm
  kh?: number; // dKH
  gh?: number; // dGH
  calcium?: number; // ppm (for saltwater)
  magnesium?: number; // ppm (for saltwater)
  alkalinity?: number; // dKH (for saltwater)
  salinity?: number; // ppt (for saltwater)
  tds?: number; // ppm
  co2?: number; // ppm
  oxygen?: number; // mg/L
  recordedAt: Date;
  recordedBy?: string;
  notes?: string;
  lastWaterChange?: Date;
  waterChangePercentage?: number;
  createdAt: Date;

  constructor(partial: Partial<WaterParameters>) {
    Object.assign(this, partial);
    this.id = this.id || new Types.ObjectId().toHexString();
    this.recordedAt = this.recordedAt || new Date();
    this.createdAt = this.createdAt || new Date();
  }

  // Domain methods
  isTemperatureOptimal(min: number, max: number): boolean {
    return this.temperature >= min && this.temperature <= max;
  }

  isPhOptimal(min: number, max: number): boolean {
    return this.ph >= min && this.ph <= max;
  }

  hasHighAmmonia(): boolean {
    return (this.ammonia || 0) > 0.25;
  }

  hasHighNitrite(): boolean {
    return (this.nitrite || 0) > 0.25;
  }

  hasHighNitrate(): boolean {
    return (this.nitrate || 0) > 40;
  }

  isCycled(): boolean {
    return (
      (this.ammonia || 0) === 0 &&
      (this.nitrite || 0) === 0 &&
      (this.nitrate || 0) > 0
    );
  }

  needsWaterChange(): boolean {
    return this.hasHighNitrate() || this.hasHighAmmonia() || this.hasHighNitrite();
  }

  getDaysSinceWaterChange(): number | null {
    if (!this.lastWaterChange) return null;
    return Math.floor((Date.now() - this.lastWaterChange.getTime()) / (1000 * 60 * 60 * 24));
  }

  getParameterStatus(parameter: string, value: number): 'optimal' | 'warning' | 'critical' {
    const ranges = {
      temperature: { optimal: [22, 28], warning: [18, 32], critical: [0, 50] },
      ph: { optimal: [6.8, 7.8], warning: [6.0, 8.5], critical: [4.0, 10.0] },
      ammonia: { optimal: [0, 0], warning: [0.01, 0.25], critical: [0.26, 10] },
      nitrite: { optimal: [0, 0], warning: [0.01, 0.25], critical: [0.26, 10] },
      nitrate: { optimal: [0, 20], warning: [21, 40], critical: [41, 200] },
      phosphate: { optimal: [0, 0.1], warning: [0.11, 1], critical: [1.01, 10] },
      kh: { optimal: [4, 8], warning: [2, 12], critical: [0, 20] },
      gh: { optimal: [4, 12], warning: [2, 18], critical: [0, 30] },
    };

    const range = ranges[parameter];
    if (!range) return 'optimal';

    if (value >= range.optimal[0] && value <= range.optimal[1]) {
      return 'optimal';
    } else if (value >= range.warning[0] && value <= range.warning[1]) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  getAllParameterStatuses(): Record<string, 'optimal' | 'warning' | 'critical'> {
    const statuses: Record<string, 'optimal' | 'warning' | 'critical'> = {};
    
    statuses.temperature = this.getParameterStatus('temperature', this.temperature);
    statuses.ph = this.getParameterStatus('ph', this.ph);
    
    if (this.ammonia !== undefined) {
      statuses.ammonia = this.getParameterStatus('ammonia', this.ammonia);
    }
    if (this.nitrite !== undefined) {
      statuses.nitrite = this.getParameterStatus('nitrite', this.nitrite);
    }
    if (this.nitrate !== undefined) {
      statuses.nitrate = this.getParameterStatus('nitrate', this.nitrate);
    }
    if (this.phosphate !== undefined) {
      statuses.phosphate = this.getParameterStatus('phosphate', this.phosphate);
    }
    if (this.kh !== undefined) {
      statuses.kh = this.getParameterStatus('kh', this.kh);
    }
    if (this.gh !== undefined) {
      statuses.gh = this.getParameterStatus('gh', this.gh);
    }

    return statuses;
  }

  getOverallStatus(): 'optimal' | 'warning' | 'critical' {
    const statuses = Object.values(this.getAllParameterStatuses());
    
    if (statuses.some(s => s === 'critical')) {
      return 'critical';
    } else if (statuses.some(s => s === 'warning')) {
      return 'warning';
    } else {
      return 'optimal';
    }
  }

  toJSON(): any {
    return {
      ...this,
      daysSinceWaterChange: this.getDaysSinceWaterChange(),
      overallStatus: this.getOverallStatus(),
      parameterStatuses: this.getAllParameterStatuses(),
    };
  }
}