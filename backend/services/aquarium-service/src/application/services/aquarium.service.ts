import { Injectable, NotFoundException } from '@nestjs/common';
import { AquariumDomainService } from '../../domain/services/aquarium.domain.service';
import { IAquariumRepository, FindAquariumsOptions } from '../../domain/repositories/aquarium.repository.interface';
import { IWaterParametersRepository } from '../../domain/repositories/water-parameters.repository.interface';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { CreateAquariumDto } from '../dto/create-aquarium.dto';
import { UpdateAquariumDto } from '../dto/update-aquarium.dto';
import { AddEquipmentDto } from '../dto/add-equipment.dto';
import { AddInhabitantDto } from '../dto/add-inhabitant.dto';
import { RecordParametersDto } from '../dto/record-parameters.dto';
import { SubscriptionType } from '@verpa/common';
import { Aquarium } from '../../domain/entities/aquarium.entity';
import { WaterParameters } from '../../domain/entities/water-parameters.entity';

@Injectable()
export class AquariumService {
  constructor(
    private readonly domainService: AquariumDomainService,
    private readonly aquariumRepository: IAquariumRepository,
    private readonly waterParametersRepository: IWaterParametersRepository,
    private readonly storageService: StorageService,
  ) {}

  async create(
    userId: string,
    createDto: CreateAquariumDto,
    subscriptionType: SubscriptionType,
  ): Promise<Aquarium> {
    const aquariumData: Partial<Aquarium> = {
      ...createDto,
      setupDate: createDto.setupDate ? new Date(createDto.setupDate) : new Date(),
    };

    return this.domainService.createAquarium(userId, aquariumData, subscriptionType);
  }

  async findAll(options: FindAquariumsOptions): Promise<{ aquariums: Aquarium[]; total: number }> {
    return this.aquariumRepository.findAll(options);
  }

  async findOne(id: string, userId: string): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(id, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }
    return aquarium;
  }

  async update(id: string, userId: string, updateDto: UpdateAquariumDto): Promise<Aquarium> {
    return this.domainService.updateAquarium(id, userId, updateDto);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.domainService.deleteAquarium(id, userId);
  }

  async restore(id: string, userId: string): Promise<Aquarium> {
    return this.domainService.restoreAquarium(id, userId);
  }

  async updateImage(id: string, userId: string, imageUrl: string): Promise<Aquarium> {
    return this.domainService.updateAquarium(id, userId, { imageUrl });
  }

  async deleteImage(id: string, userId: string): Promise<void> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(id, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    if (aquarium.imageUrl) {
      await this.storageService.deleteFile(aquarium.imageUrl);
      await this.domainService.updateAquarium(id, userId, { imageUrl: undefined });
    }
  }

  async addEquipment(id: string, userId: string, addEquipmentDto: AddEquipmentDto): Promise<Aquarium> {
    const equipmentData = {
      ...addEquipmentDto,
      purchaseDate: addEquipmentDto.purchaseDate ? new Date(addEquipmentDto.purchaseDate) : undefined,
      installDate: addEquipmentDto.installDate ? new Date(addEquipmentDto.installDate) : new Date(),
    };

    return this.domainService.addEquipment(id, userId, equipmentData);
  }

  async updateEquipment(
    id: string,
    userId: string,
    equipmentId: string,
    updateDto: Partial<AddEquipmentDto>,
  ): Promise<Aquarium> {
    const updates = {
      ...updateDto,
      purchaseDate: updateDto.purchaseDate ? new Date(updateDto.purchaseDate) : undefined,
      installDate: updateDto.installDate ? new Date(updateDto.installDate) : undefined,
    };

    return this.domainService.updateEquipment(id, userId, equipmentId, updates);
  }

  async removeEquipment(id: string, userId: string, equipmentId: string): Promise<void> {
    await this.domainService.removeEquipment(id, userId, equipmentId);
  }

  async performEquipmentMaintenance(
    id: string,
    userId: string,
    equipmentId: string,
    notes?: string,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(id, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    const equipment = aquarium.equipment.find(e => e.id === equipmentId);
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    equipment.performMaintenance(notes);
    return this.domainService.updateEquipment(id, userId, equipmentId, equipment);
  }

  async addInhabitant(id: string, userId: string, addInhabitantDto: AddInhabitantDto): Promise<Aquarium> {
    return this.domainService.addInhabitant(id, userId, addInhabitantDto);
  }

  async updateInhabitant(
    id: string,
    userId: string,
    inhabitantId: string,
    updateDto: Partial<AddInhabitantDto>,
  ): Promise<Aquarium> {
    return this.domainService.updateInhabitant(id, userId, inhabitantId, updateDto);
  }

  async removeInhabitant(id: string, userId: string, inhabitantId: string): Promise<void> {
    await this.domainService.removeInhabitant(id, userId, inhabitantId);
  }

  async recordWaterParameters(
    id: string,
    userId: string,
    parametersDto: RecordParametersDto,
  ): Promise<WaterParameters> {
    const parameters = {
      ...parametersDto,
      recordedAt: parametersDto.recordedAt ? new Date(parametersDto.recordedAt) : new Date(),
      lastWaterChange: parametersDto.lastWaterChange ? new Date(parametersDto.lastWaterChange) : undefined,
    };

    return this.domainService.recordWaterParameters(id, userId, parameters);
  }

  async getParameterHistory(
    id: string,
    userId: string,
    options: { from?: Date; to?: Date; limit?: number },
  ): Promise<WaterParameters[]> {
    return this.domainService.getParameterHistory(id, userId, options);
  }

  async getLatestParameters(id: string, userId: string): Promise<WaterParameters | null> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(id, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    return this.waterParametersRepository.findLatestByAquariumId(id);
  }

  async getParameterTrends(id: string, userId: string, days: number = 30): Promise<any> {
    return this.domainService.getParameterTrends(id, userId, days);
  }

  async getHealthStatus(id: string, userId: string): Promise<any> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(id, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    const healthStatus = aquarium.getHealthStatus();
    const needsWaterChange = aquarium.needsWaterChange();
    const isOverstocked = aquarium.isOverstocked();

    // Get equipment that needs maintenance
    const equipmentNeedingMaintenance = aquarium.equipment
      .filter(e => e.needsMaintenance())
      .map(e => ({ id: e.id, name: e.name, type: e.type }));

    return {
      status: healthStatus,
      needsWaterChange,
      isOverstocked,
      bioload: aquarium.calculateBioload(),
      totalInhabitants: aquarium.calculateTotalInhabitants(),
      equipmentNeedingMaintenance,
      latestParameters: aquarium.latestParameters,
    };
  }

  async getUserStats(userId: string): Promise<any> {
    const aquariums = await this.aquariumRepository.findByUserId(userId);
    
    const stats = {
      totalAquariums: aquariums.length,
      activeAquariums: aquariums.filter(a => a.status === 'active').length,
      totalVolume: aquariums.reduce((sum, a) => sum + a.volume, 0),
      byWaterType: {} as Record<string, number>,
      totalEquipment: 0,
      totalInhabitants: 0,
      healthStatus: {
        healthy: 0,
        warning: 0,
        critical: 0,
      },
    };

    for (const aquarium of aquariums) {
      // Count by water type
      stats.byWaterType[aquarium.waterType] = (stats.byWaterType[aquarium.waterType] || 0) + 1;
      
      // Count equipment and inhabitants
      stats.totalEquipment += aquarium.equipment.length;
      stats.totalInhabitants += aquarium.calculateTotalInhabitants();
      
      // Count health status
      const health = aquarium.getHealthStatus();
      stats.healthStatus[health]++;
    }

    return stats;
  }

  async findPublicAquariums(options: Partial<FindAquariumsOptions>): Promise<{ aquariums: Aquarium[]; total: number }> {
    return this.aquariumRepository.findPublicAquariums({
      ...options,
      isPublic: true,
    });
  }
}