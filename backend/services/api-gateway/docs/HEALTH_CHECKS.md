# API Gateway Health Checks

The API Gateway provides comprehensive health monitoring for the entire Verpa system.

## Overview

The health checking system performs:
- Periodic health checks on all microservices
- Redis connectivity monitoring  
- System-wide health aggregation
- Automatic service discovery with health status

## Health Check Endpoints

### Basic Health Check
```
GET /health
```
Returns basic API Gateway health status and Redis connectivity.

### Services Health Check
```
GET /health/services
```
Returns health status of all registered microservices.

### System Health Check
```
GET /health/system
```
Returns comprehensive system health including:
- Overall system status (healthy/degraded/unhealthy)
- Individual service health states
- Dependencies health (Redis, etc.)

### Metrics
```
GET /health/metrics
```
Returns API Gateway metrics:
- Memory usage
- Uptime
- Node.js version and platform info

### Readiness Probe
```
GET /health/ready
```
Kubernetes readiness probe endpoint.

### Liveness Probe
```
GET /health/live
```
Kubernetes liveness probe endpoint.

## Health Check Implementation

### Service Discovery with Health Checks

The `ServiceDiscoveryService` now performs:
1. **Periodic health checks** - Every 30 seconds by default
2. **On-demand health checks** - When routing requests
3. **Circuit breaking** - Prevents routing to unhealthy services

### Health States

Services can be in three states:
- **healthy** - Service responding correctly to health checks
- **unhealthy** - Service failing health checks
- **unknown** - No health check performed yet

### System Status

The overall system status is determined by:
- **healthy** - All services and dependencies are healthy
- **degraded** - Some services are unhealthy but system is operational
- **unhealthy** - Critical services or dependencies are down

## Configuration

Health check behavior can be configured per service:

```typescript
const service = {
  name: 'user-service',
  url: 'http://localhost:3001',
  healthEndpoint: '/health',
  healthCheckInterval: 30, // seconds
};
```

## Testing

Run the health check test script:
```bash
./backend/scripts/test-health-checks.sh
```

This will test all health endpoints and verify service connectivity.

## Monitoring Best Practices

1. **Set up alerts** for system status changes
2. **Monitor response times** from health checks
3. **Track health check failures** to identify problematic services
4. **Use readiness probes** in Kubernetes deployments
5. **Configure appropriate timeouts** for health checks

## Integration with Load Balancers

The health endpoints can be used by load balancers to:
- Remove unhealthy instances from rotation
- Perform gradual deployments
- Enable zero-downtime updates

## Example Response

### System Health Check Response
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "user-service": {
      "status": "healthy",
      "timestamp": "2024-01-15T10:29:45.000Z",
      "responseTime": 23
    },
    "aquarium-service": {
      "status": "unhealthy",
      "message": "Connection refused",
      "timestamp": "2024-01-15T10:29:50.000Z",
      "responseTime": 5002
    }
  },
  "dependencies": {
    "redis": {
      "status": "healthy",
      "message": "Redis is responding"
    }
  }
}
```