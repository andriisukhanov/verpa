import { Price } from '../value-objects/price.value-object';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
}

export class Payment {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: Price;
  status: PaymentStatus;
  method: PaymentMethod;
  
  // Stripe references
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  
  // Payment details
  description: string;
  statementDescriptor?: string;
  receiptUrl?: string;
  
  // Failure information
  failureReason?: string;
  failureCode?: string;
  
  // Refund information
  refundedAmount?: Price;
  refundReason?: string;
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;

  constructor(partial: Partial<Payment>) {
    Object.assign(this, partial);
    this.metadata = this.metadata || {};
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  static create(data: {
    subscriptionId: string;
    userId: string;
    amount: Price;
    method: PaymentMethod;
    description: string;
  }): Payment {
    return new Payment({
      ...data,
      status: PaymentStatus.PENDING,
    });
  }

  markAsProcessing(): void {
    this.status = PaymentStatus.PROCESSING;
    this.updatedAt = new Date();
  }

  markAsSucceeded(stripeChargeId: string, receiptUrl?: string): void {
    this.status = PaymentStatus.SUCCEEDED;
    this.stripeChargeId = stripeChargeId;
    this.receiptUrl = receiptUrl;
    this.paidAt = new Date();
    this.updatedAt = new Date();
  }

  markAsFailed(reason: string, code?: string): void {
    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
    this.failureCode = code;
    this.updatedAt = new Date();
  }

  refund(amount: Price, reason: string): void {
    if (this.status !== PaymentStatus.SUCCEEDED) {
      throw new Error('Can only refund succeeded payments');
    }

    if (amount.amount > this.amount.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const currentRefunded = this.refundedAmount?.amount || 0;
    const newRefundedAmount = currentRefunded + amount.amount;

    if (newRefundedAmount > this.amount.amount) {
      throw new Error('Total refunded amount cannot exceed payment amount');
    }

    this.refundedAmount = new Price(newRefundedAmount, this.amount.currency);
    this.refundReason = reason;
    
    if (newRefundedAmount === this.amount.amount) {
      this.status = PaymentStatus.REFUNDED;
    } else {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }
    
    this.updatedAt = new Date();
  }

  isSuccessful(): boolean {
    return this.status === PaymentStatus.SUCCEEDED;
  }

  isPending(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this.status);
  }

  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }
}