import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Aquarium } from '../entities/aquarium.entity';
import { Equipment } from '../entities/equipment.entity';
import { Inhabitant } from '../entities/inhabitant.entity';
import { WaterParameters } from '../entities/water-parameters.entity';
import { IAquariumRepository } from '../repositories/aquarium.repository.interface';
import { IWaterParametersRepository } from '../repositories/water-parameters.repository.interface';
import { WaterType, AquariumStatus, SubscriptionType } from '@verpa/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AquariumDomainService {
  constructor(
    private readonly aquariumRepository: IAquariumRepository,
    private readonly waterParametersRepository: IWaterParametersRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAquarium(
    userId: string,
    data: Partial<Aquarium>,
    subscriptionType: SubscriptionType,
  ): Promise<Aquarium> {
    // Check user limits
    const currentCount = await this.aquariumRepository.countByUserId(userId);
    const limits = this.configService.get('limits.maxAquariumsPerUser');
    const maxAquariums = limits[subscriptionType.toLowerCase()];

    if (maxAquariums !== -1 && currentCount >= maxAquariums) {
      throw new BadRequestException(
        `You have reached the maximum number of aquariums (${maxAquariums}) for your ${subscriptionType} subscription`,
      );
    }

    // Create aquarium entity
    const aquarium = new Aquarium({
      ...data,
      userId,
      status: AquariumStatus.ACTIVE,
    });

    // Validate aquarium
    this.validateAquarium(aquarium);

    // Save aquarium
    const savedAquarium = await this.aquariumRepository.create(aquarium);

    // Emit event
    this.eventEmitter.emit('aquarium.created', {
      aquariumId: savedAquarium.id,
      userId: savedAquarium.userId,
      waterType: savedAquarium.waterType,
    });

    return savedAquarium;
  }

  async updateAquarium(
    aquariumId: string,
    userId: string,
    updates: Partial<Aquarium>,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    // Apply updates
    Object.assign(aquarium, updates);
    aquarium.updatedAt = new Date();

    // Validate
    this.validateAquarium(aquarium);

    // Save
    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to update aquarium');
    }

    // Emit event
    this.eventEmitter.emit('aquarium.updated', {
      aquariumId: updatedAquarium.id,
      userId: updatedAquarium.userId,
      updates,
    });

    return updatedAquarium;
  }

  async deleteAquarium(aquariumId: string, userId: string): Promise<void> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.markAsDeleted();
    await this.aquariumRepository.update(aquariumId, aquarium);

    // Emit event
    this.eventEmitter.emit('aquarium.deleted', {
      aquariumId: aquarium.id,
      userId: aquarium.userId,
    });
  }

  async restoreAquarium(aquariumId: string, userId: string): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.restore();
    const restoredAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!restoredAquarium) {
      throw new Error('Failed to restore aquarium');
    }

    // Emit event
    this.eventEmitter.emit('aquarium.restored', {
      aquariumId: restoredAquarium.id,
      userId: restoredAquarium.userId,
    });

    return restoredAquarium;
  }

  async addEquipment(
    aquariumId: string,
    userId: string,
    equipmentData: Partial<Equipment>,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    // Check equipment limit
    const maxEquipment = this.configService.get<number>('limits.maxEquipmentPerAquarium');
    if (aquarium.equipment.length >= maxEquipment) {
      throw new BadRequestException(`Maximum equipment limit (${maxEquipment}) reached`);
    }

    const equipment = new Equipment(equipmentData);
    aquarium.addEquipment(equipment);

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to add equipment');
    }

    // Emit event
    this.eventEmitter.emit('equipment.added', {
      aquariumId: aquarium.id,
      equipmentId: equipment.id,
      equipmentType: equipment.type,
    });

    return updatedAquarium;
  }

  async updateEquipment(
    aquariumId: string,
    userId: string,
    equipmentId: string,
    updates: Partial<Equipment>,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.updateEquipment(equipmentId, updates);

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to update equipment');
    }

    return updatedAquarium;
  }

  async removeEquipment(
    aquariumId: string,
    userId: string,
    equipmentId: string,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.removeEquipment(equipmentId);

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to remove equipment');
    }

    // Emit event
    this.eventEmitter.emit('equipment.removed', {
      aquariumId: aquarium.id,
      equipmentId,
    });

    return updatedAquarium;
  }

  async addInhabitant(
    aquariumId: string,
    userId: string,
    inhabitantData: Partial<Inhabitant>,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    // Check inhabitants limit
    const maxInhabitants = this.configService.get<number>('limits.maxInhabitantsPerAquarium');
    if (aquarium.inhabitants.length >= maxInhabitants) {
      throw new BadRequestException(`Maximum inhabitants limit (${maxInhabitants}) reached`);
    }

    const inhabitant = new Inhabitant(inhabitantData);
    
    // Check compatibility
    this.checkInhabitantCompatibility(aquarium, inhabitant);

    aquarium.addInhabitant(inhabitant);

    // Check if overstocked
    if (aquarium.isOverstocked()) {
      this.eventEmitter.emit('aquarium.overstocked', {
        aquariumId: aquarium.id,
        bioload: aquarium.calculateBioload(),
        volume: aquarium.volume,
      });
    }

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to add inhabitant');
    }

    // Emit event
    this.eventEmitter.emit('inhabitant.added', {
      aquariumId: aquarium.id,
      inhabitantId: inhabitant.id,
      species: inhabitant.species,
    });

    return updatedAquarium;
  }

  async updateInhabitant(
    aquariumId: string,
    userId: string,
    inhabitantId: string,
    updates: Partial<Inhabitant>,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.updateInhabitant(inhabitantId, updates);

    // Check if overstocked after update
    if (aquarium.isOverstocked()) {
      this.eventEmitter.emit('aquarium.overstocked', {
        aquariumId: aquarium.id,
        bioload: aquarium.calculateBioload(),
        volume: aquarium.volume,
      });
    }

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to update inhabitant');
    }

    return updatedAquarium;
  }

  async removeInhabitant(
    aquariumId: string,
    userId: string,
    inhabitantId: string,
  ): Promise<Aquarium> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    aquarium.removeInhabitant(inhabitantId);

    const updatedAquarium = await this.aquariumRepository.update(aquariumId, aquarium);
    if (!updatedAquarium) {
      throw new Error('Failed to remove inhabitant');
    }

    // Emit event
    this.eventEmitter.emit('inhabitant.removed', {
      aquariumId: aquarium.id,
      inhabitantId,
    });

    return updatedAquarium;
  }

  async recordWaterParameters(
    aquariumId: string,
    userId: string,
    parameters: Partial<WaterParameters>,
  ): Promise<WaterParameters> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    const waterParameters = new WaterParameters({
      ...parameters,
      aquariumId,
      recordedBy: userId,
    });

    // Validate parameters for water type
    this.validateWaterParameters(aquarium.waterType, waterParameters);

    // Save parameters
    const savedParameters = await this.waterParametersRepository.create(waterParameters);

    // Update aquarium with latest parameters
    aquarium.updateWaterParameters(savedParameters);
    await this.aquariumRepository.update(aquariumId, aquarium);

    // Check health status
    const healthStatus = aquarium.getHealthStatus();
    if (healthStatus === 'critical') {
      this.eventEmitter.emit('aquarium.critical', {
        aquariumId: aquarium.id,
        parameters: savedParameters,
        healthStatus,
      });
    } else if (healthStatus === 'warning') {
      this.eventEmitter.emit('aquarium.warning', {
        aquariumId: aquarium.id,
        parameters: savedParameters,
        healthStatus,
      });
    }

    // Check if water change is needed
    if (aquarium.needsWaterChange()) {
      this.eventEmitter.emit('aquarium.waterChangeNeeded', {
        aquariumId: aquarium.id,
        parameters: savedParameters,
      });
    }

    return savedParameters;
  }

  async getParameterHistory(
    aquariumId: string,
    userId: string,
    options: { from?: Date; to?: Date; limit?: number } = {},
  ): Promise<WaterParameters[]> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    return this.waterParametersRepository.findByAquariumId(aquariumId, options);
  }

  async getParameterTrends(
    aquariumId: string,
    userId: string,
    days: number = 30,
  ): Promise<any> {
    const aquarium = await this.aquariumRepository.findByIdAndUserId(aquariumId, userId);
    if (!aquarium) {
      throw new NotFoundException('Aquarium not found');
    }

    return this.waterParametersRepository.getParameterTrends(aquariumId, days);
  }

  private validateAquarium(aquarium: Aquarium): void {
    if (!aquarium.name || aquarium.name.trim().length === 0) {
      throw new BadRequestException('Aquarium name is required');
    }

    if (aquarium.volume <= 0) {
      throw new BadRequestException('Aquarium volume must be positive');
    }

    if (aquarium.dimensions) {
      if (
        aquarium.dimensions.length <= 0 ||
        aquarium.dimensions.width <= 0 ||
        aquarium.dimensions.height <= 0
      ) {
        throw new BadRequestException('Aquarium dimensions must be positive');
      }
    }
  }

  private validateWaterParameters(waterType: WaterType, parameters: WaterParameters): void {
    // Common validations
    if (parameters.temperature < 0 || parameters.temperature > 50) {
      throw new BadRequestException('Temperature must be between 0-50°C');
    }

    if (parameters.ph < 0 || parameters.ph > 14) {
      throw new BadRequestException('pH must be between 0-14');
    }

    // Water type specific validations
    if (waterType === WaterType.SALTWATER || waterType === WaterType.REEF) {
      if (parameters.salinity && (parameters.salinity < 0 || parameters.salinity > 50)) {
        throw new BadRequestException('Salinity must be between 0-50 ppt');
      }
    } else {
      if (parameters.salinity) {
        throw new BadRequestException('Salinity should not be recorded for freshwater aquariums');
      }
    }
  }

  private checkInhabitantCompatibility(aquarium: Aquarium, inhabitant: Inhabitant): void {
    // Check water type compatibility
    if (aquarium.waterType === WaterType.FRESHWATER && inhabitant.type === 'coral') {
      throw new BadRequestException('Corals cannot live in freshwater');
    }

    if (
      (aquarium.waterType === WaterType.SALTWATER || aquarium.waterType === WaterType.REEF) &&
      inhabitant.type === 'plant'
    ) {
      throw new BadRequestException('Freshwater plants cannot live in saltwater');
    }

    // Check parameter compatibility if latest parameters exist
    if (aquarium.latestParameters) {
      if (!inhabitant.isCompatibleWithTemperature(aquarium.latestParameters.temperature)) {
        throw new BadRequestException(
          `Current temperature (${aquarium.latestParameters.temperature}°C) is not suitable for ${inhabitant.species}`,
        );
      }

      if (!inhabitant.isCompatibleWithPh(aquarium.latestParameters.ph)) {
        throw new BadRequestException(
          `Current pH (${aquarium.latestParameters.ph}) is not suitable for ${inhabitant.species}`,
        );
      }
    }

    // Check species compatibility
    for (const existing of aquarium.inhabitants) {
      if (!existing.isCompatibleWithSpecies(inhabitant.species)) {
        throw new BadRequestException(
          `${inhabitant.species} is not compatible with ${existing.species}`,
        );
      }
      if (!inhabitant.isCompatibleWithSpecies(existing.species)) {
        throw new BadRequestException(
          `${inhabitant.species} is not compatible with ${existing.species}`,
        );
      }
    }
  }
}