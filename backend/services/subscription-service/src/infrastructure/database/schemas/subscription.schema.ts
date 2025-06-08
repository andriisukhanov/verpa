import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubscriptionStatus, SubscriptionFeatures } from '../../../domain/entities/subscription.entity';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ 
    required: true, 
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Prop({ type: Object, required: true })
  features: SubscriptionFeatures;

  @Prop({
    type: {
      startDate: Date,
      endDate: Date,
    },
    required: true,
  })
  currentPeriod: {
    startDate: Date;
    endDate: Date;
  };

  // Stripe references
  @Prop()
  stripeCustomerId: string;

  @Prop({ index: true })
  stripeSubscriptionId: string;

  @Prop()
  stripePriceId: string;

  // Trial information
  @Prop()
  trialEnd: Date;

  @Prop({ default: false })
  isTrialing: boolean;

  // Billing
  @Prop()
  nextBillingDate: Date;

  @Prop()
  canceledAt: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  // Usage tracking
  @Prop({
    type: {
      aquariumsCount: Number,
      photosCount: Number,
      lastUpdated: Date,
    },
    default: {
      aquariumsCount: 0,
      photosCount: 0,
      lastUpdated: new Date(),
    },
  })
  usage: {
    aquariumsCount: number;
    photosCount: number;
    lastUpdated: Date;
  };

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);