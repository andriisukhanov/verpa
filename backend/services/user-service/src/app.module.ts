import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { LoggingModule, RequestLoggingMiddleware, MorganMiddleware } from '@verpa/logging';
import { createLoggingConfig } from '@verpa/logging/dist/config/logging.config';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    LoggingModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createLoggingConfig('user-service'),
    }),
    DatabaseModule,
    TerminusModule,
    UserModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware, MorganMiddleware)
      .exclude('/health')
      .forRoutes('*');
  }
}