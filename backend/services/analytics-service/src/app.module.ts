import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';

// Domain
import { Event, EventSchema } from './infrastructure/database/schemas/event.schema';
import { UserAnalytics, UserAnalyticsSchema } from './infrastructure/database/schemas/user-analytics.schema';
import { MetricEntity } from './infrastructure/database/entities/metric.entity';

// Repositories
import { EventRepository } from './infrastructure/database/repositories/event.repository';
import { MetricRepository } from './infrastructure/database/repositories/metric.repository';
import { UserAnalyticsRepository } from './infrastructure/database/repositories/user-analytics.repository';

// Services
import { AnalyticsService } from './application/services/analytics.service';

// Controllers
import { AnalyticsController } from './application/controllers/analytics.controller';
import { HealthController } from './application/controllers/health.controller';

// Event Handlers
import { EventHandler } from './infrastructure/events/event.handler';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 60,
        limit: 100,
      }),
    }),
    
    // MongoDB for events and user analytics
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: UserAnalytics.name, schema: UserAnalyticsSchema },
    ]),
    
    // PostgreSQL for time-series metrics
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.postgres.host'),
        port: configService.get('database.postgres.port'),
        username: configService.get('database.postgres.username'),
        password: configService.get('database.postgres.password'),
        database: configService.get('database.postgres.database'),
        entities: [MetricEntity],
        synchronize: configService.get('service.env') === 'development',
        logging: configService.get('service.env') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([MetricEntity]),
    
    // Health checks
    TerminusModule,
  ],
  controllers: [
    AnalyticsController,
    HealthController,
  ],
  providers: [
    // Repositories
    {
      provide: 'IEventRepository',
      useClass: EventRepository,
    },
    {
      provide: 'IMetricRepository',
      useClass: MetricRepository,
    },
    {
      provide: 'IUserAnalyticsRepository',
      useClass: UserAnalyticsRepository,
    },
    EventRepository,
    MetricRepository,
    UserAnalyticsRepository,
    
    // Services
    {
      provide: AnalyticsService,
      useFactory: (
        eventRepo: EventRepository,
        metricRepo: MetricRepository,
        userAnalyticsRepo: UserAnalyticsRepository,
        configService: ConfigService,
      ) => {
        return new AnalyticsService(
          eventRepo,
          metricRepo,
          userAnalyticsRepo,
          configService,
        );
      },
      inject: [EventRepository, MetricRepository, UserAnalyticsRepository, ConfigService],
    },
    
    // Event Handlers
    EventHandler,
  ],
})
export class AppModule {}