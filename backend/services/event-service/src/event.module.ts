import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { EventController } from './application/controllers/event.controller';
import { EventService } from './application/services/event.service';
import { EventDomainService } from './domain/services/event.domain.service';
import { EventRepository } from './infrastructure/database/repositories/event.repository';
import { Event, EventSchema } from './infrastructure/database/schemas/event.schema';
import { HealthController } from './application/controllers/health.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
    ]),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
  ],
  controllers: [EventController, HealthController],
  providers: [
    EventService,
    {
      provide: EventDomainService,
      useFactory: (repo, config, events) => 
        new EventDomainService(repo, config, events),
      inject: ['IEventRepository', ConfigService, EventEmitter2],
    },
    {
      provide: 'IEventRepository',
      useClass: EventRepository,
    },
  ],
})
export class EventModule {}