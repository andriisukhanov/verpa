# Backend Architecture - Verpa

## Общая структура микросервисов

```
backend/
├── public/                     # Публичные сервисы (BFF)
│   ├── mobile-bff/            # Backend for Frontend - Mobile
│   ├── web-bff/               # Backend for Frontend - Web Admin
│   └── api-gateway/           # Kong/Traefik Gateway
│
├── private/                    # Приватные микросервисы
│   ├── user-service/          # Пользователи и авторизация
│   ├── aquarium-service/      # Аквариумы и их данные
│   ├── event-service/         # События и расписания
│   ├── notification-service/  # Уведомления
│   ├── media-service/         # Работа с файлами
│   ├── analytics-service/     # Аналитика и отчеты
│   ├── billing-service/       # Платежи и подписки
│   └── knowledge-service/     # База знаний
│
├── shared/
│   ├── common/               # Общие интерфейсы и типы
│   ├── kafka-schemas/        # Kafka event schemas
│   ├── grpc-contracts/       # gRPC протоколы
│   └── utils/                # Утилиты
│
└── infrastructure/
    ├── docker/               # Docker configs
    ├── k8s/                  # Kubernetes manifests
    └── terraform/            # Infrastructure as Code
```

## Архитектура публичных/приватных сервисов

### Public Layer - Backend for Frontend (BFF)

```typescript
// public/mobile-bff/src/aggregators/aquarium.aggregator.ts
export class AquariumAggregator {
  constructor(
    // Private services clients
    private readonly userClient: UserServiceClient,
    private readonly aquariumClient: AquariumServiceClient,
    private readonly eventClient: EventServiceClient,
    private readonly mediaClient: MediaServiceClient,
  ) {}

  // Один endpoint вместо множества вызовов
  async getAquariumDashboard(
    userId: string,
    aquariumId: string
  ): Promise<MobileAquariumDashboardDto> {
    // Проверка доступа
    const hasAccess = await this.userClient.checkAquariumAccess(userId, aquariumId);
    if (!hasAccess) {
      throw new ForbiddenException();
    }

    // Параллельные запросы к приватным сервисам
    const [aquarium, events, stats] = await Promise.all([
      this.aquariumClient.getById(aquariumId),
      this.eventClient.getTimeline(aquariumId, { limit: 20 }),
      this.aquariumClient.getStats(aquariumId),
    ]);

    // Оптимизация для мобильного клиента
    return {
      aquarium: this.mapToMobileFormat(aquarium),
      timeline: this.optimizeTimelineForMobile(events),
      quickStats: this.extractKeyStats(stats),
      // Только нужные данные, без лишнего
    };
  }
}

// public/web-bff/src/aggregators/admin.aggregator.ts
export class AdminAggregator {
  // Web админка требует другие данные
  async getUserManagementData(
    adminId: string,
    filters: UserFilters
  ): Promise<AdminUserListDto> {
    // Проверка прав админа
    await this.authClient.requireAdminRole(adminId);

    // Более детальные данные для админки
    const [users, subscriptions, analytics] = await Promise.all([
      this.userClient.searchUsers(filters),
      this.billingClient.getSubscriptionStats(),
      this.analyticsClient.getUserMetrics(),
    ]);

    return this.combineForAdminPanel(users, subscriptions, analytics);
  }
}
```

### Private Layer - Независимые микросервисы

```typescript
// private/user-service/src/infrastructure/messaging/kafka.config.ts
export const KAFKA_TOPICS = {
  // User domain events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  SUBSCRIPTION_CHANGED: 'user.subscription.changed',
  
  // Commands from other services
  VERIFY_USER_ACCESS: 'user.command.verify-access',
  UPDATE_USER_LIMITS: 'user.command.update-limits',
} as const;

// Полная изоляция - сервис работает только через Kafka
export class UserService {
  constructor(
    private readonly kafka: Kafka,
    private readonly mongodb: MongoClient,
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Subscribe to commands
    this.kafka.subscribe({
      topics: [KAFKA_TOPICS.VERIFY_USER_ACCESS],
      handler: this.handleVerifyAccess.bind(this),
    });
  }

  // Публикация событий для других сервисов
  async createUser(data: CreateUserDto): Promise<void> {
    const user = await this.userRepository.create(data);
    
    // Emit event for other services
    await this.kafka.publish({
      topic: KAFKA_TOPICS.USER_CREATED,
      message: {
        userId: user.id,
        email: user.email,
        subscription: user.subscription,
        timestamp: new Date(),
      },
    });
  }
}
```

## Архитектура каждого микросервиса (DDD + Clean Architecture)

```
service-name/
├── src/
│   ├── domain/              # Domain Layer (Бизнес-логика)
│   │   ├── entities/        # Доменные сущности
│   │   ├── value-objects/   # Объекты-значения
│   │   ├── aggregates/      # Агрегаты
│   │   ├── repositories/    # Интерфейсы репозиториев
│   │   ├── services/        # Доменные сервисы
│   │   └── events/          # Доменные события
│   │
│   ├── application/         # Application Layer (Use Cases)
│   │   ├── commands/        # Команды (CQRS)
│   │   ├── queries/         # Запросы (CQRS)
│   │   ├── handlers/        # Обработчики команд/запросов
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── mappers/         # Маппинг между слоями
│   │   └── validators/      # Валидация данных
│   │
│   ├── infrastructure/      # Infrastructure Layer
│   │   ├── persistence/     # База данных
│   │   │   ├── mongodb/     # MongoDB implementation
│   │   │   ├── redis/       # Redis кэш
│   │   │   └── migrations/  # Миграции
│   │   ├── messaging/       # RabbitMQ/Kafka
│   │   ├── storage/         # S3 интеграция
│   │   └── external/        # Внешние сервисы
│   │
│   └── presentation/        # Presentation Layer
│       ├── http/            # REST API
│       │   ├── controllers/ # Контроллеры
│       │   ├── middleware/  # Middleware
│       │   └── routes/      # Роуты
│       ├── grpc/            # gRPC для межсервисного
│       └── websocket/       # WebSocket для real-time
│
├── tests/
│   ├── unit/               # Модульные тесты
│   ├── integration/        # Интеграционные тесты
│   └── e2e/                # E2E тесты
│
└── package.json
```

## User Service - Детальная структура

```typescript
// domain/entities/user.entity.ts
export class User {
  private readonly _id: UserId;
  private _email: Email;
  private _profile: UserProfile;
  private _authProviders: AuthProviders;
  private _subscription: Subscription;
  private _status: UserStatus;
  
  // Domain logic
  canCreateAquarium(): boolean {
    if (this._subscription.type === 'free') {
      return this.getAquariumCount() < 1;
    }
    return true;
  }
  
  upgradeSubscription(newPlan: SubscriptionPlan): DomainEvent[] {
    // Business logic
    const events: DomainEvent[] = [];
    events.push(new SubscriptionUpgradedEvent(this._id, newPlan));
    return events;
  }
}

// domain/value-objects/email.vo.ts
export class Email {
  private readonly value: string;
  
  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value);
    }
    this.value = value;
  }
  
  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// application/commands/create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password?: string,
    public readonly authProvider?: AuthProvider,
  ) {}
}

// application/handlers/create-user.handler.ts
@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}
  
  async execute(command: CreateUserCommand): Promise<UserId> {
    // Validate
    const email = new Email(command.email);
    
    // Check if exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email.toString());
    }
    
    // Create user
    const user = User.create({
      email,
      authProvider: command.authProvider,
    });
    
    // Save
    await this.userRepository.save(user);
    
    // Publish events
    const events = user.getUncommittedEvents();
    await this.eventBus.publishAll(events);
    
    return user.id;
  }
}
```

## Aquarium Service - Структура

```typescript
// domain/aggregates/aquarium.aggregate.ts
export class Aquarium extends AggregateRoot {
  private readonly _id: AquariumId;
  private _ownerId: UserId;
  private _basicInfo: AquariumBasicInfo;
  private _waterParameters: WaterParameters;
  private _equipment: Equipment[];
  private _livestock: Livestock;
  private _plants: Plant[];
  
  // Aggregate boundary - События принадлежат аквариуму
  private _events: AquariumEvent[] = [];
  
  // Business rules
  addFish(fish: Fish): void {
    // Check compatibility
    if (!this.livestock.isCompatibleWith(fish)) {
      throw new IncompatibleFishError(fish);
    }
    
    // Check bioload
    if (this.calculateBioload() + fish.bioload > this.maxBioload) {
      throw new BioloadExceededError();
    }
    
    this._livestock.add(fish);
    this.addEvent(new FishAddedEvent(this._id, fish));
  }
  
  scheduleWaterChange(percentage: number, date: Date): void {
    const volume = this._basicInfo.volume * (percentage / 100);
    
    const event = WaterChangeEvent.schedule({
      aquariumId: this._id,
      volume,
      percentage,
      scheduledAt: date,
    });
    
    this._events.push(event);
    this.addDomainEvent(new EventScheduledEvent(this._id, event));
  }
}

// domain/specifications/fish-compatibility.spec.ts
export class FishCompatibilitySpecification {
  isSatisfiedBy(tank: Aquarium, newFish: Fish): boolean {
    const currentFish = tank.livestock.fish;
    
    // Check aggression levels
    if (newFish.aggression === 'aggressive') {
      return currentFish.every(f => 
        f.aggression === 'aggressive' || f.size > newFish.size
      );
    }
    
    // Check water parameters
    const params = tank.waterParameters;
    return (
      newFish.tempRange.includes(params.temperature) &&
      newFish.phRange.includes(params.ph)
    );
  }
}
```

## Event Service - CQRS Pattern

```typescript
// Write Side (Commands)
// domain/aggregates/event-timeline.aggregate.ts
export class EventTimeline {
  private readonly _aquariumId: AquariumId;
  private _scheduledEvents: ScheduledEvent[] = [];
  private _completedEvents: CompletedEvent[] = [];
  
  scheduleEvent(eventData: CreateEventDto): ScheduledEvent {
    // Validation
    if (eventData.scheduledAt < new Date()) {
      throw new InvalidScheduleDateError();
    }
    
    // Check for conflicts
    const conflicts = this.findConflicts(eventData);
    if (conflicts.length > 0) {
      throw new EventConflictError(conflicts);
    }
    
    const event = ScheduledEvent.create(eventData);
    this._scheduledEvents.push(event);
    
    return event;
  }
  
  confirmEvent(eventId: EventId, actualData?: Partial<EventData>): void {
    const event = this._scheduledEvents.find(e => e.id.equals(eventId));
    if (!event) {
      throw new EventNotFoundError(eventId);
    }
    
    const completed = event.complete(actualData);
    this._completedEvents.push(completed);
    this._scheduledEvents = this._scheduledEvents.filter(e => !e.id.equals(eventId));
  }
}

// Read Side (Queries) - Оптимизированные проекции
// infrastructure/projections/event-calendar.projection.ts
export class EventCalendarProjection {
  constructor(
    private readonly mongoDb: Db,
    private readonly redis: Redis,
  ) {}
  
  async getUpcomingEvents(
    aquariumId: string,
    days: number = 7
  ): Promise<EventDto[]> {
    // Try cache first
    const cacheKey = `upcoming:${aquariumId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query optimized read model
    const events = await this.mongoDb
      .collection('event_projections')
      .find({
        aquariumId,
        scheduledAt: {
          $gte: new Date(),
          $lte: addDays(new Date(), days),
        },
        status: 'scheduled',
      })
      .sort({ scheduledAt: 1 })
      .toArray();
    
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(events));
    
    return events;
  }
}
```

## Notification Service - Event Driven

```typescript
// Event listeners for domain events
@EventsHandler(WaterChangeScheduledEvent)
export class WaterChangeScheduledHandler {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
  ) {}
  
  async handle(event: WaterChangeScheduledEvent): Promise<void> {
    const user = await this.userRepository.findByAquariumId(event.aquariumId);
    
    // Schedule reminders based on user preferences
    if (user.preferences.notifications.reminders) {
      await this.notificationService.scheduleReminder({
        userId: user.id,
        type: 'water_change',
        scheduledFor: event.scheduledAt,
        channels: user.preferences.notifications.channels,
        message: `Water change scheduled for ${event.aquariumName}`,
      });
    }
  }
}

// Notification orchestration
export class NotificationOrchestrator {
  constructor(
    private readonly pushService: PushNotificationService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly inAppService: InAppNotificationService,
  ) {}
  
  async sendNotification(notification: Notification): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Route to appropriate channels
    if (notification.channels.includes('push')) {
      promises.push(this.pushService.send(notification));
    }
    
    if (notification.channels.includes('email')) {
      promises.push(this.emailService.send(notification));
    }
    
    if (notification.channels.includes('sms') && notification.priority === 'critical') {
      promises.push(this.smsService.send(notification));
    }
    
    // Always send in-app
    promises.push(this.inAppService.send(notification));
    
    await Promise.allSettled(promises);
  }
}
```

## Межсервисное взаимодействие

```typescript
// Async messaging с RabbitMQ
// shared/messaging/event-bus.ts
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: Constructor<T>,
    handler: EventHandler<T>,
  ): void;
}

// Sync communication с gRPC для критичных операций
// services/user-service/grpc/user.proto
syntax = "proto3";

service UserService {
  rpc ValidateSubscription(ValidateSubscriptionRequest) returns (ValidateSubscriptionResponse);
  rpc GetUserLimits(GetUserLimitsRequest) returns (UserLimits);
}

// API Gateway aggregation
// gateway/aggregators/aquarium-details.aggregator.ts
export class AquariumDetailsAggregator {
  constructor(
    private readonly aquariumService: AquariumServiceClient,
    private readonly eventService: EventServiceClient,
    private readonly analyticsService: AnalyticsServiceClient,
  ) {}
  
  async getAquariumDashboard(aquariumId: string): Promise<DashboardDto> {
    // Parallel requests to multiple services
    const [aquarium, events, analytics] = await Promise.all([
      this.aquariumService.getAquarium(aquariumId),
      this.eventService.getUpcomingEvents(aquariumId),
      this.analyticsService.getAquariumStats(aquariumId),
    ]);
    
    return {
      aquarium,
      upcomingEvents: events,
      statistics: analytics,
      health: this.calculateHealth(aquarium, analytics),
    };
  }
}
```

## Безопасность и масштабирование

```typescript
// Rate limiting на уровне Gateway
export class RateLimitMiddleware {
  private readonly limits = {
    anonymous: { rpm: 10, rph: 100 },
    free: { rpm: 30, rph: 500 },
    premium: { rpm: 100, rph: 5000 },
  };
  
  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const subscriptionType = req.user?.subscription?.type || 'anonymous';
    
    const key = `rate:${userId || req.ip}`;
    const limit = this.limits[subscriptionType];
    
    // Check rate limit
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }
    
    if (current > limit.rpm) {
      throw new TooManyRequestsError();
    }
    
    next();
  }
}

// Service mesh patterns
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new ServiceUnavailableError();
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```