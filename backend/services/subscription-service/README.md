# Subscription Service

The Subscription Service manages user subscriptions, payment processing, and billing for the Verpa aquarium management system.

## Features

### Subscription Management
- Multiple subscription tiers (Free, Hobby, Pro, Business)
- Trial periods with automatic conversion
- Plan upgrades and downgrades
- Usage tracking and limits
- Feature access control
- Grace periods for failed payments

### Payment Processing
- Stripe integration for secure payments
- Multiple payment methods support
- Automatic billing and renewals
- Failed payment retry logic
- Refund management
- PCI compliance through Stripe

### Billing & Invoicing
- Automated invoice generation
- Invoice history and downloads
- Tax calculation support
- Multiple currencies
- Proration for plan changes

### Webhooks
- Stripe webhook integration
- Real-time payment status updates
- Automatic subscription status sync
- Event-driven architecture

## Architecture

The service follows Domain-Driven Design principles with:
- **Domain Layer**: Core business logic and entities
- **Application Layer**: Use cases and service orchestration
- **Infrastructure Layer**: External integrations (Stripe, database)
- **Presentation Layer**: REST API controllers

## API Endpoints

### Subscriptions
- `POST /api/subscriptions` - Create new subscription
- `GET /api/subscriptions/current` - Get current user subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Cancel subscription
- `POST /api/subscriptions/:id/reactivate` - Reactivate canceled subscription
- `GET /api/subscriptions/plans` - List available plans

### Feature Access
- `GET /api/subscriptions/check-feature/:feature` - Check feature access
- `GET /api/subscriptions/check-limit/:resource` - Check resource limits

### Payment Methods
- `POST /api/payment-methods` - Add payment method
- `GET /api/payment-methods` - List payment methods
- `DELETE /api/payment-methods/:id` - Remove payment method
- `POST /api/payment-methods/:id/default` - Set default payment method

### Invoices
- `GET /api/invoices` - List user invoices
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/download` - Download invoice PDF

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook endpoint

## Subscription Plans

### Free Plan
- 1 aquarium
- 5 photos per aquarium
- 30 days water parameter history
- Basic features

### Hobby Plan ($9.99/month)
- 3 aquariums
- 50 photos per aquarium
- 90 days water parameter history
- AI recommendations
- Export reports

### Professional Plan ($29.99/month)
- 10 aquariums
- 200 photos per aquarium
- 1 year water parameter history
- AI recommendations
- Export reports
- Priority support

### Business Plan ($99.99/month)
- Unlimited aquariums
- Unlimited photos
- Unlimited history
- All features
- API access
- Custom branding
- Priority support

## Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3007
SERVICE_NAME=subscription-service

# MongoDB
MONGODB_URI=mongodb://localhost:27017/verpa_subscriptions

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=subscription-service
KAFKA_GROUP_ID=subscription-service-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs
STRIPE_HOBBY_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# Subscription Settings
TRIAL_DURATION_DAYS=14
GRACE_PERIOD_DAYS=7

# Payment Settings
PAYMENT_CURRENCY=usd
TAX_RATE=0
```

## Development

### Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up Stripe:
   - Create a Stripe account
   - Get API keys from Stripe dashboard
   - Create products and prices in Stripe
   - Set up webhook endpoint

3. Configure environment variables

4. Run the service:
```bash
yarn start:dev
```

### Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

### Stripe CLI Testing

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3007/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.updated
```

## Webhook Events

### Handled Stripe Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_method.attached`
- `payment_method.detached`

## Security

- All payment processing handled by Stripe
- No credit card data stored locally
- Webhook signature verification
- API authentication required
- Rate limiting on endpoints

## Monitoring

### Key Metrics
- Active subscriptions count
- Monthly recurring revenue (MRR)
- Churn rate
- Failed payment rate
- Trial conversion rate

### Health Checks
- `GET /api/health` - Service health
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Error Handling

### Payment Failures
1. Immediate retry with exponential backoff
2. Email notification to user
3. Grace period before suspension
4. Automatic retry on payment method update

### Subscription States
- **Active**: Full access to features
- **Trialing**: Trial period active
- **Past Due**: Payment failed, grace period
- **Canceled**: No access, can reactivate
- **Paused**: Temporarily suspended

## Production Deployment

1. Set up Stripe production account
2. Configure production webhook endpoint
3. Set production environment variables
4. Enable SSL for webhook endpoint
5. Set up monitoring and alerts

## Testing Payments

### Test Card Numbers
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 9995`
- Requires Auth: `4000 0025 0000 3155`

## Support

For subscription-related issues:
- Check Stripe dashboard for payment details
- Verify webhook delivery
- Check service logs for errors
- Monitor failed payment notifications