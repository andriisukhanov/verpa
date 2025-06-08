import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration } from './config/configuration';

// Schemas
import { Subscription, SubscriptionSchema } from './infrastructure/database/schemas/subscription.schema';
import { Payment, PaymentSchema } from './infrastructure/database/schemas/payment.schema';
import { Invoice, InvoiceSchema } from './infrastructure/database/schemas/invoice.schema';

// Repositories
import { SubscriptionRepository } from './infrastructure/database/repositories/subscription.repository';

// Services
import { SubscriptionService } from './application/services/subscription.service';
import { StripeService } from './infrastructure/payment/stripe/stripe.service';

// Controllers
import { SubscriptionController } from './application/controllers/subscription.controller';
import { HealthController } from './application/controllers/health.controller';
import { StripeWebhookController } from './infrastructure/payment/webhook/stripe-webhook.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Event Emitter
    EventEmitterModule.forRoot(),
    
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 60,
        limit: 100,
      }),
    }),
    
    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    
    // Health checks
    TerminusModule,
  ],
  controllers: [
    SubscriptionController,
    HealthController,
    StripeWebhookController,
  ],
  providers: [
    // Repositories
    {
      provide: 'ISubscriptionRepository',
      useClass: SubscriptionRepository,
    },
    SubscriptionRepository,
    
    // Services
    StripeService,
    {
      provide: SubscriptionService,
      useFactory: (
        subscriptionRepo: SubscriptionRepository,
        stripeService: StripeService,
        configService: ConfigService,
        eventEmitter: any,
      ) => {
        return new SubscriptionService(
          subscriptionRepo,
          stripeService,
          configService,
          eventEmitter,
        );
      },
      inject: [SubscriptionRepository, StripeService, ConfigService, 'EventEmitter2'],
    },
  ],
})
export class AppModule {}