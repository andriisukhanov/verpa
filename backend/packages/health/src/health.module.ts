import { Module, DynamicModule, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { ExternalApiHealthIndicator } from './indicators/external-api.health';

export interface HealthModuleOptions {
  serviceName: string;
  indicators?: {
    redis?: boolean;
    kafka?: boolean;
    externalApi?: boolean;
  };
}

@Global()
@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    const providers = [];
    
    if (options.indicators?.redis) {
      providers.push(RedisHealthIndicator);
    }
    
    if (options.indicators?.kafka) {
      providers.push(KafkaHealthIndicator);
    }
    
    if (options.indicators?.externalApi) {
      providers.push(ExternalApiHealthIndicator);
    }

    return {
      module: HealthModule,
      imports: [
        TerminusModule.forRoot({
          logger: false, // Disable default logging
          errorLogStyle: 'pretty',
        }),
        ConfigModule,
      ],
      controllers: [HealthController],
      providers: [
        ...providers,
        {
          provide: 'HEALTH_MODULE_OPTIONS',
          useValue: options,
        },
      ],
      exports: [
        ...providers,
        'HEALTH_MODULE_OPTIONS',
        TerminusModule,
      ],
    };
  }
}