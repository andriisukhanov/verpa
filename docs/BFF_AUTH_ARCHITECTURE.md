# BFF Authentication Architecture

## JWT проверка только на BFF уровне

### Mobile BFF - Аутентификация

```typescript
// public/mobile-bff/src/middleware/auth.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: Redis, // Для проверки revoked tokens
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    try {
      // Проверка JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Проверка отозванных токенов
      const isRevoked = await this.redis.get(`revoked:${token}`);
      if (isRevoked) {
        throw new UnauthorizedException('Token revoked');
      }

      // Добавляем безопасный контекст пользователя
      req.userContext = {
        userId: payload.sub,
        email: payload.email,
        subscriptionType: payload.subscription,
        roles: payload.roles || [],
        // НЕ передаем сам токен дальше!
      };

      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}

// public/mobile-bff/src/interceptors/internal-request.interceptor.ts
@Injectable()
export class InternalRequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userContext = request.userContext;

    // Добавляем внутренние заголовки для приватных сервисов
    const metadata = new Metadata();
    metadata.add('x-user-id', userContext.userId);
    metadata.add('x-user-email', userContext.email);
    metadata.add('x-subscription-type', userContext.subscriptionType);
    metadata.add('x-request-id', request.id);
    metadata.add('x-trace-id', request.traceId);
    
    // Внутренняя подпись для верификации источника
    const internalSignature = this.generateInternalSignature({
      userId: userContext.userId,
      timestamp: Date.now(),
      service: 'mobile-bff',
    });
    metadata.add('x-internal-signature', internalSignature);

    // Сохраняем metadata для всех вызовов к приватным сервисам
    request.internalMetadata = metadata;

    return next.handle();
  }

  private generateInternalSignature(data: any): string {
    // HMAC подпись для внутренней коммуникации
    return crypto
      .createHmac('sha256', process.env.INTERNAL_SECRET)
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
```

### Приватные сервисы - Получение контекста

```typescript
// private/user-service/src/interceptors/auth-context.interceptor.ts
@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = context.switchToRpc().getContext();
    
    // Проверяем внутреннюю подпись
    const signature = metadata.get('x-internal-signature')[0];
    if (!this.verifyInternalSignature(signature)) {
      throw new UnauthorizedException('Invalid internal signature');
    }

    // Извлекаем контекст пользователя из metadata
    const userContext: UserContext = {
      userId: metadata.get('x-user-id')[0],
      email: metadata.get('x-user-email')[0],
      subscriptionType: metadata.get('x-subscription-type')[0] as SubscriptionType,
      requestId: metadata.get('x-request-id')[0],
      traceId: metadata.get('x-trace-id')[0],
    };

    // НЕТ JWT токенов на этом уровне!
    // Только доверенные данные от BFF

    // Добавляем контекст в request
    const request = context.switchToHttp().getRequest();
    request.userContext = userContext;

    return next.handle();
  }

  private verifyInternalSignature(signature: string): boolean {
    // Проверка HMAC подписи
    // Только BFF знает INTERNAL_SECRET
    return true; // simplified
  }
}

// private/user-service/src/guards/internal-only.guard.ts
@Injectable()
export class InternalOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const metadata = context.switchToRpc().getContext();
    
    // Проверяем, что запрос пришел из внутренней сети
    const sourceIp = metadata.get('x-forwarded-for')[0];
    if (!this.isInternalNetwork(sourceIp)) {
      throw new ForbiddenException('External access denied');
    }

    // Проверяем service-to-service auth
    const serviceToken = metadata.get('x-service-token')[0];
    if (!this.isValidServiceToken(serviceToken)) {
      throw new ForbiddenException('Invalid service token');
    }

    return true;
  }

  private isInternalNetwork(ip: string): boolean {
    // Проверка внутренних IP Kubernetes
    return ip.startsWith('10.') || ip.startsWith('172.');
  }
}
```

### gRPC коммуникация между BFF и приватными сервисами

```protobuf
// shared/grpc-contracts/user.proto
syntax = "proto3";

package user;

// Сообщения НЕ содержат JWT!
message GetUserRequest {
  string user_id = 1;  // Только ID из проверенного контекста
}

message UpdateUserRequest {
  string user_id = 1;
  UserUpdate update = 2;
}

message UserUpdate {
  optional string first_name = 1;
  optional string last_name = 2;
  optional string timezone = 3;
  // НЕ передаем пароли или токены!
}

message UserResponse {
  string id = 1;
  string email = 2;
  UserProfile profile = 3;
  Subscription subscription = 4;
  // НЕ возвращаем sensitive данные!
}

service UserService {
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UserResponse);
  rpc CheckUserLimits(CheckLimitsRequest) returns (LimitsResponse);
}
```

### Kafka события без JWT

```typescript
// shared/kafka-schemas/events.ts
export interface UserCreatedEvent {
  eventId: string;
  timestamp: Date;
  userId: string;          // Только ID
  email: string;           // Для нотификаций
  subscriptionType: string;
  // НЕТ паролей, токенов, sensitive данных!
}

export interface AquariumCreatedEvent {
  eventId: string;
  timestamp: Date;
  userId: string;          // Владелец
  aquariumId: string;
  aquariumName: string;
  // Только бизнес-данные
}

// private/aquarium-service/src/handlers/aquarium.handler.ts
export class AquariumEventHandler {
  @EventPattern('user.subscription.changed')
  async handleSubscriptionChange(data: SubscriptionChangedEvent) {
    // Получаем только userId и новый тип подписки
    const { userId, newSubscriptionType, oldSubscriptionType } = data;
    
    if (oldSubscriptionType === 'premium' && newSubscriptionType === 'free') {
      // Проверяем лимиты аквариумов
      await this.enforceFreeLimits(userId);
    }
    
    // НЕ работаем с JWT или паролями!
  }
}
```

### Service Mesh Security

```yaml
# k8s/istio/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: verpa-private
spec:
  mtls:
    mode: STRICT  # Только mTLS между сервисами

---
# k8s/istio/authorization-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: bff-only
  namespace: verpa-private
spec:
  selector:
    matchLabels:
      app: user-service
  rules:
  - from:
    - source:
        principals: 
        - "cluster.local/ns/verpa-public/sa/mobile-bff"
        - "cluster.local/ns/verpa-public/sa/web-bff"
    to:
    - operation:
        methods: ["POST"]
```

### Преимущества архитектуры

1. **Безопасность**
   - JWT только на границе системы (BFF)
   - Приватные сервисы не знают о JWT
   - mTLS между сервисами
   - Service mesh для контроля доступа

2. **Производительность**
   - Нет overhead на проверку JWT в каждом сервисе
   - Упрощенная внутренняя коммуникация
   - Кэширование на уровне BFF

3. **Масштабируемость**
   - BFF можно масштабировать независимо
   - Приватные сервисы проще и быстрее
   - Легко добавлять новые BFF (IoT, API)

4. **Изоляция**
   - Смена auth провайдера не затрагивает приватные сервисы
   - Разные BFF могут использовать разные методы auth
   - Приватные сервисы фокусируются на бизнес-логике