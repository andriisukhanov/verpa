import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AquariumRepository } from './database/repositories/aquarium.repository';
import { WaterParametersRepository } from './database/repositories/water-parameters.repository';
import { Aquarium, AquariumSchema } from './database/schemas/aquarium.schema';
import { WaterParameters, WaterParametersSchema } from './database/schemas/water-parameters.schema';
import { StorageService } from './storage/storage.service';
import { EventPublisher } from './messaging/event.publisher';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Aquarium.name, schema: AquariumSchema },
      { name: WaterParameters.name, schema: WaterParametersSchema },
    ]),
  ],
  providers: [
    // Repositories
    {
      provide: 'IAquariumRepository',
      useClass: AquariumRepository,
    },
    {
      provide: 'IWaterParametersRepository',
      useClass: WaterParametersRepository,
    },
    // Services
    StorageService,
    EventPublisher,
  ],
  exports: [
    'IAquariumRepository',
    'IWaterParametersRepository',
    StorageService,
    EventPublisher,
  ],
})
export class SharedModule {}