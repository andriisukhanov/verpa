// Example: User Service with API Versioning
// File: user-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable versioning globally with NestJS built-in versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '2',
    prefix: 'v',
  });

  await app.listen(3001);
}
bootstrap();

// File: user-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ApiVersioningModule, VersioningType } from '@verpa/api-versioning';

@Module({
  imports: [
    // Add API versioning with custom configuration
    ApiVersioningModule.forRoot({
      type: [VersioningType.URI, VersioningType.HEADER], // Support multiple strategies
      defaultVersion: '2',
      prefix: 'v',
      header: 'X-API-Version',
      supportedVersions: ['1', '2', '3'],
      deprecatedVersions: ['1'],
      fallbackToDefault: true,
    }),
    // Other modules...
  ],
})
export class AppModule {}

// Example: API Gateway with version routing
// File: api-gateway/src/modules/proxy/versioned-proxy.service.ts

import { Injectable } from '@nestjs/common';
import { CurrentVersion } from '@verpa/api-versioning';

@Injectable()
export class VersionedProxyService {
  private readonly serviceVersionMap = {
    'user-service': {
      '1': 'http://user-service-v1:3001',
      '2': 'http://user-service-v2:3001',
      '3': 'http://user-service-v3:3001',
    },
    'aquarium-service': {
      '1': 'http://aquarium-service:3002/v1',
      '2': 'http://aquarium-service:3002/v2',
      '3': 'http://aquarium-service:3002/v3',
    },
  };

  getServiceUrl(serviceName: string, version: string): string {
    const serviceVersions = this.serviceVersionMap[serviceName];
    if (!serviceVersions) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const url = serviceVersions[version] || serviceVersions['2']; // Fallback to v2
    return url;
  }

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    version: string,
    data?: any,
  ) {
    const baseUrl = this.getServiceUrl(serviceName, version);
    const url = `${baseUrl}${path}`;

    // Make the proxied request with appropriate version
    // Implementation depends on your HTTP client
    console.log(`Proxying ${method} ${url} for version ${version}`);
  }
}

// Example: Version-aware middleware
// File: common/middleware/version-logger.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class VersionLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['x-api-version'] || 
                   req.query.version || 
                   this.extractVersionFromUrl(req.path) || 
                   'default';

    // Log version usage for monitoring
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      version,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Add version to request for later use
    (req as any).version = version;

    next();
  }

  private extractVersionFromUrl(url: string): string | null {
    const match = url.match(/\/v(\d+)/);
    return match ? match[1] : null;
  }
}

// Example: Version-specific service implementations
// File: services/user/user.service.versions.ts

import { Injectable } from '@nestjs/common';

export interface IUserService {
  createUser(data: any): Promise<any>;
  getUser(id: string): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
}

@Injectable()
export class UserServiceV1 implements IUserService {
  async createUser(data: any) {
    // V1 implementation - simple user model
    return {
      id: Math.random().toString(),
      name: data.name,
      email: data.email,
    };
  }

  async getUser(id: string) {
    // V1 response format
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  async updateUser(id: string, data: any) {
    // V1 update logic
    return { id, ...data };
  }
}

@Injectable()
export class UserServiceV2 implements IUserService {
  async createUser(data: any) {
    // V2 implementation - enhanced user model
    return {
      id: Math.random().toString(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      createdAt: new Date(),
    };
  }

  async getUser(id: string) {
    // V2 response format with metadata
    return {
      data: {
        id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
      },
      metadata: {
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
  }

  async updateUser(id: string, data: any) {
    // V2 update logic with validation
    return {
      data: { id, ...data },
      updatedAt: new Date(),
    };
  }
}

@Injectable()
export class UserServiceV3 implements IUserService {
  async createUser(data: any) {
    // V3 implementation - complete rewrite with new structure
    return {
      data: {
        id: 'usr_' + Math.random().toString(36),
        profile: {
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
        },
        contact: {
          primaryEmail: data.email,
          phoneNumbers: [data.profile.phoneNumber],
        },
        settings: data.preferences || {},
        status: 'active',
      },
      _links: {
        self: `/v3/users/${data.id}`,
        aquariums: `/v3/users/${data.id}/aquariums`,
      },
    };
  }

  async getUser(id: string) {
    // V3 response with HATEOAS
    return {
      data: {
        id,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          avatar: 'https://api.verpa.com/avatars/default.jpg',
        },
        contact: {
          primaryEmail: 'john@example.com',
          secondaryEmail: null,
          phoneNumbers: ['+1234567890'],
        },
        subscription: {
          plan: 'premium',
          validUntil: '2025-01-01T00:00:00Z',
        },
      },
      _links: {
        self: `/v3/users/${id}`,
        aquariums: `/v3/users/${id}/aquariums`,
        subscription: `/v3/users/${id}/subscription`,
        avatar: `/v3/users/${id}/avatar`,
      },
      _embedded: {
        recentActivity: [],
      },
    };
  }

  async updateUser(id: string, data: any) {
    // V3 update with event sourcing
    return {
      data: { id, ...data },
      events: [
        {
          type: 'user.updated',
          timestamp: new Date(),
          changes: Object.keys(data),
        },
      ],
      _links: {
        self: `/v3/users/${id}`,
      },
    };
  }
}

// Example: Version factory
// File: services/user/user-service.factory.ts

import { Injectable } from '@nestjs/common';
import { UserServiceV1, UserServiceV2, UserServiceV3, IUserService } from './user.service.versions';

@Injectable()
export class UserServiceFactory {
  constructor(
    private readonly userServiceV1: UserServiceV1,
    private readonly userServiceV2: UserServiceV2,
    private readonly userServiceV3: UserServiceV3,
  ) {}

  getService(version: string): IUserService {
    switch (version) {
      case '1':
        return this.userServiceV1;
      case '2':
        return this.userServiceV2;
      case '3':
        return this.userServiceV3;
      default:
        return this.userServiceV2; // Default to V2
    }
  }
}

// Example: Controller using version factory
// File: controllers/user.controller.ts

import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { CurrentVersion } from '@verpa/api-versioning';
import { UserServiceFactory } from '../services/user/user-service.factory';

@Controller('users')
export class UserController {
  constructor(private readonly userServiceFactory: UserServiceFactory) {}

  @Post()
  async create(@Body() dto: any, @CurrentVersion() version: string) {
    const service = this.userServiceFactory.getService(version);
    return service.createUser(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentVersion() version: string) {
    const service = this.userServiceFactory.getService(version);
    return service.getUser(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentVersion() version: string,
  ) {
    const service = this.userServiceFactory.getService(version);
    return service.updateUser(id, dto);
  }
}

// Example: Version migration service
// File: services/migration/version-migration.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class VersionMigrationService {
  // Migrate data from V1 to V2 format
  migrateUserV1ToV2(v1User: any): any {
    const [firstName, ...lastNameParts] = v1User.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    return {
      id: v1User.id,
      firstName,
      lastName,
      email: v1User.email,
      phoneNumber: v1User.phone || null,
      active: true,
      createdAt: v1User.createdAt || new Date(),
    };
  }

  // Migrate data from V2 to V3 format
  migrateUserV2ToV3(v2User: any): any {
    return {
      data: {
        id: v2User.id,
        profile: {
          firstName: v2User.firstName,
          lastName: v2User.lastName,
        },
        contact: {
          primaryEmail: v2User.email,
          phoneNumbers: v2User.phoneNumber ? [v2User.phoneNumber] : [],
        },
        status: v2User.active ? 'active' : 'inactive',
      },
      _links: {
        self: `/v3/users/${v2User.id}`,
      },
    };
  }

  // Backward compatibility: V3 to V2
  migrateUserV3ToV2(v3User: any): any {
    const user = v3User.data || v3User;
    return {
      id: user.id,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      email: user.contact.primaryEmail,
      phoneNumber: user.contact.phoneNumbers[0] || null,
      active: user.status === 'active',
    };
  }
}