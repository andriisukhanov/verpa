import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WaterParametersDocument = WaterParameters & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'waterparameters',
})
export class WaterParameters {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Aquarium', index: true })
  aquariumId: Types.ObjectId;

  @Prop({ required: true })
  temperature: number;

  @Prop({ required: true, min: 0, max: 14 })
  ph: number;

  @Prop({ min: 0 })
  ammonia?: number;

  @Prop({ min: 0 })
  nitrite?: number;

  @Prop({ min: 0 })
  nitrate?: number;

  @Prop({ min: 0 })
  phosphate?: number;

  @Prop({ min: 0 })
  kh?: number;

  @Prop({ min: 0 })
  gh?: number;

  @Prop({ min: 0 })
  calcium?: number;

  @Prop({ min: 0 })
  magnesium?: number;

  @Prop({ min: 0 })
  alkalinity?: number;

  @Prop({ min: 0, max: 50 })
  salinity?: number;

  @Prop({ min: 0 })
  tds?: number;

  @Prop({ min: 0 })
  co2?: number;

  @Prop({ min: 0 })
  oxygen?: number;

  @Prop({ required: true, default: Date.now, index: true })
  recordedAt: Date;

  @Prop({ index: true })
  recordedBy?: string;

  @Prop()
  notes?: string;

  @Prop()
  lastWaterChange?: Date;

  @Prop({ min: 0, max: 100 })
  waterChangePercentage?: number;
}

export const WaterParametersSchema = SchemaFactory.createForClass(WaterParameters);

// Indexes
WaterParametersSchema.index({ aquariumId: 1, recordedAt: -1 });
WaterParametersSchema.index({ aquariumId: 1, createdAt: -1 });

// Virtual for id
WaterParametersSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure JSON includes virtuals
WaterParametersSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    if (ret.aquariumId) {
      ret.aquariumId = ret.aquariumId.toString();
    }
    return ret;
  },
});