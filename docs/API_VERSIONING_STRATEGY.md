# API Versioning Strategy

## Overview

Verpa uses a comprehensive API versioning strategy to ensure backward compatibility while allowing for continuous improvement and evolution of the API. This document outlines our versioning approach, implementation details, and best practices.

## Versioning Strategy

### Supported Versioning Methods

Our API supports multiple versioning strategies to accommodate different client needs:

1. **URI Versioning** (Primary)
   - Format: `/api/v{version}/resource`
   - Example: `/api/v1/users`, `/api/v2/users`
   - Most visible and explicit method

2. **Header Versioning** (Secondary)
   - Header: `X-API-Version: {version}`
   - Example: `X-API-Version: 2`
   - Useful for clients that prefer cleaner URLs

3. **Query Parameter Versioning** (Fallback)
   - Format: `/api/resource?version={version}`
   - Example: `/api/users?version=2`
   - For quick testing and debugging

4. **Accept Header Versioning** (Advanced)
   - Format: `Accept: application/vnd.verpa.v{version}+json`
   - Example: `Accept: application/vnd.verpa.v2+json`
   - RESTful approach for API purists

### Version Format

- **Simple Numeric**: We use simple numeric versioning (1, 2, 3)
- **No Minor Versions**: Breaking changes require a new major version
- **Default Version**: v1 (for backward compatibility)
- **Current Stable**: v2

## Implementation

### API Gateway Configuration

```typescript
// api-gateway/src/app.module.ts
ApiVersioningModule.forRoot({
  type: [VersioningType.URI, VersioningType.HEADER],
  defaultVersion: '1',
  prefix: 'v',
  header: 'X-API-Version',
  supportedVersions: ['1', '2'],
  deprecatedVersions: [],
  fallbackToDefault: true,
})
```

### Controller Implementation

#### Version 1 Controller (Legacy)
```typescript
@Controller('users')
@ApiVersion('1')
export class UsersController {
  // Simple response format
  @Get()
  findAll() {
    return {
      users: [...],
      total: 100
    };
  }
}
```

#### Version 2 Controller (Current)
```typescript
@Controller('users')
@ApiVersion('2')
export class UsersV2Controller {
  // Enhanced response format with HATEOAS
  @Get()
  findAll() {
    return {
      data: { users: [...] },
      pagination: { ... },
      _links: { ... }
    };
  }
}
```

## Version Differences

### V1 → V2 Changes

#### 1. Response Structure
- **V1**: Flat response structure
- **V2**: Nested structure with `data`, `pagination`, `_links`

#### 2. User Model
```typescript
// V1
{
  id: number,
  name: string,
  email: string
}

// V2
{
  id: string, // UUID
  profile: {
    firstName: string,
    lastName: string
  },
  contact: {
    email: string,
    phoneNumber?: string
  }
}
```

#### 3. Error Responses
- **V1**: Basic error messages
- **V2**: Structured error responses with codes and metadata

#### 4. New Endpoints in V2
- `POST /users/batch` - Batch user creation
- `POST /users/me/preferences` - Update preferences
- `GET /users/analytics/dashboard` - User analytics

#### 5. Removed/Changed in V2
- Password management moved to auth service
- Soft delete includes audit trail

## Migration Guide

### For API Consumers

#### 1. Gradual Migration
```javascript
// Start with version detection
const apiVersion = supportedFeatures.includes('batch') ? 'v2' : 'v1';

// Use appropriate endpoint
const response = await fetch(`/api/${apiVersion}/users`);
```

#### 2. Feature Detection
```javascript
// Check API capabilities
const capabilities = await fetch('/api/capabilities');
const features = await capabilities.json();

if (features.versions.includes('2')) {
  // Use V2 features
}
```

#### 3. Header-based Migration
```javascript
// Gradually test V2 while using V1
const headers = {
  'X-API-Version': process.env.USE_V2_API ? '2' : '1'
};
```

### For Backend Services

#### 1. Service Discovery
```typescript
// Proxy service handles version routing
getServiceUrl(serviceName: string, version: string): string {
  const serviceVersions = {
    'user-service': {
      '1': 'http://user-service:3001/v1',
      '2': 'http://user-service:3001/v2'
    }
  };
  return serviceVersions[serviceName][version];
}
```

#### 2. Data Migration
```typescript
// Transform V1 data to V2 format
migrateUserV1ToV2(v1User: any): any {
  const [firstName, ...lastName] = v1User.name.split(' ');
  return {
    id: uuid(),
    profile: { firstName, lastName: lastName.join(' ') },
    contact: { email: v1User.email }
  };
}
```

## Deprecation Policy

### Timeline
1. **Announcement**: 6 months before deprecation
2. **Deprecation Warning**: Added to responses
3. **End of Life**: Version removed

### Deprecation Headers
```
X-API-Deprecation: API version 1 is deprecated since 2024-01-01 and will be removed on 2024-12-31
Sunset: Mon, 31 Dec 2024 23:59:59 GMT
Link: <https://docs.verpa.com/api/migration/v1-to-v2>; rel="deprecation"
```

### Monitoring Deprecated Versions
```typescript
// Log deprecated version usage
if (request.apiVersion === '1') {
  logger.warn('Deprecated API version used', {
    version: '1',
    endpoint: request.path,
    client: request.headers['user-agent']
  });
}
```

## Best Practices

### 1. Version Independence
- Each version should be independently deployable
- No shared state between versions
- Separate database migrations per version

### 2. Documentation
- Maintain separate docs for each version
- Clear migration guides
- Changelog for version differences

### 3. Testing
```typescript
describe('API Versioning', () => {
  it('should handle v1 requests', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .expect(200);
    
    expect(response.body).toHaveProperty('users');
  });

  it('should handle v2 requests', async () => {
    const response = await request(app)
      .get('/api/v2/users')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('_links');
  });
});
```

### 4. Client Libraries
```typescript
// SDK with version support
class VerpaClient {
  constructor(private version: string = '2') {}
  
  async getUsers() {
    return this.request(`/v${this.version}/users`);
  }
}
```

## Version Roadmap

### Version 1 (Current - Deprecated)
- Status: Deprecated as of 2024-01-01
- End of Life: 2024-12-31
- Features: Basic CRUD operations

### Version 2 (Current - Stable)
- Status: Stable
- Released: 2023-07-01
- Features: Enhanced responses, batch operations, analytics

### Version 3 (Planning)
- Status: In Development
- Target Release: 2024-07-01
- Features: GraphQL support, real-time subscriptions, AI features

## Monitoring and Analytics

### Version Usage Metrics
```typescript
// Track version usage
metricsService.increment('api.version.usage', {
  version: request.apiVersion,
  endpoint: request.route.path,
  method: request.method
});
```

### Dashboard Metrics
- Version distribution
- Deprecation warning responses
- Migration progress
- Client version adoption

## Security Considerations

### Version-Specific Security
- Authentication mechanisms consistent across versions
- Security patches applied to all supported versions
- Version-specific rate limiting

### Access Control
```typescript
// Version-based feature flags
if (version >= '2' && user.subscription === 'premium') {
  // Enable advanced features
}
```

## Development Workflow

### Adding New Versions
1. Create new controller with `@ApiVersion` decorator
2. Implement version-specific logic
3. Update service discovery
4. Add migration utilities
5. Update documentation
6. Deploy behind feature flag

### Maintaining Multiple Versions
- Shared business logic in services
- Version-specific DTOs and transformers
- Separate integration tests per version
- Version-specific error handling

## Client Examples

### JavaScript/TypeScript
```typescript
const client = new VerpaAPI({
  version: '2',
  fallbackVersion: '1'
});

// Automatic version negotiation
const users = await client.users.list();
```

### Python
```python
from verpa import VerpaClient

client = VerpaClient(api_version='2')
users = client.users.list()
```

### Mobile (React Native)
```javascript
import { VerpaAPI } from '@verpa/mobile-sdk';

const api = new VerpaAPI({
  version: '2',
  versionStrategy: 'header' // Mobile prefers header versioning
});
```

## Troubleshooting

### Common Issues

1. **Version Not Found**
   - Check supported versions in API Gateway config
   - Ensure version format is correct (numeric only)

2. **Deprecation Warnings**
   - Monitor response headers
   - Plan migration before EOL date

3. **Feature Compatibility**
   - Check version-specific documentation
   - Use capability detection

### Debug Headers
```
X-API-Version-Requested: 2
X-API-Version-Served: 2
X-API-Version-Strategy: uri
```

## Conclusion

Our API versioning strategy ensures:
- Backward compatibility for existing clients
- Freedom to innovate and improve
- Clear migration paths
- Predictable deprecation timelines

Follow these guidelines to maintain a stable, evolving API that serves all client needs.