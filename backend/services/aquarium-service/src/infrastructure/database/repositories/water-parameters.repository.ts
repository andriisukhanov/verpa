import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WaterParameters } from '../../../domain/entities/water-parameters.entity';
import { IWaterParametersRepository, FindParametersOptions } from '../../../domain/repositories/water-parameters.repository.interface';
import { WaterParameters as WaterParametersSchema, WaterParametersDocument } from '../schemas/water-parameters.schema';

@Injectable()
export class WaterParametersRepository implements IWaterParametersRepository {
  constructor(
    @InjectModel(WaterParametersSchema.name) private parametersModel: Model<WaterParametersDocument>,
  ) {}

  async create(parameters: WaterParameters): Promise<WaterParameters> {
    const created = new this.parametersModel(this.toDocument(parameters));
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async findById(id: string): Promise<WaterParameters | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.parametersModel.findById(id).exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findByAquariumId(
    aquariumId: string,
    options: FindParametersOptions = {},
  ): Promise<WaterParameters[]> {
    const { from, to, limit = 100, sortOrder = 'desc' } = options;

    const query: any = { aquariumId: new Types.ObjectId(aquariumId) };
    if (from || to) {
      query.recordedAt = {};
      if (from) query.recordedAt.$gte = from;
      if (to) query.recordedAt.$lte = to;
    }

    const docs = await this.parametersModel
      .find(query)
      .sort({ recordedAt: sortOrder === 'asc' ? 1 : -1 })
      .limit(limit)
      .exec();

    return docs.map(doc => this.toDomainEntity(doc));
  }

  async findLatestByAquariumId(aquariumId: string): Promise<WaterParameters | null> {
    const doc = await this.parametersModel
      .findOne({ aquariumId: new Types.ObjectId(aquariumId) })
      .sort({ recordedAt: -1 })
      .exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async update(id: string, parameters: Partial<WaterParameters>): Promise<WaterParameters | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const updated = await this.parametersModel
      .findByIdAndUpdate(id, this.toUpdateDocument(parameters), { new: true })
      .exec();
    return updated ? this.toDomainEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.parametersModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async deleteByAquariumId(aquariumId: string): Promise<number> {
    const result = await this.parametersModel
      .deleteMany({ aquariumId: new Types.ObjectId(aquariumId) })
      .exec();
    return result.deletedCount;
  }

  async getAverageParameters(
    aquariumId: string,
    from: Date,
    to: Date,
  ): Promise<Partial<WaterParameters>> {
    const result = await this.parametersModel.aggregate([
      {
        $match: {
          aquariumId: new Types.ObjectId(aquariumId),
          recordedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$temperature' },
          avgPh: { $avg: '$ph' },
          avgAmmonia: { $avg: { $ifNull: ['$ammonia', null] } },
          avgNitrite: { $avg: { $ifNull: ['$nitrite', null] } },
          avgNitrate: { $avg: { $ifNull: ['$nitrate', null] } },
          avgPhosphate: { $avg: { $ifNull: ['$phosphate', null] } },
          avgKh: { $avg: { $ifNull: ['$kh', null] } },
          avgGh: { $avg: { $ifNull: ['$gh', null] } },
          count: { $sum: 1 },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return {};
    }

    const avg = result[0];
    return {
      temperature: avg.avgTemperature,
      ph: avg.avgPh,
      ammonia: avg.avgAmmonia,
      nitrite: avg.avgNitrite,
      nitrate: avg.avgNitrate,
      phosphate: avg.avgPhosphate,
      kh: avg.avgKh,
      gh: avg.avgGh,
    };
  }

  async getParameterTrends(aquariumId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.parametersModel.aggregate([
      {
        $match: {
          aquariumId: new Types.ObjectId(aquariumId),
          recordedAt: { $gte: startDate },
        },
      },
      {
        $sort: { recordedAt: 1 },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$recordedAt',
            },
          },
          avgTemperature: { $avg: '$temperature' },
          avgPh: { $avg: '$ph' },
          avgAmmonia: { $avg: { $ifNull: ['$ammonia', 0] } },
          avgNitrite: { $avg: { $ifNull: ['$nitrite', 0] } },
          avgNitrate: { $avg: { $ifNull: ['$nitrate', 0] } },
          minTemperature: { $min: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          minPh: { $min: '$ph' },
          maxPh: { $max: '$ph' },
          readings: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return {
      days: result.map(r => r._id),
      temperature: {
        avg: result.map(r => r.avgTemperature),
        min: result.map(r => r.minTemperature),
        max: result.map(r => r.maxTemperature),
      },
      ph: {
        avg: result.map(r => r.avgPh),
        min: result.map(r => r.minPh),
        max: result.map(r => r.maxPh),
      },
      ammonia: result.map(r => r.avgAmmonia),
      nitrite: result.map(r => r.avgNitrite),
      nitrate: result.map(r => r.avgNitrate),
      readings: result.map(r => r.readings),
    };
  }

  private toDomainEntity(doc: WaterParametersDocument): WaterParameters {
    const obj = doc.toJSON();
    return new WaterParameters({
      ...obj,
      aquariumId: obj.aquariumId?.toString(),
    });
  }

  private toDocument(parameters: WaterParameters): any {
    const doc: any = {
      ...parameters,
      aquariumId: new Types.ObjectId(parameters.aquariumId),
    };

    if (parameters.id) {
      doc._id = new Types.ObjectId(parameters.id);
    }

    delete doc.id;
    return doc;
  }

  private toUpdateDocument(parameters: Partial<WaterParameters>): any {
    const doc: any = { ...parameters };
    
    delete doc.id;
    delete doc._id;
    delete doc.createdAt;

    if (doc.aquariumId) {
      doc.aquariumId = new Types.ObjectId(doc.aquariumId);
    }

    return doc;
  }
}