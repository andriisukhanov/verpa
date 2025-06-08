import { Payment, PaymentStatus } from '../entities/payment.entity';

export interface IPaymentRepository {
  create(payment: Payment): Promise<Payment>;
  update(id: string, payment: Partial<Payment>): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByStripePaymentIntentId(paymentIntentId: string): Promise<Payment | null>;
  findBySubscriptionId(subscriptionId: string, limit?: number, offset?: number): Promise<Payment[]>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Payment[]>;
  findByStatus(status: PaymentStatus, limit?: number): Promise<Payment[]>;
  
  // Analytics
  getTotalRevenue(startDate: Date, endDate: Date): Promise<number>;
  getRevenueByPlan(startDate: Date, endDate: Date): Promise<Record<string, number>>;
  getFailedPayments(startDate: Date, endDate: Date): Promise<Payment[]>;
  getRefundedAmount(startDate: Date, endDate: Date): Promise<number>;
}