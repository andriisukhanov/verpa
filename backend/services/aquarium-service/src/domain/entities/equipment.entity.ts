import { Types } from 'mongoose';
import { EquipmentType, EquipmentStatus } from '@verpa/common';

export class Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  brand?: string;
  model?: string;
  purchaseDate?: Date;
  installDate: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  status: EquipmentStatus;
  notes?: string;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Equipment>) {
    Object.assign(this, partial);
    this.id = this.id || new Types.ObjectId().toHexString();
    this.status = this.status || EquipmentStatus.ACTIVE;
    this.installDate = this.installDate || new Date();
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  // Domain methods
  needsMaintenance(): boolean {
    if (!this.nextMaintenanceDate) return false;
    return new Date() >= this.nextMaintenanceDate;
  }

  performMaintenance(notes?: string): void {
    this.lastMaintenanceDate = new Date();
    
    // Set next maintenance date based on equipment type
    const maintenanceIntervals: Record<EquipmentType, number> = {
      [EquipmentType.FILTER]: 30, // days
      [EquipmentType.HEATER]: 180,
      [EquipmentType.LIGHT]: 365,
      [EquipmentType.PUMP]: 90,
      [EquipmentType.SKIMMER]: 30,
      [EquipmentType.CO2]: 30,
      [EquipmentType.DOSER]: 60,
      [EquipmentType.CHILLER]: 180,
      [EquipmentType.UV_STERILIZER]: 365,
      [EquipmentType.WAVE_MAKER]: 90,
      [EquipmentType.AUTO_FEEDER]: 30,
      [EquipmentType.MONITORING]: 90,
      [EquipmentType.OTHER]: 90,
    };

    const intervalDays = maintenanceIntervals[this.type] || 90;
    this.nextMaintenanceDate = new Date();
    this.nextMaintenanceDate.setDate(this.nextMaintenanceDate.getDate() + intervalDays);

    if (notes) {
      this.notes = `${this.notes ? this.notes + '\n' : ''}Maintenance ${new Date().toISOString()}: ${notes}`;
    }

    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = EquipmentStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = EquipmentStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  markAsFaulty(notes?: string): void {
    this.status = EquipmentStatus.FAULTY;
    if (notes) {
      this.notes = `${this.notes ? this.notes + '\n' : ''}Fault reported ${new Date().toISOString()}: ${notes}`;
    }
    this.updatedAt = new Date();
  }

  getAge(): number {
    const startDate = this.purchaseDate || this.installDate;
    return Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  isUnderWarranty(warrantyDays: number = 365): boolean {
    if (!this.purchaseDate) return false;
    const age = Math.floor((Date.now() - this.purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    return age <= warrantyDays;
  }
}