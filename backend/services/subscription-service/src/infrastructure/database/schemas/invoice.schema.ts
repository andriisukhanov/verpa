import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InvoiceStatus } from '../../../domain/entities/invoice.entity';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true })
  subscriptionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ 
    required: true, 
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  // Stripe references
  @Prop({ index: true })
  stripeInvoiceId: string;

  // Invoice details
  @Prop({
    type: [{
      description: String,
      quantity: Number,
      unitPrice: {
        amount: Number,
        currency: String,
      },
      amount: {
        amount: Number,
        currency: String,
      },
      taxAmount: {
        amount: Number,
        currency: String,
      },
    }],
    default: [],
  })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: {
      amount: number;
      currency: string;
    };
    amount: {
      amount: number;
      currency: string;
    };
    taxAmount?: {
      amount: number;
      currency: string;
    };
  }>;

  @Prop({
    type: {
      amount: Number,
      currency: String,
    },
    required: true,
  })
  subtotal: {
    amount: number;
    currency: string;
  };

  @Prop({
    type: {
      amount: Number,
      currency: String,
    },
    required: true,
  })
  taxAmount: {
    amount: number;
    currency: string;
  };

  @Prop({
    type: {
      amount: Number,
      currency: String,
    },
    required: true,
  })
  total: {
    amount: number;
    currency: string;
  };

  // Billing period
  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  // Dates
  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidAt: Date;

  @Prop()
  voidedAt: Date;

  // URLs
  @Prop()
  hostedInvoiceUrl: string;

  @Prop()
  invoicePdf: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);