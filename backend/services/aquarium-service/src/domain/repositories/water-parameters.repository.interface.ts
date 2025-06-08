import { WaterParameters } from '../entities/water-parameters.entity';

export interface FindParametersOptions {
  aquariumId: string;
  from?: Date;
  to?: Date;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface IWaterParametersRepository {
  create(parameters: WaterParameters): Promise<WaterParameters>;
  findById(id: string): Promise<WaterParameters | null>;
  findByAquariumId(aquariumId: string, options?: FindParametersOptions): Promise<WaterParameters[]>;
  findLatestByAquariumId(aquariumId: string): Promise<WaterParameters | null>;
  update(id: string, parameters: Partial<WaterParameters>): Promise<WaterParameters | null>;
  delete(id: string): Promise<boolean>;
  deleteByAquariumId(aquariumId: string): Promise<number>;
  getAverageParameters(aquariumId: string, from: Date, to: Date): Promise<Partial<WaterParameters>>;
  getParameterTrends(aquariumId: string, days: number): Promise<any>;
}