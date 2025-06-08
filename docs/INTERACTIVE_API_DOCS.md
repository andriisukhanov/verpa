# Verpa Interactive API Documentation

## Quick Links
- [Authentication](#authentication)
- [User Management](#user-management)
- [Aquarium Management](#aquarium-management)
- [Events & Reminders](#events--reminders)
- [Analytics](#analytics)
- [Notifications](#notifications)
- [Media](#media)
- [Subscriptions](#subscriptions)

## Base URL
```
Production: https://api.verpa.app
Development: http://localhost:3000
```

## Authentication

### Register New User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "username": "johndoe",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### OAuth Login
```bash
# Google OAuth
curl -X GET http://localhost:3000/auth/google

# GitHub OAuth
curl -X GET http://localhost:3000/auth/github
```

## User Management

### Get User Profile
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Aquarium enthusiast",
    "location": "San Francisco, CA",
    "experienceLevel": "intermediate",
    "preferences": {
      "notifications": {
        "email": true,
        "push": true,
        "sms": false
      },
      "language": "en",
      "timezone": "America/Los_Angeles"
    }
  }'
```

### Upload Avatar
```bash
curl -X POST http://localhost:3000/users/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/avatar.jpg"
```

## Aquarium Management

### Create Aquarium
```bash
curl -X POST http://localhost:3000/aquariums \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Living Room Tank",
    "type": "freshwater",
    "volume": 200,
    "volumeUnit": "liters",
    "dimensions": {
      "length": 120,
      "width": 40,
      "height": 50,
      "unit": "cm"
    },
    "waterType": "freshwater",
    "description": "Community planted tank",
    "location": "Living Room",
    "setupDate": "2024-01-01",
    "isPublic": false,
    "tags": ["planted", "community", "tropical"]
  }'
```

### List User Aquariums
```bash
# Get all aquariums with pagination
curl -X GET "http://localhost:3000/aquariums?page=1&limit=10&sort=-createdAt" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search aquariums
curl -X GET "http://localhost:3000/aquariums?search=planted&type=freshwater" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Aquarium Details
```bash
curl -X GET http://localhost:3000/aquariums/AQUARIUM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response includes:**
- Basic info
- Health score
- Recent parameters
- Equipment list
- Inhabitants
- Maintenance history

### Update Aquarium
```bash
curl -X PUT http://localhost:3000/aquariums/AQUARIUM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tank Name",
    "description": "Updated description"
  }'
```

### Record Water Parameters
```bash
curl -X POST http://localhost:3000/aquariums/AQUARIUM_ID/parameters \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 25.5,
    "ph": 7.2,
    "ammonia": 0,
    "nitrite": 0,
    "nitrate": 10,
    "phosphate": 0.5,
    "gh": 8,
    "kh": 4,
    "tds": 180,
    "salinity": 0
  }'
```

### Add Equipment
```bash
curl -X POST http://localhost:3000/aquariums/AQUARIUM_ID/equipment \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fluval 407",
    "type": "filter",
    "brand": "Fluval",
    "model": "407",
    "purchaseDate": "2024-01-15",
    "warrantyExpiry": "2026-01-15",
    "notes": "Canister filter with bio media"
  }'
```

### Add Inhabitants
```bash
curl -X POST http://localhost:3000/aquariums/AQUARIUM_ID/inhabitants \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "species": "Neon Tetra",
    "scientificName": "Paracheirodon innesi",
    "quantity": 12,
    "category": "fish",
    "addedDate": "2024-02-01",
    "source": "Local fish store",
    "notes": "Schooling fish, peaceful"
  }'
```

### Get Parameter History
```bash
# Last 30 days
curl -X GET "http://localhost:3000/aquariums/AQUARIUM_ID/parameters/history?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Specific date range
curl -X GET "http://localhost:3000/aquariums/AQUARIUM_ID/parameters/history?from=2024-01-01&to=2024-01-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Events & Reminders

### Create Event
```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Water Change",
    "description": "25% water change",
    "type": "maintenance",
    "aquariumId": "AQUARIUM_ID",
    "startDate": "2024-02-01T10:00:00Z",
    "endDate": "2024-02-01T11:00:00Z",
    "isRecurring": true,
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "daysOfWeek": ["sunday"],
      "endDate": "2024-12-31"
    },
    "reminder": {
      "enabled": true,
      "minutesBefore": 60,
      "type": "push"
    }
  }'
```

### List Events
```bash
# Upcoming events
curl -X GET "http://localhost:3000/events?status=upcoming&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Events for specific aquarium
curl -X GET "http://localhost:3000/events?aquariumId=AQUARIUM_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Analytics

### Dashboard Overview
```bash
curl -X GET http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "aquariumCount": 3,
  "totalVolume": 450,
  "averageHealthScore": 85,
  "parameterTrends": {
    "temperature": { "average": 25, "trend": "stable" },
    "ph": { "average": 7.1, "trend": "decreasing" }
  },
  "maintenanceStats": {
    "completed": 45,
    "upcoming": 5,
    "overdue": 1
  },
  "alerts": [
    {
      "type": "parameter",
      "severity": "warning",
      "message": "pH trending down in Tank 1"
    }
  ]
}
```

### Aquarium Analytics
```bash
curl -X GET http://localhost:3000/analytics/aquariums/AQUARIUM_ID?period=30d \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Export Data
```bash
# Export as CSV
curl -X GET "http://localhost:3000/analytics/export?format=csv&type=parameters&aquariumId=AQUARIUM_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o parameters.csv

# Export as JSON
curl -X GET "http://localhost:3000/analytics/export?format=json&type=all" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o data.json
```

## Notifications

### Get Notifications
```bash
curl -X GET "http://localhost:3000/notifications?status=unread&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Mark as Read
```bash
curl -X PUT http://localhost:3000/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Preferences
```bash
curl -X PUT http://localhost:3000/notifications/preferences \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "enabled": true,
      "frequency": "daily",
      "types": ["alerts", "reminders"]
    },
    "push": {
      "enabled": true,
      "types": ["alerts", "reminders", "social"]
    },
    "sms": {
      "enabled": false
    }
  }'
```

## Media

### Upload Image
```bash
curl -X POST http://localhost:3000/media/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "type=aquarium" \
  -F "entityId=AQUARIUM_ID" \
  -F "caption=Front view of the tank"
```

### List Media
```bash
curl -X GET "http://localhost:3000/media?type=aquarium&entityId=AQUARIUM_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Delete Media
```bash
curl -X DELETE http://localhost:3000/media/MEDIA_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Subscriptions

### Get Current Plan
```bash
curl -X GET http://localhost:3000/subscriptions/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Available Plans
```bash
curl -X GET http://localhost:3000/subscriptions/plans
```

### Subscribe to Plan
```bash
curl -X POST http://localhost:3000/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro_monthly",
    "paymentMethodId": "pm_1234567890"
  }'
```

### Cancel Subscription
```bash
curl -X POST http://localhost:3000/subscriptions/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

API rate limits:
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Pro users: 5000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

## Pagination

All list endpoints support pagination:
```
?page=1&limit=20&sort=-createdAt
```

Response includes pagination metadata:
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

## Webhooks

Configure webhooks for real-time updates:

### Register Webhook
```bash
curl -X POST http://localhost:3000/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["aquarium.parameter.recorded", "alert.triggered"],
    "secret": "your-webhook-secret"
  }'
```

### Webhook Payload
```json
{
  "event": "aquarium.parameter.recorded",
  "timestamp": "2024-02-01T10:00:00Z",
  "data": {
    "aquariumId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "parameters": {
      "temperature": 25.5,
      "ph": 7.2
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { VerpaAPI } from '@verpa/sdk';

const api = new VerpaAPI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://api.verpa.app'
});

// Create aquarium
const aquarium = await api.aquariums.create({
  name: 'My Tank',
  type: 'freshwater',
  volume: 200,
  volumeUnit: 'liters'
});

// Record parameters
await api.parameters.record(aquarium.id, {
  temperature: 25,
  ph: 7.2
});
```

### Python
```python
from verpa import VerpaClient

client = VerpaClient(api_key="YOUR_API_KEY")

# Create aquarium
aquarium = client.aquariums.create(
    name="My Tank",
    type="freshwater",
    volume=200,
    volume_unit="liters"
)

# Record parameters
client.parameters.record(
    aquarium_id=aquarium.id,
    temperature=25,
    ph=7.2
)
```

### Mobile (Dart/Flutter)
```dart
import 'package:verpa_sdk/verpa_sdk.dart';

final api = VerpaAPI(apiKey: 'YOUR_API_KEY');

// Create aquarium
final aquarium = await api.aquariums.create(
  CreateAquariumRequest(
    name: 'My Tank',
    type: AquariumType.freshwater,
    volume: 200,
    volumeUnit: VolumeUnit.liters,
  ),
);

// Record parameters
await api.parameters.record(
  aquarium.id,
  WaterParameters(
    temperature: 25,
    ph: 7.2,
  ),
);
```

## Testing

### Test Environment
```
Base URL: http://localhost:3000
Test API Key: test_key_1234567890
```

### Postman Collection
Download our [Postman Collection](https://api.verpa.app/docs/postman-collection.json) for easy API testing.

### Example Test Script
```bash
#!/bin/bash
# Test API endpoints

API_URL="http://localhost:3000"
TOKEN=""

# Register user
echo "Registering user..."
RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.tokens.accessToken')
echo "Token: $TOKEN"

# Create aquarium
echo "Creating aquarium..."
curl -X POST $API_URL/aquariums \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tank",
    "type": "freshwater",
    "volume": 100,
    "volumeUnit": "liters"
  }'
```