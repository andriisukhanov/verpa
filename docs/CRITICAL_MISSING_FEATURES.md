# Критичные упущенные функции для MVP

## 1. Аутентификация и безопасность

### Email верификация
```typescript
interface EmailVerificationFlow {
  // 1. После регистрации
  sendVerificationEmail(userId: string, email: string): Promise<void>;
  
  // 2. Токен верификации
  verificationToken: {
    token: string;        // UUID
    expiresAt: Date;      // 24 часа
    userId: string;
    email: string;
  };
  
  // 3. Подтверждение
  verifyEmail(token: string): Promise<void>;
  
  // 4. Повторная отправка
  resendVerification(email: string): Promise<void>;
}

// Email template
const verificationEmailTemplate = {
  subject: 'Подтвердите ваш email - Verpa',
  body: `
    Добро пожаловать в Verpa!
    
    Пожалуйста, подтвердите ваш email, перейдя по ссылке:
    {{verificationUrl}}
    
    Ссылка действительна 24 часа.
  `,
};
```

### Password Reset Flow
```typescript
interface PasswordResetFlow {
  // 1. Запрос сброса
  requestPasswordReset(email: string): Promise<void>;
  
  // 2. Токен сброса
  resetToken: {
    token: string;        // UUID
    expiresAt: Date;      // 1 час
    userId: string;
    used: boolean;
  };
  
  // 3. Проверка токена
  validateResetToken(token: string): Promise<boolean>;
  
  // 4. Установка нового пароля
  resetPassword(token: string, newPassword: string): Promise<void>;
  
  // 5. Требования к паролю
  passwordPolicy: {
    minLength: 8;
    requireUppercase: true;
    requireLowercase: true;
    requireNumbers: true;
    requireSpecialChars: false;
    preventCommon: true;  // Проверка по словарю
  };
}
```

## 2. Health Checks и Monitoring

### Health Check Implementation
```typescript
// Для каждого микросервиса
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongoHealthIndicator,
    private redis: RedisHealthIndicator,
    private kafka: KafkaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      () => this.redis.pingCheck('redis'),
      () => this.kafka.pingCheck('kafka'),
    ]);
  }

  @Get('ready')
  readiness() {
    // Проверка готовности к работе
    return {
      status: 'ready',
      timestamp: new Date(),
      version: process.env.APP_VERSION,
    };
  }

  @Get('live')
  liveness() {
    // Простая проверка что сервис жив
    return { status: 'alive' };
  }
}
```

## 3. Database Migrations

### MongoDB Migration System
```typescript
// migrations/1_initial_schema.ts
export class InitialSchema implements Migration {
  async up(db: Db): Promise<void> {
    // Create collections
    await db.createCollection('users');
    await db.createCollection('aquariums');
    await db.createCollection('events');
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('aquariums').createIndex({ userId: 1 });
    await db.collection('events').createIndex({ 
      aquariumId: 1, 
      scheduledAt: -1 
    });
  }

  async down(db: Db): Promise<void> {
    await db.dropCollection('users');
    await db.dropCollection('aquariums');
    await db.dropCollection('events');
  }
}

// Migration runner
export class MigrationService {
  async run(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    
    for (const migration of migrations) {
      try {
        await migration.up(this.db);
        await this.recordMigration(migration.name);
        console.log(`✓ Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migration.name} failed`, error);
        throw error;
      }
    }
  }
}
```

## 4. Environment Configuration

### Centralized Config Management
```typescript
// config/configuration.ts
export default () => ({
  app: {
    name: process.env.APP_NAME || 'verpa',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    version: process.env.APP_VERSION || '1.0.0',
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID,
    groupId: process.env.KAFKA_GROUP_ID,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT, // For MinIO
    },
    ses: {
      fromEmail: process.env.SES_FROM_EMAIL || 'noreply@verpa.app',
    },
  },
  
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  },
});

// Validation schema
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  
  MONGODB_URI: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  
  JWT_SECRET: Joi.string().min(32).required(),
  
  AWS_REGION: Joi.string().default('us-east-1'),
  S3_BUCKET: Joi.string().required(),
});
```

## 5. Error Handling и Logging

### Global Error Handler
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly sentry: SentryService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      message = errorResponse['message'] || exception.message;
      code = errorResponse['code'] || 'HTTP_ERROR';
    } else if (exception instanceof BusinessException) {
      status = exception.httpStatus;
      message = exception.message;
      code = exception.code;
    }

    const errorLog = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      code,
      userId: request['userContext']?.userId,
      requestId: request['requestId'],
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // Log error
    this.logger.error(errorLog);

    // Send to Sentry for 5xx errors
    if (status >= 500) {
      this.sentry.captureException(exception, {
        user: { id: request['userContext']?.userId },
        extra: errorLog,
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      code,
      timestamp: errorLog.timestamp,
      path: request.url,
      requestId: request['requestId'],
    });
  }
}

// Structured Logging
export class AppLogger {
  private logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
      }),
    ],
  });

  log(level: string, message: string, meta?: any) {
    this.logger.log({
      level,
      message,
      service: process.env.SERVICE_NAME,
      ...meta,
    });
  }
}
```

## 6. Backup Strategy

### MongoDB Backup
```yaml
# k8s/cronjobs/mongodb-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: mongodb-backup
            image: mongo:7
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y%m%d_%H%M%S)
              mongodump --uri=$MONGO_URI --gzip --archive=/tmp/backup_$DATE.gz
              aws s3 cp /tmp/backup_$DATE.gz s3://$BACKUP_BUCKET/mongodb/$DATE/
              # Keep last 30 days
              aws s3 ls s3://$BACKUP_BUCKET/mongodb/ | \
                awk '{print $4}' | \
                sort -r | \
                tail -n +31 | \
                xargs -I {} aws s3 rm s3://$BACKUP_BUCKET/mongodb/{}
```

## 7. API Versioning

### Version Strategy
```typescript
// BFF routing with versions
@Controller('api/v1/aquariums')
export class AquariumControllerV1 {
  // V1 endpoints
}

@Controller('api/v2/aquariums')
export class AquariumControllerV2 {
  // V2 with breaking changes
}

// Version negotiation
export class ApiVersionInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const version = request.headers['api-version'] || 'v1';
    
    request.apiVersion = version;
    
    // Add deprecation warnings
    if (version === 'v1') {
      context.switchToHttp().getResponse()
        .header('X-API-Deprecation', 'Version 1 is deprecated. Please upgrade to v2');
    }
    
    return next.handle();
  }
}
```

## 8. Session Management

### Device Sessions
```typescript
interface UserSession {
  id: string;
  userId: string;
  deviceInfo: {
    type: 'mobile' | 'web' | 'tablet';
    os: string;
    appVersion: string;
    deviceId?: string;
  };
  
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  
  ipAddress: string;
  userAgent: string;
  
  refreshToken: string;
  isActive: boolean;
}

export class SessionService {
  async createSession(userId: string, deviceInfo: DeviceInfo): Promise<Session> {
    // Limit sessions per user
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= 5) {
      // Remove oldest session
      await this.revokeSession(activeSessions[0].id);
    }
    
    // Create new session
    const session = {
      id: generateId(),
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: addDays(new Date(), 30),
      refreshToken: generateSecureToken(),
      isActive: true,
    };
    
    await this.sessionRepository.save(session);
    return session;
  }
  
  async listUserSessions(userId: string): Promise<SessionListDto[]> {
    const sessions = await this.sessionRepository.find({
      userId,
      isActive: true,
    });
    
    return sessions.map(s => ({
      id: s.id,
      deviceName: `${s.deviceInfo.type} - ${s.deviceInfo.os}`,
      lastActivity: s.lastActivityAt,
      isCurrent: s.id === currentSessionId,
    }));
  }
  
  async revokeAllSessions(userId: string, exceptCurrent?: string): Promise<void> {
    await this.sessionRepository.updateMany(
      { 
        userId, 
        id: { $ne: exceptCurrent },
      },
      { 
        isActive: false,
        revokedAt: new Date(),
      }
    );
  }
}
```