import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from '../../../application/services/subscription.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';

@ApiTags('webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Body() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(payload, signature);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook ${event.type}:`, error);
      // Don't throw error to avoid Stripe retries for processing errors
    }

    return { received: true };
  }

  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
    this.eventEmitter.emit('stripe.subscription.created', {
      stripeSubscriptionId: stripeSubscription.id,
      customerId: stripeSubscription.customer,
      status: stripeSubscription.status,
      metadata: stripeSubscription.metadata,
    });
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionService['subscriptionRepository']
      .findByStripeSubscriptionId(stripeSubscription.id);

    if (subscription) {
      const updates: any = {
        status: this.stripeService.mapStripeSubscriptionStatus(stripeSubscription.status),
        currentPeriod: {
          startDate: new Date(stripeSubscription.current_period_start * 1000),
          endDate: new Date(stripeSubscription.current_period_end * 1000),
        },
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      };

      if (stripeSubscription.trial_end) {
        updates.trialEnd = new Date(stripeSubscription.trial_end * 1000);
      }

      await this.subscriptionService['subscriptionRepository'].update(
        subscription.id,
        updates,
      );

      this.eventEmitter.emit('stripe.subscription.updated', {
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: updates.status,
      });
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionService['subscriptionRepository']
      .findByStripeSubscriptionId(stripeSubscription.id);

    if (subscription) {
      await this.subscriptionService['subscriptionRepository'].update(
        subscription.id,
        {
          status: this.stripeService.mapStripeSubscriptionStatus('canceled'),
          canceledAt: new Date(),
        },
      );

      this.eventEmitter.emit('stripe.subscription.deleted', {
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeSubscription.id,
      });
    }
  }

  private async handleTrialWillEnd(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionService['subscriptionRepository']
      .findByStripeSubscriptionId(stripeSubscription.id);

    if (subscription) {
      this.eventEmitter.emit('subscription.trial_ending', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        trialEnd: new Date(stripeSubscription.trial_end * 1000),
      });
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.eventEmitter.emit('stripe.invoice.payment_succeeded', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      customerId: invoice.customer,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.eventEmitter.emit('stripe.invoice.payment_failed', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      customerId: invoice.customer,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
    });

    // Update subscription status if needed
    if (invoice.subscription) {
      const subscription = await this.subscriptionService['subscriptionRepository']
        .findByStripeSubscriptionId(invoice.subscription as string);

      if (subscription) {
        await this.subscriptionService['subscriptionRepository'].update(
          subscription.id,
          { status: this.stripeService.mapStripeSubscriptionStatus('past_due') },
        );
      }
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.eventEmitter.emit('stripe.payment_intent.succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      metadata: paymentIntent.metadata,
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.eventEmitter.emit('stripe.payment_intent.failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
      error: paymentIntent.last_payment_error,
    });
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
    this.eventEmitter.emit('stripe.payment_method.attached', {
      paymentMethodId: paymentMethod.id,
      customerId: paymentMethod.customer,
      type: paymentMethod.type,
    });
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
    this.eventEmitter.emit('stripe.payment_method.detached', {
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
    });
  }
}