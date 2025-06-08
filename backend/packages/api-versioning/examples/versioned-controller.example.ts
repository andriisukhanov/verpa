import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiVersion, CurrentVersion, VersionInfo } from '@verpa/api-versioning';

// Example DTOs for different versions
class CreateUserDtoV1 {
  email: string;
  password: string;
  name: string;
}

class CreateUserDtoV2 {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

class CreateUserDtoV3 {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
  };
  preferences: {
    language: string;
    timezone: string;
  };
}

// Example: Controller with versioned endpoints
@Controller('users')
export class UsersController {
  // Endpoint available in all versions
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // V1 only endpoint (deprecated)
  @Get()
  @ApiVersion({
    version: '1',
    deprecated: true,
    deprecationDate: new Date('2024-01-01'),
    removalDate: new Date('2024-12-31'),
    migrationGuide: 'https://docs.verpa.com/api/migration/v1-to-v2',
  })
  findAllV1() {
    return {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
      ],
    };
  }

  // V2 endpoint with enhanced response
  @Get()
  @ApiVersion('2')
  findAllV2(@Query('includeInactive') includeInactive?: boolean) {
    return {
      users: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          active: true,
        },
      ],
      metadata: {
        total: 1,
        page: 1,
        pageSize: 10,
      },
    };
  }

  // V3 endpoint with breaking changes
  @Get()
  @ApiVersion('3')
  findAllV3(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
  ) {
    return {
      data: {
        users: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000', // Changed to UUID
            profile: {
              firstName: 'John',
              lastName: 'Doe',
            },
            contact: {
              email: 'john@example.com',
              phoneNumber: '+1234567890',
            },
            accountStatus: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: 100,
        totalPages: 10,
      },
      _links: {
        self: `/v3/users?page=${page}&limit=${limit}`,
        next: `/v3/users?page=${page + 1}&limit=${limit}`,
        prev: page > 1 ? `/v3/users?page=${page - 1}&limit=${limit}` : null,
      },
    };
  }

  // Endpoint that handles multiple versions with version-specific logic
  @Get(':id')
  @ApiVersion(['1', '2', '3'])
  findOne(
    @Param('id') id: string,
    @CurrentVersion() version: string,
    @VersionInfo() versionInfo: VersionInfo,
  ) {
    // Log deprecated version usage
    if (versionInfo?.isDeprecated) {
      console.warn(`Deprecated version ${version} used for GET /users/${id}`);
    }

    switch (version) {
      case '1':
        return {
          id: parseInt(id),
          name: 'John Doe',
          email: 'john@example.com',
        };

      case '2':
        return {
          id: parseInt(id),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '+1234567890',
          active: true,
        };

      case '3':
        return {
          data: {
            id,
            profile: {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
            },
            contact: {
              email: 'john@example.com',
              phoneNumber: '+1234567890',
              alternativeEmail: null,
            },
            preferences: {
              language: 'en',
              timezone: 'America/New_York',
              notifications: {
                email: true,
                sms: false,
                push: true,
              },
            },
            accountStatus: 'active',
            verificationStatus: 'verified',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          _links: {
            self: `/v3/users/${id}`,
            aquariums: `/v3/users/${id}/aquariums`,
            events: `/v3/users/${id}/events`,
          },
        };

      default:
        throw new Error(`Unsupported version: ${version}`);
    }
  }

  // Version-specific create endpoints with different DTOs
  @Post()
  @ApiVersion('1')
  createV1(@Body() dto: CreateUserDtoV1) {
    return {
      id: 1,
      name: dto.name,
      email: dto.email,
    };
  }

  @Post()
  @ApiVersion('2')
  createV2(@Body() dto: CreateUserDtoV2) {
    return {
      id: 1,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      active: true,
    };
  }

  @Post()
  @ApiVersion('3')
  createV3(@Body() dto: CreateUserDtoV3) {
    return {
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        profile: dto.profile,
        contact: {
          email: dto.email,
          phoneNumber: dto.profile.phoneNumber,
        },
        preferences: dto.preferences,
        accountStatus: 'active',
        verificationStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
      _links: {
        self: '/v3/users/550e8400-e29b-41d4-a716-446655440000',
        verify: '/v3/users/550e8400-e29b-41d4-a716-446655440000/verify',
      },
    };
  }

  // Example of removing functionality in newer versions
  @Put(':id/password')
  @ApiVersion(['1', '2']) // Not available in v3 (moved to auth service)
  updatePassword(
    @Param('id') id: string,
    @Body() dto: { oldPassword: string; newPassword: string },
  ) {
    return { message: 'Password updated successfully' };
  }

  // Example of new functionality only in newer versions
  @Post(':id/verify')
  @ApiVersion(['2', '3']) // Not available in v1
  verifyAccount(@Param('id') id: string, @Body() dto: { code: string }) {
    return { verified: true, verifiedAt: new Date() };
  }

  // Batch operations only in v3
  @Post('batch')
  @ApiVersion('3')
  batchCreate(@Body() dto: { users: CreateUserDtoV3[] }) {
    return {
      data: {
        created: dto.users.length,
        users: dto.users.map((user, index) => ({
          id: `550e8400-e29b-41d4-a716-44665544000${index}`,
          status: 'created',
        })),
      },
      _links: {
        self: '/v3/users/batch',
      },
    };
  }
}

// Example: Separate controllers for major versions
@Controller('products')
@ApiVersion('1')
export class ProductsV1Controller {
  @Get()
  findAll() {
    return {
      products: [
        { id: 1, name: 'Product 1', price: 100 },
      ],
    };
  }
}

@Controller('products')
@ApiVersion('2')
export class ProductsV2Controller {
  @Get()
  findAll() {
    return {
      products: [
        {
          id: 1,
          name: 'Product 1',
          price: { amount: 100, currency: 'USD' },
          category: 'Electronics',
        },
      ],
      metadata: { total: 1 },
    };
  }
}

// Example: Abstract base controller with version-specific implementations
abstract class BaseAquariumController {
  abstract findAll(): any;
  abstract findOne(id: string): any;
  abstract create(dto: any): any;
}

@Controller('aquariums')
@ApiVersion('1')
export class AquariumsV1Controller extends BaseAquariumController {
  findAll() {
    return { aquariums: [] };
  }

  findOne(id: string) {
    return { id, name: 'My Aquarium', size: 100 };
  }

  create(dto: any) {
    return { id: 1, ...dto };
  }
}

@Controller('aquariums')
@ApiVersion('2')
export class AquariumsV2Controller extends BaseAquariumController {
  findAll() {
    return {
      data: { aquariums: [] },
      pagination: { page: 1, total: 0 },
    };
  }

  findOne(id: string) {
    return {
      data: {
        id,
        name: 'My Aquarium',
        specifications: {
          volume: { value: 100, unit: 'gallons' },
          dimensions: { length: 48, width: 18, height: 20, unit: 'inches' },
        },
      },
    };
  }

  create(dto: any) {
    return {
      data: { id: '550e8400-e29b-41d4-a716-446655440000', ...dto },
      _links: { self: '/v2/aquariums/550e8400-e29b-41d4-a716-446655440000' },
    };
  }
}