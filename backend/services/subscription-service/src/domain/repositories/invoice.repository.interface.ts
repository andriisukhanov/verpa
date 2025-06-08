import { Invoice, InvoiceStatus } from '../entities/invoice.entity';

export interface IInvoiceRepository {
  create(invoice: Invoice): Promise<Invoice>;
  update(id: string, invoice: Partial<Invoice>): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findByNumber(number: string): Promise<Invoice | null>;
  findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null>;
  findBySubscriptionId(subscriptionId: string, limit?: number, offset?: number): Promise<Invoice[]>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Invoice[]>;
  findByStatus(status: InvoiceStatus, limit?: number): Promise<Invoice[]>;
  findOverdue(daysOverdue: number): Promise<Invoice[]>;
  
  // Invoice generation
  getNextInvoiceNumber(): Promise<string>;
}