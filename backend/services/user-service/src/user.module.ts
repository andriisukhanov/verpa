import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggingModule } from '@verpa/logging';
import { User, UserSchema } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { SessionModel, SessionSchema } from './infrastructure/schemas/session.schema';
import { SessionRepository } from './infrastructure/repositories/session.repository';
import { UserService } from './domain/services/user.service';
import { SessionService } from './domain/services/session.service';
import { UserController } from './application/controllers/user.controller';
import { AuthController } from './application/controllers/auth.controller';
import { SessionController } from './application/controllers/session.controller';
import { AuthService } from './application/services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { LocalStrategy } from './application/strategies/local.strategy';
import { GoogleStrategy } from './application/strategies/oauth/google.strategy';
import { AppleStrategy } from './application/strategies/oauth/apple.strategy';
import { FacebookStrategy } from './application/strategies/oauth/facebook.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEventHandler } from './application/events/user-event.handler';
import { SessionCleanupTask } from './application/tasks/session-cleanup.task';
import { TokenCleanupTask } from './application/tasks/token-cleanup.task';
import { KafkaModule } from './infrastructure/kafka/kafka.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SessionModel.name, schema: SessionSchema },
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    LoggingModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwt.accessTokenExpiry'),
        },
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
  ],
  controllers: [UserController, AuthController, SessionController],
  providers: [
    UserService,
    SessionService,
    AuthService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'ISessionRepository',
      useClass: SessionRepository,
    },
    UserRepository,
    SessionRepository,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    AppleStrategy,
    FacebookStrategy,
    UserEventHandler,
    SessionCleanupTask,
    TokenCleanupTask,
  ],
  exports: [UserService, AuthService],
})
export class UserModule {}