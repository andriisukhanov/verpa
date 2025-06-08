import { Price } from '../value-objects/price.value-object';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  UNCOLLECTIBLE = 'uncollectible',
  VOID = 'void',
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: Price;
  amount: Price;
  taxAmount?: Price;
}

export class Invoice {
  id: string;
  subscriptionId: string;
  userId: string;
  number: string;
  status: InvoiceStatus;
  
  // Stripe references
  stripeInvoiceId?: string;
  
  // Invoice details
  lineItems: InvoiceLineItem[];
  subtotal: Price;
  taxAmount: Price;
  total: Price;
  
  // Billing period
  periodStart: Date;
  periodEnd: Date;
  
  // Dates
  dueDate: Date;
  paidAt?: Date;
  voidedAt?: Date;
  
  // URLs
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Invoice>) {
    Object.assign(this, partial);
    this.lineItems = this.lineItems || [];
    this.metadata = this.metadata || {};
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
  }

  static create(data: {
    subscriptionId: string;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
  }): Invoice {
    return new Invoice({
      ...data,
      status: InvoiceStatus.DRAFT,
      number: `INV-${Date.now()}`,
      lineItems: [],
      subtotal: new Price(0, 'usd'),
      taxAmount: new Price(0, 'usd'),
      total: new Price(0, 'usd'),
    });
  }

  addLineItem(item: InvoiceLineItem): void {
    this.lineItems.push(item);
    this.recalculateTotals();
  }

  removeLineItem(index: number): void {
    this.lineItems.splice(index, 1);
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    const subtotal = this.lineItems.reduce(
      (sum, item) => sum + item.amount.amount,
      0,
    );
    
    const taxAmount = this.lineItems.reduce(
      (sum, item) => sum + (item.taxAmount?.amount || 0),
      0,
    );
    
    this.subtotal = new Price(subtotal, 'usd');
    this.taxAmount = new Price(taxAmount, 'usd');
    this.total = new Price(subtotal + taxAmount, 'usd');
    this.updatedAt = new Date();
  }

  finalize(): void {
    if (this.status !== InvoiceStatus.DRAFT) {
      throw new Error('Can only finalize draft invoices');
    }
    
    if (this.lineItems.length === 0) {
      throw new Error('Cannot finalize invoice with no line items');
    }
    
    this.status = InvoiceStatus.OPEN;
    this.updatedAt = new Date();
  }

  markAsPaid(paidAt: Date = new Date()): void {
    if (this.status !== InvoiceStatus.OPEN) {
      throw new Error('Can only mark open invoices as paid');
    }
    
    this.status = InvoiceStatus.PAID;
    this.paidAt = paidAt;
    this.updatedAt = new Date();
  }

  void(): void {
    if ([InvoiceStatus.PAID, InvoiceStatus.VOID].includes(this.status)) {
      throw new Error('Cannot void paid or already voided invoices');
    }
    
    this.status = InvoiceStatus.VOID;
    this.voidedAt = new Date();
    this.updatedAt = new Date();
  }

  markAsUncollectible(): void {
    if (this.status !== InvoiceStatus.OPEN) {
      throw new Error('Can only mark open invoices as uncollectible');
    }
    
    this.status = InvoiceStatus.UNCOLLECTIBLE;
    this.updatedAt = new Date();
  }

  isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  isOpen(): boolean {
    return this.status === InvoiceStatus.OPEN;
  }

  isDraft(): boolean {
    return this.status === InvoiceStatus.DRAFT;
  }
}