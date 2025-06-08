import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EquipmentType, EquipmentStatus } from '@verpa/common';

@Schema({ _id: false })
export class Equipment {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: EquipmentType })
  type: EquipmentType;

  @Prop()
  brand?: string;

  @Prop()
  model?: string;

  @Prop()
  purchaseDate?: Date;

  @Prop({ required: true, default: Date.now })
  installDate: Date;

  @Prop()
  lastMaintenanceDate?: Date;

  @Prop()
  nextMaintenanceDate?: Date;

  @Prop({ required: true, enum: EquipmentStatus, default: EquipmentStatus.ACTIVE })
  status: EquipmentStatus;

  @Prop()
  notes?: string;

  @Prop({ type: Object })
  specifications?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);