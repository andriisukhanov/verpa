import { Module } from '@nestjs/common';
import { AquariumController } from './controllers/aquarium.controller';
import { AquariumService } from './services/aquarium.service';
import { AquariumDomainService } from '../domain/services/aquarium.domain.service';

@Module({
  controllers: [AquariumController],
  providers: [
    AquariumService,
    {
      provide: AquariumDomainService,
      useFactory: (
        aquariumRepository: any,
        waterParametersRepository: any,
        configService: any,
        eventEmitter: any,
      ) => {
        return new AquariumDomainService(
          aquariumRepository,
          waterParametersRepository,
          configService,
          eventEmitter,
        );
      },
      inject: ['IAquariumRepository', 'IWaterParametersRepository', 'ConfigService', 'EventEmitter2'],
    },
  ],
})
export class AquariumModule {}