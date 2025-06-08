import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WaterType, AquariumStatus } from '@verpa/common';
import { Equipment, EquipmentSchema } from './equipment.schema';
import { Inhabitant, InhabitantSchema } from './inhabitant.schema';
import { WaterParametersDocument } from './water-parameters.schema';

export type AquariumDocument = Aquarium & Document;

@Schema({
  timestamps: true,
  collection: 'aquariums',
})
export class Aquarium {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: WaterType })
  waterType: WaterType;

  @Prop({ required: true, min: 0 })
  volume: number;

  @Prop({
    type: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
  })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @Prop({ required: true, default: Date.now })
  setupDate: Date;

  @Prop()
  imageUrl?: string;

  @Prop({ required: true, enum: AquariumStatus, default: AquariumStatus.ACTIVE, index: true })
  status: AquariumStatus;

  @Prop({ type: [EquipmentSchema], default: [] })
  equipment: Equipment[];

  @Prop({ type: [InhabitantSchema], default: [] })
  inhabitants: Inhabitant[];

  @Prop({ type: Types.ObjectId, ref: 'WaterParameters' })
  latestParameters?: Types.ObjectId | WaterParametersDocument;

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop()
  notes?: string;

  @Prop({ default: false, index: true })
  isPublic: boolean;

  @Prop({ sparse: true })
  deletedAt?: Date;
}

export const AquariumSchema = SchemaFactory.createForClass(Aquarium);

// Indexes
AquariumSchema.index({ userId: 1, status: 1 });
AquariumSchema.index({ userId: 1, waterType: 1 });
AquariumSchema.index({ tags: 1 });
AquariumSchema.index({ isPublic: 1, status: 1 });
AquariumSchema.index({ createdAt: -1 });
AquariumSchema.index({ updatedAt: -1 });

// Virtual for id
AquariumSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure JSON includes virtuals
AquariumSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Middleware to handle soft delete
AquariumSchema.pre('find', function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ status: { $ne: AquariumStatus.DELETED } });
  }
});

AquariumSchema.pre('findOne', function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ status: { $ne: AquariumStatus.DELETED } });
  }
});

AquariumSchema.pre('findOneAndUpdate', function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ status: { $ne: AquariumStatus.DELETED } });
  }
});