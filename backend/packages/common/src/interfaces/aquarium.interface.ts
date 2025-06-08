import { WaterType } from '../enums';

export interface IAquarium {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  waterType: WaterType;
  volume: number; // in liters
  volumeUnit: 'liters' | 'gallons';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inches';
  };
  setupDate: Date;
  mainPhoto?: string;
  photos: string[];
  equipment: IEquipment[];
  inhabitants: IInhabitant[];
  waterParameters?: IWaterParameters;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IEquipment {
  _id: string;
  name: string;
  type: 'filter' | 'heater' | 'light' | 'pump' | 'co2' | 'other';
  brand?: string;
  model?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  notes?: string;
}

export interface IInhabitant {
  _id: string;
  type: 'fish' | 'plant' | 'coral' | 'invertebrate' | 'other';
  species: string;
  commonName?: string;
  quantity: number;
  addedDate: Date;
  notes?: string;
  photo?: string;
}

export interface IWaterParameters {
  temperature?: number;
  ph?: number;
  ammonia?: number;
  nitrite?: number;
  nitrate?: number;
  phosphate?: number;
  kh?: number;
  gh?: number;
  salinity?: number;
  tds?: number;
  lastUpdated: Date;
}