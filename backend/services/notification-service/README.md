# Notification Service

The Notification Service handles all outbound communications for the Verpa platform, including email, SMS, and push notifications.

## Features

- **Email Notifications**
  - Multiple provider support (AWS SES, SendGrid, SMTP)
  - HTML and plain text templates
  - Bulk email sending
  - Email verification and password reset emails

- **SMS Notifications** (Placeholder)
  - Twilio integration
  - Template support

- **Push Notifications** (Placeholder)
  - Firebase Cloud Messaging
  - Multi-device support

- **Queue Management**
  - Redis-backed queues with BullMQ
  - Retry logic and exponential backoff
  - Job prioritization

## Architecture

The service follows Domain-Driven Design principles:

```
src/
├── application/          # Application layer
│   ├── controllers/      # HTTP and Kafka controllers
│   ├── dto/             # Data transfer objects
│   ├── processors/      # Queue processors
│   └── services/        # Application services
├── domain/              # Domain layer (future use)
├── infrastructure/      # Infrastructure layer
│   ├── email/          # Email provider implementations
│   ├── sms/            # SMS provider implementations
│   └── push/           # Push notification implementations
└── config/             # Configuration
```

## Email Templates

Available email templates:
- `WELCOME` - Welcome email with verification link
- `EMAIL_VERIFIED` - Confirmation after email verification
- `PASSWORD_RESET` - Password reset link
- `ACCOUNT_LOCKED` - Security alert for locked accounts

## API Endpoints

- `POST /notifications/email` - Send single email
- `POST /notifications/sms` - Send SMS
- `POST /notifications/push` - Send push notification
- `POST /notifications/bulk-email` - Send bulk emails
- `GET /notifications/templates` - List available templates
- `GET /health` - Health check

## Kafka Events

The service listens for these events:
- `notification-events` - Generic notification events
- `user.created` - Sends welcome email
- `user.password.reset.requested` - Sends password reset email
- `user.email.verified` - Sends confirmation email
- `user.account.locked` - Sends security alert

## Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3004
SERVICE_NAME=notification-service

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notification-service
KAFKA_GROUP_ID=notification-service-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Provider (ses, sendgrid, smtp)
EMAIL_PROVIDER=smtp
EMAIL_FROM_NAME=Verpa
EMAIL_FROM_ADDRESS=noreply@verpa.app

# SMTP Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# SendGrid Configuration
SENDGRID_API_KEY=

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## Development

### Local Setup

1. Install dependencies:
```bash
yarn install
```

2. Start the service:
```bash
yarn start:dev
```

3. For email testing, use Mailhog:
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

Access Mailhog UI at http://localhost:8025

### Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## Production Deployment

1. Build the Docker image:
```bash
docker build -t verpa-notification-service .
```

2. Configure production environment variables

3. Ensure Redis and Kafka are accessible

4. Deploy to your container orchestration platform

## Monitoring

- Health endpoint: `/health`
- Readiness endpoint: `/health/ready`
- Liveness endpoint: `/health/live`

Monitor queue metrics via BullMQ dashboard or Redis.