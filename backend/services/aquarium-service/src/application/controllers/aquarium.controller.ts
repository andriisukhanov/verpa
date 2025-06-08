import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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
import { AquariumService } from '../services/aquarium.service';
import { CreateAquariumDto } from '../dto/create-aquarium.dto';
import { UpdateAquariumDto } from '../dto/update-aquarium.dto';
import { AddEquipmentDto } from '../dto/add-equipment.dto';
import { AddInhabitantDto } from '../dto/add-inhabitant.dto';
import { RecordParametersDto } from '../dto/record-parameters.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WaterType } from '@verpa/common';
import { StorageService } from '../../infrastructure/storage/storage.service';

@ApiTags('aquariums')
@Controller('aquariums')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AquariumController {
  constructor(
    private readonly aquariumService: AquariumService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new aquarium' })
  @ApiResponse({ status: 201, description: 'Aquarium created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or limit reached' })
  async create(
    @Body() createDto: CreateAquariumDto,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.create(user.id, createDto, user.subscriptionType);
  }

  @Get()
  @ApiOperation({ summary: 'Get all aquariums for current user' })
  @ApiQuery({ name: 'waterType', required: false, enum: WaterType })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'List of aquariums' })
  async findAll(
    @CurrentUser() user: any,
    @Query('waterType') waterType?: WaterType,
    @Query('includeDeleted') includeDeleted?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.aquariumService.findAll({
      userId: user.id,
      waterType,
      includeDeleted,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public aquariums' })
  @ApiQuery({ name: 'waterType', required: false, enum: WaterType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of public aquariums' })
  async findPublic(
    @Query('waterType') waterType?: WaterType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.aquariumService.findPublicAquariums({
      waterType,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aquarium statistics for current user' })
  @ApiResponse({ status: 200, description: 'Aquarium statistics' })
  async getStats(@CurrentUser() user: any) {
    return this.aquariumService.getUserStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get aquarium by ID' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium details' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium updated successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAquariumDto,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 204, description: 'Aquarium deleted successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.aquariumService.delete(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore deleted aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Aquarium restored successfully' })
  @ApiResponse({ status: 404, description: 'Aquarium not found' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.restore(id, user.id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
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
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const imageUrl = await this.storageService.uploadAquariumImage(
      id,
      file.buffer,
      file.mimetype,
    );

    return this.aquariumService.updateImage(id, user.id, imageUrl);
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete aquarium image' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 204, description: 'Image deleted successfully' })
  async deleteImage(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.aquariumService.deleteImage(id, user.id);
  }

  // Equipment endpoints
  @Post(':id/equipment')
  @ApiOperation({ summary: 'Add equipment to aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Equipment added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or limit reached' })
  async addEquipment(
    @Param('id') id: string,
    @Body() addEquipmentDto: AddEquipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.addEquipment(id, user.id, addEquipmentDto);
  }

  @Put(':id/equipment/:equipmentId')
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Equipment updated successfully' })
  async updateEquipment(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body() updateDto: Partial<AddEquipmentDto>,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.updateEquipment(id, user.id, equipmentId, updateDto);
  }

  @Delete(':id/equipment/:equipmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove equipment' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @ApiResponse({ status: 204, description: 'Equipment removed successfully' })
  async removeEquipment(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @CurrentUser() user: any,
  ) {
    await this.aquariumService.removeEquipment(id, user.id, equipmentId);
  }

  @Post(':id/equipment/:equipmentId/maintenance')
  @ApiOperation({ summary: 'Perform equipment maintenance' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment ID' })
  @ApiBody({ schema: { type: 'object', properties: { notes: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Maintenance recorded' })
  async performMaintenance(
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.performEquipmentMaintenance(id, user.id, equipmentId, notes);
  }

  // Inhabitant endpoints
  @Post(':id/inhabitants')
  @ApiOperation({ summary: 'Add inhabitant to aquarium' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Inhabitant added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or compatibility issue' })
  async addInhabitant(
    @Param('id') id: string,
    @Body() addInhabitantDto: AddInhabitantDto,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.addInhabitant(id, user.id, addInhabitantDto);
  }

  @Put(':id/inhabitants/:inhabitantId')
  @ApiOperation({ summary: 'Update inhabitant' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'inhabitantId', description: 'Inhabitant ID' })
  @ApiResponse({ status: 200, description: 'Inhabitant updated successfully' })
  async updateInhabitant(
    @Param('id') id: string,
    @Param('inhabitantId') inhabitantId: string,
    @Body() updateDto: Partial<AddInhabitantDto>,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.updateInhabitant(id, user.id, inhabitantId, updateDto);
  }

  @Delete(':id/inhabitants/:inhabitantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove inhabitant' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiParam({ name: 'inhabitantId', description: 'Inhabitant ID' })
  @ApiResponse({ status: 204, description: 'Inhabitant removed successfully' })
  async removeInhabitant(
    @Param('id') id: string,
    @Param('inhabitantId') inhabitantId: string,
    @CurrentUser() user: any,
  ) {
    await this.aquariumService.removeInhabitant(id, user.id, inhabitantId);
  }

  // Water parameters endpoints
  @Post(':id/parameters')
  @ApiOperation({ summary: 'Record water parameters' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 201, description: 'Parameters recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async recordParameters(
    @Param('id') id: string,
    @Body() parametersDto: RecordParametersDto,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.recordWaterParameters(id, user.id, parametersDto);
  }

  @Get(':id/parameters')
  @ApiOperation({ summary: 'Get water parameters history' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiQuery({ name: 'from', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Parameters history' })
  async getParametersHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
  ) {
    const options: any = { limit };
    if (from) options.from = new Date(from);
    if (to) options.to = new Date(to);

    return this.aquariumService.getParameterHistory(id, user.id, options);
  }

  @Get(':id/parameters/latest')
  @ApiOperation({ summary: 'Get latest water parameters' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Latest parameters' })
  async getLatestParameters(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.getLatestParameters(id, user.id);
  }

  @Get(':id/parameters/trends')
  @ApiOperation({ summary: 'Get parameter trends' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiQuery({ name: 'days', required: false, type: Number, default: 30 })
  @ApiResponse({ status: 200, description: 'Parameter trends' })
  async getParameterTrends(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('days') days: number = 30,
  ) {
    return this.aquariumService.getParameterTrends(id, user.id, days);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get aquarium health status' })
  @ApiParam({ name: 'id', description: 'Aquarium ID' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealthStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.aquariumService.getHealthStatus(id, user.id);
  }
}