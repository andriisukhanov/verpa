import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { InhabitantType } from '@verpa/common';

@Schema({ _id: false })
export class Inhabitant {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: InhabitantType })
  type: InhabitantType;

  @Prop({ required: true })
  species: string;

  @Prop()
  scientificName?: string;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ required: true, enum: ['small', 'medium', 'large'] })
  size: 'small' | 'medium' | 'large';

  @Prop({ required: true })
  temperatureMin: number;

  @Prop({ required: true })
  temperatureMax: number;

  @Prop({ required: true })
  phMin: number;

  @Prop({ required: true })
  phMax: number;

  @Prop({ required: true, enum: ['easy', 'moderate', 'difficult'] })
  careLevel: 'easy' | 'moderate' | 'difficult';

  @Prop()
  diet?: string;

  @Prop({ type: [String] })
  compatibility?: string[];

  @Prop({ required: true, default: Date.now })
  addedDate: Date;

  @Prop()
  notes?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InhabitantSchema = SchemaFactory.createForClass(Inhabitant);