# Verpa API Versioning

A flexible API versioning strategy package for Verpa microservices, supporting multiple versioning approaches with deprecation management.

## Features

- **Multiple Versioning Strategies**: URI, Header, Query Parameter, and Accept Header versioning
- **Version Validation**: Automatic validation of version formats
- **Deprecation Management**: Built-in deprecation warnings and sunset headers
- **Flexible Configuration**: Support multiple strategies simultaneously
- **Version Guards**: Restrict endpoints to specific versions
- **Best Version Selection**: Automatically select the best available version
- **Migration Guides**: Include migration information in deprecation warnings

## Installation

```bash
npm install @verpa/api-versioning
```

## Quick Start

### 1. Configure versioning in your application

```typescript
import { ApiVersioningModule } from '@verpa/api-versioning';
import { VersioningType } from '@verpa/api-versioning';

@Module({
  imports: [
    ApiVersioningModule.forRoot({
      type: VersioningType.URI, // or [VersioningType.URI, VersioningType.HEADER]
      defaultVersion: '1',
      prefix: 'v',
      supportedVersions: ['1', '2', '3'],
      deprecatedVersions: ['1'],
      fallbackToDefault: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Version your controllers and endpoints

```typescript
import { ApiVersion } from '@verpa/api-versioning';

@Controller('users')
@ApiVersion('2') // This controller only handles v2
export class UsersV2Controller {
  @Get()
  findAll() {
    return { version: 2, users: [] };
  }
}

@Controller('users')
export class UsersController {
  @Get()
  @ApiVersion(['1', '2', '3']) // This method handles multiple versions
  findAll(@CurrentVersion() version: string) {
    return { version, users: [] };
  }

  @Post()
  @ApiVersion({
    version: '1',
    deprecated: true,
    deprecationDate: new Date('2024-01-01'),
    removalDate: new Date('2024-12-31'),
    migrationGuide: 'https://docs.verpa.com/migration/v1-to-v2',
  })
  create(@Body() dto: CreateUserDto) {
    // Old implementation
  }
}
```

## Versioning Strategies

### 1. URI Versioning

```
GET /v1/users
GET /v2/users
```

Configuration:
```typescript
{
  type: VersioningType.URI,
  prefix: 'v', // Optional, default: 'v'
}
```

### 2. Header Versioning

```
GET /users
X-API-Version: 2
```

Configuration:
```typescript
{
  type: VersioningType.HEADER,
  header: 'X-API-Version', // Optional, default: 'X-API-Version'
}
```

### 3. Query Parameter Versioning

```
GET /users?version=2
```

Configuration:
```typescript
{
  type: VersioningType.QUERY,
  query: 'version', // Optional, default: 'version'
}
```

### 4. Accept Header Versioning

```
GET /users
Accept: application/vnd.verpa.v2+json
```

Configuration:
```typescript
{
  type: VersioningType.ACCEPT_HEADER,
}
```

### 5. Multiple Strategies

Support multiple strategies with fallback:

```typescript
{
  type: [VersioningType.URI, VersioningType.HEADER, VersioningType.QUERY],
  defaultVersion: '2',
  fallbackToDefault: true,
}
```

## Deprecation Management

### Mark versions as deprecated

```typescript
@ApiVersion({
  version: '1',
  deprecated: true,
  deprecationDate: new Date('2024-01-01'),
  removalDate: new Date('2024-12-31'),
  migrationGuide: 'https://docs.verpa.com/migration/v1-to-v2',
})
```

### Deprecation headers

When a deprecated version is used, the following headers are added:

```
X-API-Deprecation: API version 1 is deprecated since 2024-01-01T00:00:00.000Z and will be removed on 2024-12-31T00:00:00.000Z. Migration guide: https://docs.verpa.com/migration/v1-to-v2
Sunset: Fri, 31 Dec 2024 00:00:00 GMT
Link: <https://docs.verpa.com/migration/v1-to-v2>; rel="deprecation"
```

## Version Information

### Access version information in your handlers

```typescript
import { CurrentVersion, VersionInfo } from '@verpa/api-versioning';

@Get()
findAll(
  @CurrentVersion() version: string,
  @VersionInfo() versionInfo: VersionInfo,
) {
  console.log('Current version:', version);
  console.log('Version info:', versionInfo);
  // {
  //   version: '1',
  //   isDeprecated: true,
  //   deprecationDate: Date,
  //   removalDate: Date,
  //   migrationGuide: string
  // }
}
```

## Advanced Usage

### Custom version validation

```typescript
import { VersionUtils } from '@verpa/api-versioning';

// Validate version format
if (VersionUtils.isValidVersion('2.1')) {
  // Valid version
}

// Compare versions
const comparison = VersionUtils.compareVersions('2', '1'); // Returns 1

// Select best version
const best = VersionUtils.selectBestVersion(
  '2.5', // requested
  ['1', '2', '3'], // supported
  '3', // default
); // Returns '2'
```

### Version-specific implementations

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentVersion() version: string) {
    switch (version) {
      case '1':
        return this.findOneV1(id);
      case '2':
        return this.findOneV2(id);
      case '3':
        return this.findOneV3(id);
      default:
        throw new Error(`Unsupported version: ${version}`);
    }
  }

  private findOneV1(id: string) {
    // V1 implementation
  }

  private findOneV2(id: string) {
    // V2 implementation with additional fields
  }

  private findOneV3(id: string) {
    // V3 implementation with breaking changes
  }
}
```

### Global version configuration

```typescript
// main.ts
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable versioning globally
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  await app.listen(3000);
}
```

## Testing

### Test different versions

```typescript
describe('UsersController', () => {
  it('should handle v1 requests', () => {
    return request(app.getHttpServer())
      .get('/v1/users')
      .expect(200)
      .expect((res) => {
        expect(res.body.version).toBe('1');
      });
  });

  it('should handle v2 requests', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('X-API-Version', '2')
      .expect(200)
      .expect((res) => {
        expect(res.body.version).toBe('2');
      });
  });

  it('should return deprecation headers for v1', () => {
    return request(app.getHttpServer())
      .get('/v1/users')
      .expect(200)
      .expect('X-API-Deprecation', /deprecated/);
  });
});
```

## Configuration Options

```typescript
interface VersioningOptions {
  // Versioning strategy type(s)
  type: VersioningType | VersioningType[];
  
  // Default version when none specified
  defaultVersion?: string;
  
  // Header name for header versioning
  header?: string;
  
  // Query parameter name for query versioning
  query?: string;
  
  // URL prefix for URI versioning
  prefix?: string;
  
  // List of deprecated versions
  deprecatedVersions?: string[];
  
  // List of supported versions
  supportedVersions?: string[];
  
  // Whether to fall back to default version
  fallbackToDefault?: boolean;
}
```

## Best Practices

1. **Start with v1**: Always start your API with version 1
2. **Semantic versioning**: Use semantic versioning for complex APIs
3. **Deprecation notice**: Give at least 6 months notice before removing versions
4. **Migration guides**: Always provide migration guides for deprecated versions
5. **Version documentation**: Document changes between versions clearly
6. **Backward compatibility**: Maintain backward compatibility when possible
7. **Feature flags**: Use feature flags for gradual rollouts

## Migration Guide

### From no versioning to versioned API

1. Add the ApiVersioningModule to your app
2. Set default version to '1'
3. Add @ApiVersion('1') to existing controllers
4. Create new controllers for v2 with @ApiVersion('2')
5. Update clients to specify version

### Between versions

1. Create new controller/method for new version
2. Mark old version as deprecated
3. Add migration guide URL
4. Monitor usage of deprecated versions
5. Remove old version after sunset date

## Examples

### E-commerce API versioning

```typescript
@Controller('products')
export class ProductsController {
  // V1: Simple product structure
  @Get()
  @ApiVersion('1')
  findAllV1() {
    return {
      products: [
        { id: 1, name: 'Product 1', price: 100 }
      ]
    };
  }

  // V2: Added categories and inventory
  @Get()
  @ApiVersion('2')
  findAllV2() {
    return {
      products: [
        { 
          id: 1, 
          name: 'Product 1', 
          price: 100,
          category: 'Electronics',
          inventory: { available: 10, reserved: 2 }
        }
      ]
    };
  }

  // V3: Breaking change - price is now an object
  @Get()
  @ApiVersion('3')
  findAllV3() {
    return {
      products: [
        { 
          id: 1, 
          name: 'Product 1', 
          price: {
            amount: 100,
            currency: 'USD',
            tax_included: true
          },
          category: 'Electronics',
          inventory: { available: 10, reserved: 2 }
        }
      ]
    };
  }
}
```

### Microservice versioning

```typescript
// User Service
@Module({
  imports: [
    ApiVersioningModule.forRoot({
      type: VersioningType.HEADER,
      defaultVersion: '2',
      supportedVersions: ['1', '2'],
      deprecatedVersions: ['1'],
    }),
  ],
})
export class UserServiceModule {}

// Order Service
@Module({
  imports: [
    ApiVersioningModule.forRoot({
      type: VersioningType.URI,
      defaultVersion: '1',
      supportedVersions: ['1'],
    }),
  ],
})
export class OrderServiceModule {}
```

## Monitoring

Monitor version usage to plan deprecations:

```typescript
@Injectable()
export class VersionMetricsService {
  async trackVersionUsage(version: string, endpoint: string) {
    await this.metricsService.increment('api.version.usage', {
      version,
      endpoint,
      service: 'user-service',
    });
  }
}
```

## Troubleshooting

### Version not detected

1. Check versioning configuration
2. Verify request format matches strategy
3. Enable debug logging
4. Check middleware order

### Deprecation headers not appearing

1. Ensure version is in deprecatedVersions array
2. Check DeprecationWarningInterceptor is registered
3. Verify response headers aren't being stripped

### Version guard rejecting valid requests

1. Check supported versions configuration
2. Verify version format is valid
3. Check if fallbackToDefault is enabled