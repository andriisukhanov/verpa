import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { ProxyModule } from '../../services/proxy/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [EventsController],
})
export class EventsModule {}