import { Aquarium } from '../entities/aquarium.entity';
import { WaterType } from '@verpa/common';

export interface FindAquariumsOptions {
  userId?: string;
  waterType?: WaterType;
  isPublic?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IAquariumRepository {
  create(aquarium: Aquarium): Promise<Aquarium>;
  findById(id: string): Promise<Aquarium | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Aquarium | null>;
  findAll(options: FindAquariumsOptions): Promise<{ aquariums: Aquarium[]; total: number }>;
  findByUserId(userId: string, includeDeleted?: boolean): Promise<Aquarium[]>;
  update(id: string, aquarium: Partial<Aquarium>): Promise<Aquarium | null>;
  delete(id: string): Promise<boolean>;
  restore(id: string): Promise<Aquarium | null>;
  countByUserId(userId: string): Promise<number>;
  exists(id: string): Promise<boolean>;
  findPublicAquariums(options: FindAquariumsOptions): Promise<{ aquariums: Aquarium[]; total: number }>;
}