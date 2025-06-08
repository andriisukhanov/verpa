# Health Checks Module - @verpa/health

## Структура модуля

```typescript
// packages/health/src/index.ts
export * from './health.module';
export * from './indicators';
export * from './decorators';
export * from './interfaces';
```

### Health Module

```typescript
// packages/health/src/health.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';

export interface HealthModuleOptions {
  serviceName: string;
  version: string;
  dependencies: {
    mongodb?: boolean;
    redis?: boolean;
    kafka?: boolean;
    s3?: boolean;
    externalApis?: string[];
  };
  customChecks?: HealthIndicator[];
}

@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    const providers = [
      HealthCheckService,
      {
        provide: 'HEALTH_OPTIONS',
        useValue: options,
      },
      ...this.createIndicators(options),
    ];

    return {
      module: HealthModule,
      controllers: [HealthController],
      providers,
      exports: [HealthCheckService],
    };
  }

  private static createIndicators(options: HealthModuleOptions): Provider[] {
    const indicators: Provider[] = [];

    if (options.dependencies.mongodb) {
      indicators.push(MongoHealthIndicator);
    }
    if (options.dependencies.redis) {
      indicators.push(RedisHealthIndicator);
    }
    if (options.dependencies.kafka) {
      indicators.push(KafkaHealthIndicator);
    }
    if (options.dependencies.s3) {
      indicators.push(S3HealthIndicator);
    }

    return indicators;
  }
}
```

### Health Controller

```typescript
// packages/health/src/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    @Inject('HEALTH_OPTIONS') private options: HealthModuleOptions,
    private health: HealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const checks = await this.health.check();
    
    return {
      status: checks.status,
      info: {
        service: this.options.serviceName,
        version: this.options.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      details: checks.details,
    };
  }

  @Get('live')
  liveness() {
    // Простая проверка - сервис отвечает
    return {
      status: 'ok',
      service: this.options.serviceName,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness() {
    // Проверка готовности принимать трафик
    const isReady = await this.health.isReady();
    
    if (!isReady) {
      throw new ServiceUnavailableException('Service not ready');
    }
    
    return {
      status: 'ready',
      service: this.options.serviceName,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('startup')
  async startup() {
    // Для K8s startup probe
    const startupChecks = await this.health.checkStartupDependencies();
    
    if (!startupChecks.healthy) {
      throw new ServiceUnavailableException(
        `Startup dependencies not ready: ${startupChecks.failed.join(', ')}`
      );
    }
    
    return {
      status: 'started',
      service: this.options.serviceName,
      dependencies: startupChecks.details,
    };
  }
}
```

### Health Indicators

```typescript
// packages/health/src/indicators/mongo.indicator.ts
@Injectable()
export class MongoHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private connection: Connection) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const start = Date.now();
      await this.connection.db.admin().ping();
      const responseTime = Date.now() - start;

      return this.getStatus(key, true, {
        responseTime,
        status: this.connection.readyState === 1 ? 'connected' : 'disconnected',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: error.message,
        error: error.name,
      });
    }
  }
}

// packages/health/src/indicators/kafka.indicator.ts
@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  constructor(@Inject('KAFKA_CLIENT') private kafka: Kafka) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const [cluster, topics] = await Promise.all([
        admin.describeCluster(),
        admin.listTopics(),
      ]);
      
      await admin.disconnect();

      return this.getStatus(key, true, {
        brokers: cluster.brokers.length,
        topics: topics.length,
        clusterId: cluster.clusterId,
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: 'Kafka connection failed',
        error: error.message,
      });
    }
  }
}
```

## Конфигурация для каждого микросервиса

### User Service Config

```typescript
// private/user-service/src/config/configuration.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface UserServiceConfig {
  app: {
    name: string;
    version: string;
    env: 'development' | 'staging' | 'production';
    port: number;
    host: string;
  };
  
  mongodb: {
    uri: string;
    database: string;
    options: {
      retryWrites: boolean;
      w: string;
    };
  };
  
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
    ssl: boolean;
    sasl?: {
      mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
      username: string;
      password: string;
    };
  };
  
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  aws: {
    region: string;
    ses: {
      from: string;
      configurationSet: string;
    };
  };
  
  limits: {
    maxSessionsPerUser: {
      free: number;
      premium: number;
    };
  };
}

export default registerAs('userService', (): UserServiceConfig => ({
  app: {
    name: 'user-service',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV as any || 'development',
    port: parseInt(process.env.PORT, 10) || 3001,
    host: process.env.HOST || '0.0.0.0',
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'verpa_users',
    options: {
      retryWrites: true,
      w: 'majority',
    },
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: 'user-service',
    groupId: 'user-service-group',
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME ? {
      mechanism: 'scram-sha-512',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD!,
    } : undefined,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    ses: {
      from: process.env.AWS_SES_FROM || 'noreply@verpa.app',
      configurationSet: process.env.AWS_SES_CONFIG_SET || 'verpa-transactional',
    },
  },
  
  limits: {
    maxSessionsPerUser: {
      free: 1,      // Только одна сессия для бесплатных
      premium: 5,   // До 5 устройств для премиум
    },
  },
}));

// Validation Schema
export const userServiceValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .required(),
  
  PORT: Joi.number().default(3001),
  
  MONGODB_URI: Joi.string().required(),
  MONGODB_DATABASE: Joi.string().required(),
  
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
  
  KAFKA_BROKERS: Joi.string().required(),
  
  JWT_SECRET: Joi.string().min(32).required(),
  
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_SES_FROM: Joi.string().email().required(),
});
```

## Человекочитаемые ошибки и логирование

### Error Messages

```typescript
// packages/common/src/errors/error-messages.ts
export const ERROR_MESSAGES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH001',
    message: 'Неверный email или пароль',
    userMessage: 'Проверьте правильность введенных данных',
  },
  
  AUTH_EMAIL_NOT_VERIFIED: {
    code: 'AUTH002',
    message: 'Email не подтвержден',
    userMessage: 'Пожалуйста, подтвердите ваш email перед входом',
  },
  
  AUTH_SESSION_LIMIT_FREE: {
    code: 'AUTH003',
    message: 'Превышен лимит сессий для бесплатного аккаунта',
    userMessage: 'Вы можете использовать Verpa только на одном устройстве. Обновитесь до Premium для использования на нескольких устройствах.',
  },
  
  AUTH_ACCOUNT_SUSPENDED: {
    code: 'AUTH004',
    message: 'Аккаунт заблокирован',
    userMessage: 'Ваш аккаунт временно заблокирован. Обратитесь в поддержку.',
  },
  
  // Aquarium
  AQUARIUM_LIMIT_FREE: {
    code: 'AQ001',
    message: 'Достигнут лимит аквариумов',
    userMessage: 'В бесплатной версии можно создать только 1 аквариум. Обновитесь до Premium для неограниченного количества.',
  },
  
  AQUARIUM_NOT_FOUND: {
    code: 'AQ002',
    message: 'Аквариум не найден',
    userMessage: 'Аквариум не найден или у вас нет доступа к нему',
  },
  
  // Events
  EVENT_DAILY_LIMIT: {
    code: 'EV001',
    message: 'Достигнут дневной лимит событий',
    userMessage: 'Вы достигли лимита в 5 событий в день. Попробуйте завтра или обновитесь до Premium.',
  },
  
  // System
  SYSTEM_MAINTENANCE: {
    code: 'SYS001',
    message: 'Техническое обслуживание',
    userMessage: 'Сервис временно недоступен. Попробуйте через несколько минут.',
  },
  
  SYSTEM_OVERLOAD: {
    code: 'SYS002',
    message: 'Сервис перегружен',
    userMessage: 'Слишком много запросов. Пожалуйста, подождите немного.',
  },
} as const;

// Error formatter
export class UserFriendlyError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public technicalMessage: string,
    public statusCode: number = 400,
    public metadata?: Record<string, any>
  ) {
    super(technicalMessage);
    this.name = 'UserFriendlyError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      timestamp: new Date().toISOString(),
      ...(this.metadata && { details: this.metadata }),
    };
  }
}
```

### Structured Logging

```typescript
// packages/common/src/logging/logger.service.ts
import * as winston from 'winston';
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private serviceName: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { 
        service: serviceName,
        env: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
      },
      transports: [
        // Console для разработки
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}] ${message} ${metaStr}`;
            }),
          ),
        }),
        
        // File для продакшена
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        }),
        
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        }),
      ],
    });
  }

  log(message: string, context?: any) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: any) {
    this.logger.error(message, { 
      trace, 
      context,
      stack: trace,
    });
  }

  warn(message: string, context?: any) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: any) {
    this.logger.debug(message, { context });
  }

  // Специальные методы для бизнес-событий
  logUserAction(action: string, userId: string, metadata?: any) {
    this.logger.info('User action', {
      type: 'user_action',
      action,
      userId,
      ...metadata,
    });
  }

  logBusinessEvent(event: string, data: any) {
    this.logger.info('Business event', {
      type: 'business_event',
      event,
      data,
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any) {
    this.logger.info('Performance metric', {
      type: 'performance',
      operation,
      duration,
      ...metadata,
    });
  }
}
```

## Управление сессиями (одно устройство для Free)

### Session Management Service

```typescript
// private/user-service/src/domain/services/session-management.service.ts
@Injectable()
export class SessionManagementService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
    private readonly redis: Redis,
    private readonly eventBus: EventBus,
    private readonly logger: LoggerService,
  ) {}

  async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string
  ): Promise<{ accessToken: string; refreshToken: string; kicked?: boolean }> {
    const user = await this.userRepository.findById(userId);
    const maxSessions = this.getMaxSessions(user.subscription.type);
    
    // Получаем активные сессии
    const activeSessions = await this.sessionRepository.findActiveByUserId(userId);
    
    let kicked = false;
    
    // Для бесплатных пользователей - только одна сессия
    if (user.subscription.type === 'free' && activeSessions.length > 0) {
      // Завершаем все предыдущие сессии
      for (const session of activeSessions) {
        await this.terminateSession(session.id, 'new_login');
        
        // Отправляем push уведомление на старое устройство
        await this.eventBus.publish({
          topic: 'notification.send',
          data: {
            userId,
            type: 'session_terminated',
            title: 'Вход с другого устройства',
            body: 'Ваша сессия была завершена, так как вы вошли с другого устройства',
            deviceToken: session.deviceToken,
          },
        });
      }
      
      kicked = true;
      
      this.logger.logUserAction('session_kicked', userId, {
        reason: 'free_account_limit',
        previousDevice: activeSessions[0].deviceInfo,
        newDevice: deviceInfo,
      });
    }
    
    // Для премиум - проверяем лимит
    if (user.subscription.type === 'premium' && activeSessions.length >= maxSessions) {
      // Удаляем самую старую сессию
      const oldestSession = activeSessions.sort((a, b) => 
        a.lastActivityAt.getTime() - b.lastActivityAt.getTime()
      )[0];
      
      await this.terminateSession(oldestSession.id, 'max_sessions_reached');
    }
    
    // Создаем новую сессию
    const session = await this.sessionRepository.create({
      userId,
      deviceInfo,
      ipAddress,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    });
    
    // Генерируем токены
    const accessToken = this.generateAccessToken(user, session.id);
    const refreshToken = this.generateRefreshToken(user.id, session.id);
    
    // Сохраняем refresh token
    await this.redis.setex(
      `refresh:${session.id}`,
      30 * 24 * 60 * 60, // 30 дней
      refreshToken
    );
    
    this.logger.logBusinessEvent('session_created', {
      userId,
      sessionId: session.id,
      deviceType: deviceInfo.type,
      kicked,
    });
    
    return { accessToken, refreshToken, kicked };
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return;
    
    // Помечаем сессию как неактивную
    session.terminate(reason);
    await this.sessionRepository.save(session);
    
    // Удаляем refresh token
    await this.redis.del(`refresh:${sessionId}`);
    
    // Инвалидируем access token
    const ttl = 60 * 60; // 1 час на случай если токен еще используется
    await this.redis.setex(`blacklist:${sessionId}`, ttl, '1');
    
    // Публикуем событие
    await this.eventBus.publish({
      topic: 'user.session.terminated',
      data: {
        userId: session.userId,
        sessionId,
        reason,
        timestamp: new Date(),
      },
    });
  }

  private getMaxSessions(subscriptionType: SubscriptionType): number {
    return subscriptionType === 'free' ? 1 : 5;
  }

  private generateAccessToken(user: User, sessionId: string): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      subscription: user.subscription.type,
      sessionId,
    }, {
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(userId: string, sessionId: string): string {
    return this.jwtService.sign({
      sub: userId,
      sessionId,
      type: 'refresh',
    }, {
      expiresIn: '30d',
    });
  }
}
```

### Mobile App - Session Handling

```dart
// Flutter - Session Manager
class SessionManager {
  static const _storage = FlutterSecureStorage();
  static final _authApi = AuthApi();
  
  static StreamController<SessionEvent> _sessionEvents = StreamController.broadcast();
  static Stream<SessionEvent> get events => _sessionEvents.stream;
  
  static Future<void> handleLogin(LoginResponse response) async {
    // Сохраняем токены
    await _storage.write(key: 'access_token', value: response.accessToken);
    await _storage.write(key: 'refresh_token', value: response.refreshToken);
    
    // Проверяем, была ли сессия завершена на другом устройстве
    if (response.kicked == true) {
      _sessionEvents.add(SessionEvent(
        type: SessionEventType.kicked,
        message: 'Вы вошли с другого устройства',
      ));
      
      // Показываем уведомление
      showDialog(
        context: navigatorKey.currentContext!,
        builder: (context) => AlertDialog(
          title: Text('Вход с другого устройства'),
          content: Text(
            'Ваша предыдущая сессия была завершена, так как в бесплатной версии '
            'можно использовать Verpa только на одном устройстве одновременно.'
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Понятно'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/subscription');
              },
              child: Text('Обновить до Premium'),
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).primaryColor,
              ),
            ),
          ],
        ),
      );
    }
  }
  
  static void listenForSessionTermination() {
    // WebSocket для real-time уведомлений
    final ws = WebSocketChannel.connect(
      Uri.parse('wss://api.verpa.app/ws'),
    );
    
    ws.stream.listen((message) {
      final data = jsonDecode(message);
      
      if (data['type'] == 'session_terminated') {
        _handleSessionTerminated(data['reason']);
      }
    });
  }
  
  static Future<void> _handleSessionTerminated(String reason) async {
    // Очищаем локальные данные
    await _storage.deleteAll();
    
    // Уведомляем приложение
    _sessionEvents.add(SessionEvent(
      type: SessionEventType.terminated,
      reason: reason,
    ));
    
    // Показываем диалог и перенаправляем на login
    showDialog(
      context: navigatorKey.currentContext!,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Сессия завершена'),
        content: Text(_getTerminationMessage(reason)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pushNamedAndRemoveUntil(
                '/login',
                (route) => false,
              );
            },
            child: Text('Войти заново'),
          ),
        ],
      ),
    );
  }
  
  static String _getTerminationMessage(String reason) {
    switch (reason) {
      case 'new_login':
        return 'Вы вошли с другого устройства. В бесплатной версии можно использовать только одно устройство.';
      case 'max_sessions_reached':
        return 'Достигнут лимит активных устройств.';
      case 'manual_logout':
        return 'Вы вышли из аккаунта.';
      default:
        return 'Ваша сессия была завершена.';
    }
  }
}
```