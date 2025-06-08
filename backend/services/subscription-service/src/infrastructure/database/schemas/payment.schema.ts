import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentStatus, PaymentMethod } from '../../../domain/entities/payment.entity';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  subscriptionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    type: {
      amount: Number,
      currency: String,
    },
    required: true,
  })
  amount: {
    amount: number;
    currency: string;
  };

  @Prop({ 
    required: true, 
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Prop({ 
    required: true, 
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  // Stripe references
  @Prop({ index: true })
  stripePaymentIntentId: string;

  @Prop()
  stripeInvoiceId: string;

  @Prop()
  stripeChargeId: string;

  // Payment details
  @Prop({ required: true })
  description: string;

  @Prop()
  statementDescriptor: string;

  @Prop()
  receiptUrl: string;

  // Failure information
  @Prop()
  failureReason: string;

  @Prop()
  failureCode: string;

  // Refund information
  @Prop({
    type: {
      amount: Number,
      currency: String,
    },
  })
  refundedAmount: {
    amount: number;
    currency: string;
  };

  @Prop()
  refundReason: string;

  @Prop()
  paidAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);