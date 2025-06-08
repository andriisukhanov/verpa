import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ApiVersion, CurrentVersion } from '@verpa/api-versioning';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@ApiVersion('2') // This controller handles only v2 requests
export class UsersV2Controller {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with enhanced pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'subscriptionType', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: any, @Request() req: any, @CurrentVersion() version: string) {
    const cacheKey = `users:v${version}:${JSON.stringify(query)}`;
    
    return this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.proxyService.get('user-service', '/users', {
          params: query,
          headers: {
            authorization: req.headers.authorization,
            'x-api-version': version,
          },
        });

        // V2 response format with enhanced metadata
        return {
          data: result.users || result,
          pagination: {
            currentPage: query.page || 1,
            itemsPerPage: query.limit || 10,
            totalItems: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (query.limit || 10)),
          },
          filters: {
            role: query.role,
            subscriptionType: query.subscriptionType,
            search: query.search,
          },
          sorting: {
            field: query.sortBy || 'createdAt',
            order: query.sortOrder || 'desc',
          },
          _links: {
            self: `/v2/users?page=${query.page || 1}&limit=${query.limit || 10}`,
            next: query.page < Math.ceil((result.total || 0) / (query.limit || 10)) 
              ? `/v2/users?page=${(query.page || 1) + 1}&limit=${query.limit || 10}` 
              : null,
            prev: query.page > 1 
              ? `/v2/users?page=${(query.page || 1) - 1}&limit=${query.limit || 10}` 
              : null,
          },
        };
      },
      { ttl: 60 } // Cache for 1 minute
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile with detailed information' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req: any, @CurrentVersion() version: string) {
    const result = await this.proxyService.get('user-service', '/users/me', {
      headers: {
        authorization: req.headers.authorization,
        'x-api-version': version,
      },
    });

    // V2 enhanced response
    return {
      data: {
        ...result,
        profile: {
          firstName: result.firstName,
          lastName: result.lastName,
          avatar: result.avatar || null,
          bio: result.bio || null,
        },
        contact: {
          email: result.email,
          phoneNumber: result.phoneNumber,
          alternativeEmail: result.alternativeEmail,
        },
        preferences: result.preferences || {
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
        },
        subscription: result.subscription || {
          type: 'free',
          expiresAt: null,
        },
      },
      _links: {
        self: '/v2/users/me',
        aquariums: '/v2/users/me/aquariums',
        events: '/v2/users/me/events',
        subscription: '/v2/users/me/subscription',
      },
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile with validation' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Body() updateDto: any, @Request() req: any, @CurrentVersion() version: string) {
    // V2 expects structured update DTO
    const v2UpdateDto = {
      profile: {
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        bio: updateDto.bio,
      },
      contact: {
        phoneNumber: updateDto.phoneNumber,
        alternativeEmail: updateDto.alternativeEmail,
      },
      preferences: updateDto.preferences,
    };

    const result = await this.proxyService.put('user-service', '/users/me', v2UpdateDto, {
      headers: {
        authorization: req.headers.authorization,
        'x-api-version': version,
      },
    });

    // Invalidate user cache
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.invalidatePattern(`user:*${userId}*`);
    }

    return {
      data: result,
      message: 'Profile updated successfully',
      _links: {
        self: '/v2/users/me',
      },
    };
  }

  @Post('me/preferences')
  @ApiOperation({ summary: 'Update user preferences (V2 only)' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(@Body() preferencesDto: any, @Request() req: any) {
    const result = await this.proxyService.post('user-service', '/users/me/preferences', preferencesDto, {
      headers: {
        authorization: req.headers.authorization,
        'x-api-version': '2',
      },
    });

    // Invalidate user cache
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`user:${userId}`);
    }

    return result;
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get user analytics dashboard (V2 only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Request() req: any) {
    return this.cacheService.remember(
      `user:analytics:${req.user?.sub}`,
      () => this.proxyService.get('analytics-service', `/users/${req.user?.sub}/dashboard`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID with full details' })
  @ApiParam({ name: 'id', description: 'User ID (UUID format in V2)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string, @Request() req: any, @CurrentVersion() version: string) {
    return this.cacheService.remember(
      `user:v${version}:${id}`,
      async () => {
        const result = await this.proxyService.get('user-service', `/users/${id}`, {
          headers: {
            authorization: req.headers.authorization,
            'x-api-version': version,
          },
        });

        // V2 response format
        return {
          data: result,
          _links: {
            self: `/v2/users/${id}`,
            aquariums: `/v2/users/${id}/aquariums`,
            events: `/v2/users/${id}/events`,
          },
        };
      },
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple users in batch (V2 only)' })
  @ApiResponse({ status: 201, description: 'Users created successfully' })
  async batchCreate(@Body() batchDto: { users: any[] }, @Request() req: any) {
    const result = await this.proxyService.post('user-service', '/users/batch', batchDto, {
      headers: {
        authorization: req.headers.authorization,
        'x-api-version': '2',
      },
    });

    // Invalidate users list cache
    await this.cacheService.invalidatePattern('users:v2:*');

    return {
      data: {
        created: result.created,
        failed: result.failed,
        users: result.users,
      },
      _links: {
        self: '/v2/users/batch',
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user with audit trail' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @Body() deleteDto: { reason?: string }, @Request() req: any) {
    const result = await this.proxyService.delete('user-service', `/users/${id}`, {
      headers: {
        authorization: req.headers.authorization,
        'x-api-version': '2',
      },
      data: deleteDto, // V2 supports deletion reason
    });

    // Invalidate cache
    await this.cacheService.invalidatePattern(`user:*${id}*`);

    return {
      message: 'User deleted successfully',
      deletedAt: new Date(),
      reason: deleteDto.reason,
      _links: {
        restore: `/v2/users/${id}/restore`,
      },
    };
  }
}