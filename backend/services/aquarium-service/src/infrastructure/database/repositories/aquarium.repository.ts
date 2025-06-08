import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Aquarium } from '../../../domain/entities/aquarium.entity';
import { Equipment } from '../../../domain/entities/equipment.entity';
import { Inhabitant } from '../../../domain/entities/inhabitant.entity';
import { IAquariumRepository, FindAquariumsOptions } from '../../../domain/repositories/aquarium.repository.interface';
import { Aquarium as AquariumSchema, AquariumDocument } from '../schemas/aquarium.schema';
import { WaterParameters } from '../../../domain/entities/water-parameters.entity';
import { WaterParametersDocument } from '../schemas/water-parameters.schema';

@Injectable()
export class AquariumRepository implements IAquariumRepository {
  constructor(
    @InjectModel(AquariumSchema.name) private aquariumModel: Model<AquariumDocument>,
  ) {}

  async create(aquarium: Aquarium): Promise<Aquarium> {
    const created = new this.aquariumModel(this.toDocument(aquarium));
    const saved = await created.save();
    return this.toDomainEntity(saved);
  }

  async findById(id: string): Promise<Aquarium | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.aquariumModel
      .findById(id)
      .populate('latestParameters')
      .exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Aquarium | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.aquariumModel
      .findOne({ _id: id, userId })
      .populate('latestParameters')
      .exec();
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findAll(options: FindAquariumsOptions): Promise<{ aquariums: Aquarium[]; total: number }> {
    const {
      userId,
      waterType,
      isPublic,
      includeDeleted,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const query: any = {};
    if (userId) query.userId = userId;
    if (waterType) query.waterType = waterType;
    if (isPublic !== undefined) query.isPublic = isPublic;

    const findOptions: any = {};
    if (includeDeleted) {
      findOptions.includeDeleted = true;
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.aquariumModel
        .find(query, null, findOptions)
        .populate('latestParameters')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.aquariumModel.countDocuments(query, findOptions),
    ]);

    const aquariums = docs.map(doc => this.toDomainEntity(doc));
    return { aquariums, total };
  }

  async findByUserId(userId: string, includeDeleted: boolean = false): Promise<Aquarium[]> {
    const findOptions: any = {};
    if (includeDeleted) {
      findOptions.includeDeleted = true;
    }

    const docs = await this.aquariumModel
      .find({ userId }, null, findOptions)
      .populate('latestParameters')
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(doc => this.toDomainEntity(doc));
  }

  async update(id: string, aquarium: Partial<Aquarium>): Promise<Aquarium | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData = this.toUpdateDocument(aquarium);
    const updated = await this.aquariumModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('latestParameters')
      .exec();
    return updated ? this.toDomainEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.aquariumModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async restore(id: string): Promise<Aquarium | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const updated = await this.aquariumModel
      .findByIdAndUpdate(
        id,
        { status: 'active', $unset: { deletedAt: 1 } },
        { new: true, includeDeleted: true },
      )
      .populate('latestParameters')
      .exec();
    return updated ? this.toDomainEntity(updated) : null;
  }

  async countByUserId(userId: string): Promise<number> {
    return this.aquariumModel.countDocuments({ userId }).exec();
  }

  async exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const count = await this.aquariumModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  async findPublicAquariums(options: FindAquariumsOptions): Promise<{ aquariums: Aquarium[]; total: number }> {
    return this.findAll({ ...options, isPublic: true });
  }

  private toDomainEntity(doc: AquariumDocument): Aquarium {
    const obj = doc.toJSON();
    
    // Convert equipment
    const equipment = obj.equipment?.map(eq => new Equipment(eq)) || [];
    
    // Convert inhabitants
    const inhabitants = obj.inhabitants?.map(inh => new Inhabitant(inh)) || [];
    
    // Convert latest parameters if populated
    let latestParameters: WaterParameters | undefined;
    if (obj.latestParameters && typeof obj.latestParameters === 'object') {
      const paramsDoc = obj.latestParameters as any;
      latestParameters = new WaterParameters({
        ...paramsDoc,
        aquariumId: paramsDoc.aquariumId?.toString() || obj.id,
      });
    }

    return new Aquarium({
      ...obj,
      equipment,
      inhabitants,
      latestParameters,
    });
  }

  private toDocument(aquarium: Aquarium): any {
    const doc: any = {
      ...aquarium,
      _id: aquarium.id ? new Types.ObjectId(aquarium.id) : new Types.ObjectId(),
    };

    // Remove domain-specific properties
    delete doc.id;

    // Convert equipment
    if (doc.equipment) {
      doc.equipment = doc.equipment.map((eq: Equipment) => ({ ...eq }));
    }

    // Convert inhabitants
    if (doc.inhabitants) {
      doc.inhabitants = doc.inhabitants.map((inh: Inhabitant) => ({ ...inh }));
    }

    // Handle latest parameters reference
    if (doc.latestParameters && doc.latestParameters.id) {
      doc.latestParameters = new Types.ObjectId(doc.latestParameters.id);
    } else {
      delete doc.latestParameters;
    }

    return doc;
  }

  private toUpdateDocument(aquarium: Partial<Aquarium>): any {
    const doc: any = { ...aquarium };

    // Remove properties that shouldn't be updated directly
    delete doc.id;
    delete doc._id;
    delete doc.createdAt;

    // Convert equipment if present
    if (doc.equipment) {
      doc.equipment = doc.equipment.map((eq: Equipment) => ({ ...eq }));
    }

    // Convert inhabitants if present
    if (doc.inhabitants) {
      doc.inhabitants = doc.inhabitants.map((inh: Inhabitant) => ({ ...inh }));
    }

    // Handle latest parameters reference
    if (doc.latestParameters && doc.latestParameters.id) {
      doc.latestParameters = new Types.ObjectId(doc.latestParameters.id);
    }

    return doc;
  }
}