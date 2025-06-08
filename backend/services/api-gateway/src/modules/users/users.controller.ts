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
import { ApiVersion } from '@verpa/api-versioning';
import { RateLimit, RateLimitPerMinute } from '@verpa/rate-limiting';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@ApiVersion('1') // This controller handles v1 requests
@RateLimitPerMinute(60) // Default 60 requests per minute for authenticated users
export class UsersController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'subscriptionType', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: any, @Request() req: any) {
    const cacheKey = `users:${JSON.stringify(query)}`;
    
    return this.cacheService.remember(
      cacheKey,
      () => this.proxyService.get('user-service', '/users', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 60 } // Cache for 1 minute
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req: any) {
    return this.proxyService.get('user-service', '/users/me', {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Body() updateDto: any, @Request() req: any) {
    const result = await this.proxyService.put('user-service', '/users/me', updateDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate user cache
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`user:${userId}`);
    }

    return result;
  }

  @Post('me/change-password')
  @RateLimit({ points: 3, duration: 3600 }) // Only 3 password changes per hour
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  async changePassword(@Body() changePasswordDto: any, @Request() req: any) {
    return this.proxyService.post('user-service', '/users/me/change-password', changePasswordDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req: any) {
    return this.cacheService.remember(
      'user:stats',
      () => this.proxyService.get('user-service', '/users/stats', {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.cacheService.remember(
      `user:${id}`,
      () => this.proxyService.get('user-service', `/users/${id}`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.put('user-service', `/users/${id}`, updateDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    return result;
  }

  @Patch(':id/role')
  @RateLimit({ points: 10, duration: 3600 }) // Admin action: 10 role changes per hour
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.patch('user-service', `/users/${id}/role`, updateRoleDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    return result;
  }

  @Patch(':id/subscription')
  @ApiOperation({ summary: 'Update user subscription' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.patch(
      'user-service',
      `/users/${id}/subscription`,
      updateSubscriptionDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      }
    );

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    return result;
  }

  @Delete(':id')
  @RateLimit({ points: 5, duration: 3600 }) // Admin action: 5 deletes per hour
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.delete('user-service', `/users/${id}`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    return result;
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore deleted user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  async restore(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.post('user-service', `/users/${id}/restore`, {}, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    return result;
  }
}