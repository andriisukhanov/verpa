import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RateLimit, RateLimitPerMinute } from '@verpa/rate-limiting';
import { ProxyService } from '../../services/proxy/proxy.service';
import { CacheService } from '../../services/cache/cache.service';

@ApiTags('aquariums')
@Controller('aquariums')
@ApiBearerAuth()
@RateLimitPerMinute(100) // Default rate limit for all aquarium endpoints
export class AquariumsController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all aquariums for user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'waterType', required: false, type: String })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Aquariums retrieved successfully' })
  async findAll(@Query() query: any, @Request() req: any) {
    const userId = req.user?.sub;
    const cacheKey = `aquariums:${userId}:${JSON.stringify(query)}`;
    
    return this.cacheService.remember(
      cacheKey,
      () => this.proxyService.get('aquarium-service', '/aquariums', {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Post()
  @RateLimit({ points: 10, duration: 3600 }) // 10 aquariums per hour
  @ApiOperation({ summary: 'Create new aquarium' })
  @ApiResponse({ status: 201, description: 'Aquarium created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createDto: any, @Request() req: any) {
    const result = await this.proxyService.post('aquarium-service', '/aquariums', createDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate user's aquarium list cache
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`aquariums:${userId}:*`);
    }

    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aquarium statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req: any) {
    const userId = req.user?.sub;
    return this.cacheService.remember(
      `aquarium:stats:${userId}`,
      () => this.proxyService.get('aquarium-service', '/aquariums/stats', {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 600 } // Cache for 10 minutes
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get aquarium by ID' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.cacheService.remember(
      `aquarium:${id}`,
      () => this.proxyService.get('aquarium-service', `/aquariums/${id}`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium updated successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.put('aquarium-service', `/aquariums/${id}`, updateDto, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`aquarium:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`aquariums:${userId}:*`);
    }

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 204, description: 'Aquarium deleted successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.delete('aquarium-service', `/aquariums/${id}`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`aquarium:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`aquariums:${userId}:*`);
    }

    return result;
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore deleted aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium restored successfully' })
  async restore(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.post('aquarium-service', `/aquariums/${id}/restore`, {}, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate caches
    await this.cacheService.del(`aquarium:${id}`);
    const userId = req.user?.sub;
    if (userId) {
      await this.cacheService.del(`aquariums:${userId}:*`);
    }

    return result;
  }

  @Post(':id/image')
  @RateLimit({ points: 20, duration: 3600 }) // 20 image uploads per hour
  @ApiOperation({ summary: 'Upload aquarium image' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    const result = await this.proxyService.post(
      'aquarium-service',
      `/aquariums/${id}/image`,
      formData,
      {
        headers: {
          authorization: req.headers.authorization,
          'content-type': 'multipart/form-data',
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}`);

    return result;
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Delete aquarium image' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 204, description: 'Image deleted successfully' })
  async deleteImage(@Param('id') id: string, @Request() req: any) {
    const result = await this.proxyService.delete('aquarium-service', `/aquariums/${id}/image`, {
      headers: {
        authorization: req.headers.authorization,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}`);

    return result;
  }

  // Equipment endpoints
  @Get(':id/equipment')
  @ApiOperation({ summary: 'Get aquarium equipment' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Equipment retrieved successfully' })
  async getEquipment(@Param('id') id: string, @Request() req: any) {
    return this.cacheService.remember(
      `aquarium:${id}:equipment`,
      () => this.proxyService.get('aquarium-service', `/aquariums/${id}/equipment`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Post(':id/equipment')
  @ApiOperation({ summary: 'Add equipment to aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Equipment added successfully' })
  async addEquipment(
    @Param('id') id: string,
    @Body() addEquipmentDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.post(
      'aquarium-service',
      `/aquariums/${id}/equipment`,
      addEquipmentDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:equipment`);

    return result;
  }

  @Put(':id/equipment/:equipmentId')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Equipment updated successfully' })
  async updateEquipment(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body() updateEquipmentDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.put(
      'aquarium-service',
      `/aquariums/${id}/equipment/${equipmentId}`,
      updateEquipmentDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:equipment`);

    return result;
  }

  @Delete(':id/equipment/:equipmentId')
  @ApiOperation({ summary: 'Remove equipment' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @ApiResponse({ status: 204, description: 'Equipment removed successfully' })
  async removeEquipment(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Request() req: any,
  ) {
    const result = await this.proxyService.delete(
      'aquarium-service',
      `/aquariums/${id}/equipment/${equipmentId}`,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:equipment`);

    return result;
  }

  // Inhabitants endpoints
  @Get(':id/inhabitants')
  @ApiOperation({ summary: 'Get aquarium inhabitants' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Inhabitants retrieved successfully' })
  async getInhabitants(
    @Param('id') id: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return this.cacheService.remember(
      `aquarium:${id}:inhabitants:${JSON.stringify(query)}`,
      () => this.proxyService.get('aquarium-service', `/aquariums/${id}/inhabitants`, {
        params: query,
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 300 } // Cache for 5 minutes
    );
  }

  @Post(':id/inhabitants')
  @ApiOperation({ summary: 'Add inhabitant to aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Inhabitant added successfully' })
  async addInhabitant(
    @Param('id') id: string,
    @Body() addInhabitantDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.post(
      'aquarium-service',
      `/aquariums/${id}/inhabitants`,
      addInhabitantDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:inhabitants:*`);

    return result;
  }

  @Put(':id/inhabitants/:inhabitantId')
  @ApiOperation({ summary: 'Update inhabitant' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'inhabitantId', description: 'Inhabitant ID' })
  @ApiResponse({ status: 200, description: 'Inhabitant updated successfully' })
  async updateInhabitant(
    @Param('id') id: string,
    @Param('inhabitantId') inhabitantId: string,
    @Body() updateInhabitantDto: any,
    @Request() req: any,
  ) {
    const result = await this.proxyService.put(
      'aquarium-service',
      `/aquariums/${id}/inhabitants/${inhabitantId}`,
      updateInhabitantDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:inhabitants:*`);

    return result;
  }

  @Delete(':id/inhabitants/:inhabitantId')
  @ApiOperation({ summary: 'Remove inhabitant' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'inhabitantId', description: 'Inhabitant ID' })
  @ApiResponse({ status: 204, description: 'Inhabitant removed successfully' })
  async removeInhabitant(
    @Param('id') id: string,
    @Param('inhabitantId') inhabitantId: string,
    @Request() req: any,
  ) {
    const result = await this.proxyService.delete(
      'aquarium-service',
      `/aquariums/${id}/inhabitants/${inhabitantId}`,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );

    // Invalidate cache
    await this.cacheService.del(`aquarium:${id}:inhabitants:*`);

    return result;
  }

  // Water parameters endpoints
  @Get(':id/parameters')
  @ApiOperation({ summary: 'Get water parameters history' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Parameters retrieved successfully' })
  async getParameters(
    @Param('id') id: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return this.proxyService.get('aquarium-service', `/aquariums/${id}/parameters`, {
      params: query,
      headers: {
        authorization: req.headers.authorization,
      },
    });
  }

  @Post(':id/parameters')
  @RateLimit({ points: 50, duration: 3600 }) // 50 parameter recordings per hour per aquarium
  @ApiOperation({ summary: 'Record water parameters' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Parameters recorded successfully' })
  async recordParameters(
    @Param('id') id: string,
    @Body() parametersDto: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(
      'aquarium-service',
      `/aquariums/${id}/parameters`,
      parametersDto,
      {
        headers: {
          authorization: req.headers.authorization,
        },
      },
    );
  }

  @Get(':id/parameters/latest')
  @ApiOperation({ summary: 'Get latest water parameters' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Latest parameters retrieved' })
  async getLatestParameters(@Param('id') id: string, @Request() req: any) {
    return this.cacheService.remember(
      `aquarium:${id}:parameters:latest`,
      () => this.proxyService.get('aquarium-service', `/aquariums/${id}/parameters/latest`, {
        headers: {
          authorization: req.headers.authorization,
        },
      }),
      { ttl: 60 } // Cache for 1 minute
    );
  }
}