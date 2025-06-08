import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus } from '../../../domain/entities/subscription.entity';
import { Payment, PaymentStatus } from '../../../domain/entities/payment.entity';
import { Price } from '../../../domain/value-objects/price.value-object';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  // Customer Management
  async createCustomer(email: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        metadata,
      });
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return null;
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve customer ${customerId}`, error);
      return null;
    }
  }

  // Subscription Management
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Subscription> {
    try {
      const params: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata,
      };

      if (trialDays) {
        params.trial_period_days = trialDays;
      }

      return await this.stripe.subscriptions.create(params);
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    params: {
      priceId?: string;
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, string>;
    },
  ): Promise<Stripe.Subscription> {
    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      if (params.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [{
          id: subscription.items.data[0].id,
          price: params.priceId,
        }];
      }

      if (params.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = params.cancelAtPeriodEnd;
      }

      if (params.metadata) {
        updateParams.metadata = params.metadata;
      }

      return await this.stripe.subscriptions.update(subscriptionId, updateParams);
    } catch (error) {
      this.logger.error(`Failed to update subscription ${subscriptionId}`, error);
      throw error;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}`, error);
      throw error;
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      this.logger.error(`Failed to reactivate subscription ${subscriptionId}`, error);
      throw error;
    }
  }

  // Payment Methods
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      this.logger.error('Failed to attach payment method', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to set default payment method', error);
      throw error;
    }
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods for ${customerId}`, error);
      return [];
    }
  }

  // Setup Intent for collecting payment details
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
    } catch (error) {
      this.logger.error('Failed to create setup intent', error);
      throw error;
    }
  }

  // Invoice Management
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      this.logger.error(`Failed to retrieve invoice ${invoiceId}`, error);
      return null;
    }
  }

  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error) {
      this.logger.error(`Failed to list invoices for ${customerId}`, error);
      return [];
    }
  }

  // Webhook Signature Verification
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  // Helper methods to convert Stripe objects to domain entities
  mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
      paused: SubscriptionStatus.PAUSED,
    };
    return statusMap[stripeStatus] || SubscriptionStatus.ACTIVE;
  }

  mapStripePaymentIntentStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentStatus {
    const statusMap: Partial<Record<Stripe.PaymentIntent.Status, PaymentStatus>> = {
      succeeded: PaymentStatus.SUCCEEDED,
      processing: PaymentStatus.PROCESSING,
      canceled: PaymentStatus.CANCELED,
      requires_payment_method: PaymentStatus.FAILED,
      requires_action: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_capture: PaymentStatus.PENDING,
    };
    return statusMap[stripeStatus] || PaymentStatus.PENDING;
  }

  // Refund Management
  async createRefund(
    chargeId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      const params: Stripe.RefundCreateParams = {
        charge: chargeId,
      };

      if (amount) {
        params.amount = amount;
      }

      if (reason) {
        params.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      return await this.stripe.refunds.create(params);
    } catch (error) {
      this.logger.error(`Failed to create refund for charge ${chargeId}`, error);
      throw error;
    }
  }
}