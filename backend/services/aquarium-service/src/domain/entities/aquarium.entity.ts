import { Types } from 'mongoose';
import { WaterType, AquariumStatus } from '@verpa/common';
import { Equipment } from './equipment.entity';
import { Inhabitant } from './inhabitant.entity';
import { WaterParameters } from './water-parameters.entity';

export class Aquarium {
  id: string;
  userId: string;
  name: string;
  description?: string;
  waterType: WaterType;
  volume: number; // in liters
  dimensions?: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  setupDate: Date;
  imageUrl?: string;
  status: AquariumStatus;
  equipment: Equipment[];
  inhabitants: Inhabitant[];
  latestParameters?: WaterParameters;
  tags: string[];
  notes?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  constructor(partial: Partial<Aquarium>) {
    Object.assign(this, partial);
    this.id = this.id || new Types.ObjectId().toHexString();
    this.status = this.status || AquariumStatus.ACTIVE;
    this.equipment = this.equipment || [];
    this.inhabitants = this.inhabitants || [];
    this.tags = this.tags || [];
    this.isPublic = this.isPublic ?? false;
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  // Domain methods
  addEquipment(equipment: Equipment): void {
    if (this.equipment.some(e => e.id === equipment.id)) {
      throw new Error('Equipment already exists in aquarium');
    }
    this.equipment.push(equipment);
    this.updatedAt = new Date();
  }

  removeEquipment(equipmentId: string): void {
    const index = this.equipment.findIndex(e => e.id === equipmentId);
    if (index === -1) {
      throw new Error('Equipment not found in aquarium');
    }
    this.equipment.splice(index, 1);
    this.updatedAt = new Date();
  }

  updateEquipment(equipmentId: string, updates: Partial<Equipment>): void {
    const equipment = this.equipment.find(e => e.id === equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found in aquarium');
    }
    Object.assign(equipment, updates);
    this.updatedAt = new Date();
  }

  addInhabitant(inhabitant: Inhabitant): void {
    if (this.inhabitants.some(i => i.id === inhabitant.id)) {
      throw new Error('Inhabitant already exists in aquarium');
    }
    this.inhabitants.push(inhabitant);
    this.updatedAt = new Date();
  }

  removeInhabitant(inhabitantId: string): void {
    const index = this.inhabitants.findIndex(i => i.id === inhabitantId);
    if (index === -1) {
      throw new Error('Inhabitant not found in aquarium');
    }
    this.inhabitants.splice(index, 1);
    this.updatedAt = new Date();
  }

  updateInhabitant(inhabitantId: string, updates: Partial<Inhabitant>): void {
    const inhabitant = this.inhabitants.find(i => i.id === inhabitantId);
    if (!inhabitant) {
      throw new Error('Inhabitant not found in aquarium');
    }
    Object.assign(inhabitant, updates);
    this.updatedAt = new Date();
  }

  updateWaterParameters(parameters: WaterParameters): void {
    this.latestParameters = parameters;
    this.updatedAt = new Date();
  }

  calculateTotalInhabitants(): number {
    return this.inhabitants.reduce((total, inhabitant) => total + inhabitant.quantity, 0);
  }

  calculateBioload(): number {
    // Simple bioload calculation based on inhabitants
    return this.inhabitants.reduce((total, inhabitant) => {
      const sizeFactor = inhabitant.size === 'small' ? 1 : inhabitant.size === 'medium' ? 3 : 5;
      return total + (inhabitant.quantity * sizeFactor);
    }, 0);
  }

  isOverstocked(): boolean {
    const bioload = this.calculateBioload();
    const maxBioload = this.volume * 0.5; // Simple rule: 0.5 bioload per liter
    return bioload > maxBioload;
  }

  needsWaterChange(): boolean {
    if (!this.latestParameters) return false;
    
    const daysSinceLastChange = this.latestParameters.lastWaterChange
      ? Math.floor((Date.now() - this.latestParameters.lastWaterChange.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Need water change if:
    // - More than 7 days since last change
    // - High nitrates
    // - High ammonia or nitrites
    return (
      daysSinceLastChange > 7 ||
      (this.latestParameters.nitrate || 0) > 40 ||
      (this.latestParameters.ammonia || 0) > 0.25 ||
      (this.latestParameters.nitrite || 0) > 0.25
    );
  }

  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (!this.latestParameters) return 'warning';

    const params = this.latestParameters;
    
    // Critical conditions
    if (
      (params.ammonia || 0) > 1 ||
      (params.nitrite || 0) > 1 ||
      params.ph < 6 || params.ph > 9 ||
      params.temperature < 15 || params.temperature > 35
    ) {
      return 'critical';
    }

    // Warning conditions
    if (
      (params.ammonia || 0) > 0.25 ||
      (params.nitrite || 0) > 0.25 ||
      (params.nitrate || 0) > 40 ||
      params.ph < 6.5 || params.ph > 8.5 ||
      params.temperature < 20 || params.temperature > 30 ||
      this.isOverstocked() ||
      this.needsWaterChange()
    ) {
      return 'warning';
    }

    return 'healthy';
  }

  markAsDeleted(): void {
    this.status = AquariumStatus.DELETED;
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    if (this.status !== AquariumStatus.DELETED) {
      throw new Error('Aquarium is not deleted');
    }
    this.status = AquariumStatus.ACTIVE;
    this.deletedAt = undefined;
    this.updatedAt = new Date();
  }

  toJSON(): any {
    const obj = { ...this };
    if (obj.deletedAt && obj.status === AquariumStatus.DELETED) {
      return null;
    }
    return obj;
  }
}