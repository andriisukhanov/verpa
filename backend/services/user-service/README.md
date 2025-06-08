# User Service

User management microservice for Verpa aquarium monitoring system.

## Features

- User registration and authentication
- JWT-based authentication with refresh tokens
- OAuth integration support
- Role-based access control (RBAC)
- User profile management
- Password reset and email verification
- Account locking after failed login attempts
- Soft delete functionality
- Event-driven architecture with Kafka
- Health checks and monitoring

## Architecture

The service follows Domain-Driven Design (DDD) principles:

```
src/
├── domain/           # Core business logic
│   ├── entities/     # Domain models
│   ├── repositories/ # Repository interfaces
│   └── services/     # Domain services
├── application/      # Application layer
│   ├── controllers/  # REST API controllers
│   ├── dto/          # Data Transfer Objects
│   ├── services/     # Application services
│   ├── events/       # Event handlers
│   ├── guards/       # Auth guards
│   └── decorators/   # Custom decorators
├── infrastructure/   # Infrastructure layer
│   ├── repositories/ # Repository implementations
│   ├── kafka/        # Message broker
│   └── mappers/      # Data mappers
└── config/           # Configuration
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/username
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email address
- `GET /auth/me` - Get current user

### User Management

- `GET /users` - Get all users (Admin/Moderator)
- `GET /users/:id` - Get user by ID (Admin/Moderator)
- `POST /users` - Create user (Admin)
- `PUT /users/:id` - Update user (Admin)
- `DELETE /users/:id` - Delete user (Admin)
- `POST /users/:id/restore` - Restore user (Admin)
- `PATCH /users/:id/role` - Update user role (Admin)
- `PATCH /users/:id/subscription` - Update subscription (Admin)

### User Profile

- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `POST /users/me/change-password` - Change password

### Health

- `GET /health` - Full health check
- `GET /health/liveness` - Liveness probe
- `GET /health/readiness` - Readiness probe

## Events

The service publishes the following events to Kafka:

- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User deleted
- `user.email.verified` - Email verified
- `user.password.changed` - Password changed
- `user.password.reset.requested` - Password reset requested
- `user.password.reset` - Password reset completed
- `user.account.locked` - Account locked
- `user.login.success` - Successful login
- `user.login.failed` - Failed login attempt
- `user.logout` - User logged out

## Development

### Prerequisites

- Node.js (v18+)
- MongoDB
- Redis
- Kafka

### Installation

```bash
yarn install
```

### Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Running

```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod
```

### Testing

```bash
# Unit tests
yarn test

# Test coverage
yarn test:cov

# E2E tests
yarn test:e2e

# Watch mode
yarn test:watch
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| SERVICE_PORT | Service port | 3001 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/verpa |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| KAFKA_BROKERS | Kafka brokers | localhost:9092 |
| JWT_SECRET | JWT secret key | - |
| JWT_ACCESS_TOKEN_EXPIRY | Access token expiry | 15m |
| JWT_REFRESH_TOKEN_EXPIRY | Refresh token expiry | 7d |
| BCRYPT_ROUNDS | Bcrypt salt rounds | 12 |

## API Documentation

Swagger documentation is available at `http://localhost:3001/api` when running in development mode.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Refresh token rotation
- Account locking after failed attempts
- Input validation and sanitization
- Rate limiting support
- CORS configuration

## Monitoring

- Health checks for MongoDB, memory, and disk
- Prometheus metrics (when configured)
- Structured logging
- Event tracking

## Docker

Build and run with Docker:

```bash
docker build -t verpa-user-service .
docker run -p 3001:3001 verpa-user-service
```

## License

Proprietary - All rights reserved