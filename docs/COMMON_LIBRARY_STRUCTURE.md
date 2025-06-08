# Common Library Structure - @verpa/common

## Структура общей библиотеки

```
packages/
└── common/
    ├── src/
    │   ├── proto/                    # Protobuf definitions
    │   │   ├── user/
    │   │   │   ├── user.proto
    │   │   │   └── user_service.proto
    │   │   ├── aquarium/
    │   │   │   ├── aquarium.proto
    │   │   │   └── aquarium_service.proto
    │   │   ├── event/
    │   │   │   ├── event.proto
    │   │   │   └── event_service.proto
    │   │   └── common/
    │   │       ├── timestamp.proto
    │   │       ├── money.proto
    │   │       └── pagination.proto
    │   │
    │   ├── interfaces/               # TypeScript interfaces
    │   │   ├── domain/
    │   │   │   ├── user.interface.ts
    │   │   │   ├── aquarium.interface.ts
    │   │   │   ├── event.interface.ts
    │   │   │   └── subscription.interface.ts
    │   │   ├── dto/
    │   │   │   ├── pagination.dto.ts
    │   │   │   ├── response.dto.ts
    │   │   │   └── error.dto.ts
    │   │   └── context/
    │   │       ├── user-context.interface.ts
    │   │       └── request-context.interface.ts
    │   │
    │   ├── constants/                # Константы
    │   │   ├── limits.constants.ts
    │   │   ├── events.constants.ts
    │   │   ├── errors.constants.ts
    │   │   └── regex.constants.ts
    │   │
    │   ├── enums/                    # Перечисления
    │   │   ├── user-status.enum.ts
    │   │   ├── subscription-type.enum.ts
    │   │   ├── water-type.enum.ts
    │   │   ├── event-type.enum.ts
    │   │   └── error-code.enum.ts
    │   │
    │   ├── exceptions/               # Кастомные исключения
    │   │   ├── business/
    │   │   │   ├── subscription-limit.exception.ts
    │   │   │   ├── aquarium-limit.exception.ts
    │   │   │   └── invalid-parameter.exception.ts
    │   │   └── system/
    │   │       ├── service-unavailable.exception.ts
    │   │       └── internal-error.exception.ts
    │   │
    │   ├── utils/                    # Утилиты
    │   │   ├── date/
    │   │   │   ├── timezone.util.ts
    │   │   │   ├── format.util.ts
    │   │   │   └── date-math.util.ts
    │   │   ├── validation/
    │   │   │   ├── email.validator.ts
    │   │   │   ├── phone.validator.ts
    │   │   │   └── parameter.validator.ts
    │   │   ├── crypto/
    │   │   │   ├── hash.util.ts
    │   │   │   ├── signature.util.ts
    │   │   │   └── id-generator.util.ts
    │   │   └── converter/
    │   │       ├── unit-converter.ts
    │   │       └── currency-converter.ts
    │   │
    │   ├── kafka/                    # Kafka schemas
    │   │   ├── events/
    │   │   │   ├── user.events.ts
    │   │   │   ├── aquarium.events.ts
    │   │   │   ├── event.events.ts
    │   │   │   └── billing.events.ts
    │   │   ├── commands/
    │   │   │   └── index.ts
    │   │   └── schemas/
    │   │       └── registry.ts
    │   │
    │   ├── decorators/               # Декораторы
    │   │   ├── validation/
    │   │   │   ├── is-valid-timezone.decorator.ts
    │   │   │   └── is-valid-aquarium-name.decorator.ts
    │   │   └── auth/
    │   │       ├── require-subscription.decorator.ts
    │   │       └── require-role.decorator.ts
    │   │
    │   └── index.ts                  # Главный экспорт
    │
    ├── scripts/
    │   ├── generate-proto.sh         # Генерация TS из proto
    │   └── build.sh
    │
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## Примеры кода

### Proto файлы

```protobuf
// src/proto/common/timestamp.proto
syntax = "proto3";
package verpa.common;

import "google/protobuf/timestamp.proto";

message TimestampWithTimezone {
  google.protobuf.Timestamp timestamp = 1;
  string timezone = 2; // IANA timezone
}

// src/proto/user/user.proto
syntax = "proto3";
package verpa.user;

import "common/timestamp.proto";

message User {
  string id = 1;
  string email = 2;
  UserProfile profile = 3;
  Subscription subscription = 4;
  UserStatus status = 5;
  verpa.common.TimestampWithTimezone created_at = 6;
}

message UserProfile {
  string first_name = 1;
  string last_name = 2;
  string timezone = 3;
  string locale = 4;
  string avatar_url = 5;
}

enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_SUSPENDED = 2;
  USER_STATUS_INACTIVE = 3;
}
```

### Интерфейсы

```typescript
// src/interfaces/context/user-context.interface.ts
export interface UserContext {
  userId: string;
  email: string;
  subscriptionType: SubscriptionType;
  roles: UserRole[];
  locale: string;
  timezone: string;
}

export interface RequestContext {
  requestId: string;
  traceId: string;
  userContext: UserContext;
  timestamp: Date;
  source: 'mobile-bff' | 'web-bff' | 'api-gateway';
}

// src/interfaces/domain/aquarium.interface.ts
export interface IAquarium {
  id: string;
  userId: string;
  name: string;
  type: WaterType;
  volume: number;
  dimensions: IDimensions;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
}
```

### Константы и Enums

```typescript
// src/constants/limits.constants.ts
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    MAX_AQUARIUMS: 1,
    MAX_EVENTS_PER_DAY: 5,
    HISTORY_RETENTION_DAYS: 7,
    MAX_PHOTO_SIZE_MB: 10,
    ALLOWED_PARAMETERS: ['temperature', 'ph'],
  },
  PREMIUM: {
    MAX_AQUARIUMS: -1, // unlimited
    MAX_EVENTS_PER_DAY: -1,
    HISTORY_RETENTION_DAYS: -1,
    MAX_PHOTO_SIZE_MB: 100,
    ALLOWED_PARAMETERS: 'all',
  },
} as const;

// src/enums/event-type.enum.ts
export enum EventType {
  // Measurements
  TEMPERATURE = 'temperature',
  PH = 'ph',
  AMMONIA = 'ammonia',
  NITRITE = 'nitrite',
  NITRATE = 'nitrate',
  
  // Maintenance
  WATER_CHANGE = 'water_change',
  FILTER_CLEAN = 'filter_clean',
  GLASS_CLEAN = 'glass_clean',
  
  // Livestock
  FISH_ADDED = 'fish_added',
  FISH_REMOVED = 'fish_removed',
  PLANT_ADDED = 'plant_added',
  
  // Observations
  PHOTO = 'photo',
  NOTE = 'note',
  PROBLEM = 'problem',
}
```

### Kafka Schemas

```typescript
// src/kafka/events/user.events.ts
import { z } from 'zod';

export const UserEvents = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  SUBSCRIPTION_CHANGED: 'user.subscription.changed',
} as const;

export const UserCreatedSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.date(),
  userId: z.string(),
  email: z.string().email(),
  subscriptionType: z.enum(['free', 'premium']),
  source: z.enum(['google', 'apple', 'email']),
});

export const SubscriptionChangedSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.date(),
  userId: z.string(),
  oldSubscription: z.enum(['free', 'premium']),
  newSubscription: z.enum(['free', 'premium']),
  reason: z.string(),
});

export type UserCreatedEvent = z.infer<typeof UserCreatedSchema>;
export type SubscriptionChangedEvent = z.infer<typeof SubscriptionChangedSchema>;
```

### Утилиты

```typescript
// src/utils/date/timezone.util.ts
import { DateTime } from 'luxon';

export class TimezoneUtil {
  static toUserTimezone(date: Date, timezone: string): DateTime {
    return DateTime.fromJSDate(date).setZone(timezone);
  }
  
  static toUTC(date: Date): Date {
    return DateTime.fromJSDate(date).toUTC().toJSDate();
  }
  
  static formatForUser(date: Date, timezone: string, locale: string): string {
    return DateTime.fromJSDate(date)
      .setZone(timezone)
      .setLocale(locale)
      .toLocaleString(DateTime.DATETIME_MED);
  }
  
  static getNextOccurrence(
    baseTime: string, // "14:00"
    timezone: string,
    pattern: 'daily' | 'weekly' | 'monthly'
  ): Date {
    const [hours, minutes] = baseTime.split(':').map(Number);
    const now = DateTime.now().setZone(timezone);
    let next = now.set({ hour: hours, minute: minutes, second: 0 });
    
    if (next <= now) {
      switch (pattern) {
        case 'daily':
          next = next.plus({ days: 1 });
          break;
        case 'weekly':
          next = next.plus({ weeks: 1 });
          break;
        case 'monthly':
          next = next.plus({ months: 1 });
          break;
      }
    }
    
    return next.toUTC().toJSDate();
  }
}

// src/utils/validation/parameter.validator.ts
export class ParameterValidator {
  static isValidTemperature(value: number, waterType: WaterType): boolean {
    const ranges = {
      freshwater: { min: 0, max: 40 },
      marine: { min: 20, max: 30 },
      brackish: { min: 15, max: 35 },
    };
    
    const range = ranges[waterType];
    return value >= range.min && value <= range.max;
  }
  
  static isValidPH(value: number): boolean {
    return value >= 0 && value <= 14;
  }
  
  static validateWaterChange(percentage: number, volume: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new InvalidParameterException('Water change percentage must be between 0 and 100');
    }
    
    if (volume <= 0) {
      throw new InvalidParameterException('Volume must be positive');
    }
  }
}
```

### Декораторы

```typescript
// src/decorators/validation/is-valid-timezone.decorator.ts
import { registerDecorator, ValidationOptions } from 'class-validator';
import { DateTime } from 'luxon';

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimezone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          return DateTime.local().setZone(value).isValid;
        },
        defaultMessage() {
          return '$property must be a valid IANA timezone';
        },
      },
    });
  };
}

// src/decorators/auth/require-subscription.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { SubscriptionType } from '../enums';

export const SUBSCRIPTION_KEY = 'requiredSubscription';
export const RequireSubscription = (...types: SubscriptionType[]) =>
  SetMetadata(SUBSCRIPTION_KEY, types);
```

### Package.json

```json
{
  "name": "@verpa/common",
  "version": "1.0.0",
  "description": "Common library for Verpa microservices",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:proto": "sh scripts/generate-proto.sh",
    "prepublish": "npm run build:proto && npm run build",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.0",
    "class-validator": "^0.14.0",
    "luxon": "^3.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/luxon": "^3.3.0",
    "protoc-gen-ts": "^0.8.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0"
  }
}
```

### Использование в сервисах

```typescript
// В любом микросервисе
import { 
  UserContext,
  EventType,
  SUBSCRIPTION_LIMITS,
  TimezoneUtil,
  UserCreatedEvent,
  RequireSubscription,
  SubscriptionType
} from '@verpa/common';

@Injectable()
export class AquariumService {
  async createAquarium(
    userContext: UserContext,
    data: CreateAquariumDto
  ): Promise<Aquarium> {
    // Используем общие константы
    const limit = SUBSCRIPTION_LIMITS[userContext.subscriptionType].MAX_AQUARIUMS;
    
    if (limit !== -1 && currentCount >= limit) {
      throw new AquariumLimitExceededException();
    }
    
    // Используем общие утилиты
    const scheduledTime = TimezoneUtil.toUTC(data.scheduledAt);
    
    // ...
  }
}
```