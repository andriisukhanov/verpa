# Mobile Backend for Frontend (BFF)

The Mobile BFF is a specialized API layer designed specifically for mobile applications, providing optimized endpoints and data aggregation for iOS and Android apps.

## Purpose

The Mobile BFF serves as an intermediary layer between mobile apps and microservices, providing:
- **Optimized API responses** tailored for mobile bandwidth and screen sizes
- **Data aggregation** from multiple services in a single request
- **Mobile-specific features** like device management and push notifications
- **Reduced network calls** through intelligent caching and batching
- **Version management** for mobile app compatibility

## Features

### Authentication & Session Management
- Mobile-optimized login/register flow
- Device-based session tracking
- Refresh token management
- Biometric authentication support (future)

### Dashboard API
- Aggregated home screen data in a single call
- Summary statistics
- Recent aquariums with health status
- Upcoming tasks and alerts
- Unread notifications count

### Performance Optimizations
- Response caching with Redis
- Image URL optimization for different screen sizes
- Pagination with sensible defaults for mobile
- Compressed responses
- Minimal payload sizes

### Security
- Rate limiting per device
- API key validation
- JWT token validation
- Device fingerprinting

## Architecture

```
Mobile App
    ↓
Mobile BFF
    ↓
API Gateway / Microservices
```

## API Endpoints

### Authentication
- `POST /v1/auth/login` - Mobile login with device info
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout with device cleanup

### Dashboard
- `GET /v1/dashboard` - Get complete dashboard data
- `GET /v1/dashboard/summary` - Get summary only (lightweight)
- `POST /v1/dashboard/refresh` - Clear dashboard cache

### Aquariums (Coming Soon)
- `GET /v1/aquariums` - List user aquariums (mobile optimized)
- `GET /v1/aquariums/:id` - Get aquarium details
- `POST /v1/aquariums/:id/quick-measure` - Quick parameter recording

### Notifications (Coming Soon)
- `GET /v1/notifications` - Get user notifications
- `POST /v1/notifications/register-device` - Register for push notifications
- `PUT /v1/notifications/:id/read` - Mark notification as read

## Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3100
SERVICE_NAME=mobile-bff

# Backend Services
API_GATEWAY_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
AQUARIUM_SERVICE_URL=http://localhost:3002
EVENT_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3004
MEDIA_SERVICE_URL=http://localhost:3005

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300  # 5 minutes
CACHE_TTL=60   # 1 minute

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX=100

# CORS
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000

# Security
INTERNAL_API_KEY=verpa_internal_api_key_dev

# Mobile Specific
MAX_PAGE_SIZE=50
DEFAULT_PAGE_SIZE=20
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

3. Access Swagger documentation:
```
http://localhost:3100/api/docs
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

### Example Requests

#### Mobile Login
```bash
curl -X POST http://localhost:3100/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: unique-device-id" \
  -H "X-Platform: ios" \
  -H "X-App-Version: 1.0.0" \
  -d '{
    "emailOrUsername": "user@example.com",
    "password": "password123"
  }'
```

#### Get Dashboard
```bash
curl -X GET http://localhost:3100/v1/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Mobile App Integration

### Headers
The mobile app should send these headers with each request:
- `X-Device-Id`: Unique device identifier
- `X-Platform`: Platform (ios/android)
- `X-App-Version`: App version
- `X-Device-Model`: Device model (optional)

### Response Format
All responses follow a consistent format optimized for mobile parsing:

```json
{
  "data": {},
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0"
  }
}
```

### Error Handling
Errors are returned in a mobile-friendly format:

```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials",
    "details": {}
  }
}
```

## Performance Tips

1. **Use summary endpoints** when full data isn't needed
2. **Implement proper caching** on the mobile side
3. **Request only required fields** using query parameters
4. **Use pagination** for list endpoints
5. **Compress images** before upload

## Production Deployment

1. Build the Docker image:
```bash
docker build -t verpa-mobile-bff .
```

2. Configure production environment variables

3. Deploy behind a load balancer

4. Monitor performance metrics

## Monitoring

- Track API response times
- Monitor cache hit rates
- Track device/platform distribution
- Monitor error rates by endpoint