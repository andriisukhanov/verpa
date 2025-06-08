import { Types } from 'mongoose';
import { InhabitantType } from '@verpa/common';

export class Inhabitant {
  id: string;
  name: string;
  type: InhabitantType;
  species: string;
  scientificName?: string;
  quantity: number;
  size: 'small' | 'medium' | 'large';
  temperatureMin: number;
  temperatureMax: number;
  phMin: number;
  phMax: number;
  careLevel: 'easy' | 'moderate' | 'difficult';
  diet?: string;
  compatibility?: string[];
  addedDate: Date;
  notes?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Inhabitant>) {
    Object.assign(this, partial);
    this.id = this.id || new Types.ObjectId().toHexString();
    this.quantity = this.quantity || 1;
    this.addedDate = this.addedDate || new Date();
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  // Domain methods
  isCompatibleWithTemperature(temperature: number): boolean {
    return temperature >= this.temperatureMin && temperature <= this.temperatureMax;
  }

  isCompatibleWithPh(ph: number): boolean {
    return ph >= this.phMin && ph <= this.phMax;
  }

  isCompatibleWithSpecies(species: string): boolean {
    if (!this.compatibility || this.compatibility.length === 0) {
      return true; // Unknown compatibility
    }
    return this.compatibility.includes(species);
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    this.quantity = newQuantity;
    this.updatedAt = new Date();
  }

  addIndividuals(count: number): void {
    if (count <= 0) {
      throw new Error('Count must be positive');
    }
    this.quantity += count;
    this.updatedAt = new Date();
  }

  removeIndividuals(count: number): void {
    if (count <= 0) {
      throw new Error('Count must be positive');
    }
    if (count > this.quantity) {
      throw new Error('Cannot remove more individuals than exist');
    }
    this.quantity -= count;
    this.updatedAt = new Date();
  }

  getAgeInDays(): number {
    return Math.floor((Date.now() - this.addedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  getBioload(): number {
    // Calculate bioload based on size and quantity
    const sizeFactors = {
      small: 1,
      medium: 3,
      large: 5,
    };
    return this.quantity * sizeFactors[this.size];
  }

  getCareLevelScore(): number {
    const scores = {
      easy: 1,
      moderate: 2,
      difficult: 3,
    };
    return scores[this.careLevel];
  }

  toJSON(): any {
    return {
      ...this,
      ageInDays: this.getAgeInDays(),
      bioload: this.getBioload(),
    };
  }
}