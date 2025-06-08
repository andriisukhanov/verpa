import { Module } from '@nestjs/common';
import { AquariumsController } from './aquariums.controller';
import { ProxyModule } from '../../services/proxy/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [AquariumsController],
})
export class AquariumsModule {}