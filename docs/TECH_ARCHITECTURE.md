# Техническая архитектура проекта Verpa

## Общая архитектура

### Frontend
- **Mobile**: Flutter (iOS, Android, Web для тестирования)
- **Admin Panel**: React + TypeScript

### Backend
- **API**: NestJS микросервисы
- **Database**: MongoDB
- **File Storage**: AWS S3 / MinIO
- **Cache**: Redis
- **Message Queue**: RabbitMQ / Kafka

## Хранение файлов (S3)

### Структура бакетов
```typescript
interface S3Structure {
  buckets: {
    'verpa-user-content': {     // Пользовательский контент
      structure: [
        '/avatars/{userId}/',
        '/aquariums/{aquariumId}/photos/',
        '/aquariums/{aquariumId}/events/',
        '/posts/{postId}/',
        '/messages/{chatId}/'
      ]
    },
    
    'verpa-app-assets': {       // Статические ресурсы
      structure: [
        '/icons/',
        '/illustrations/',
        '/onboarding/',
        '/marketing/'
      ]
    },
    
    'verpa-exports': {          // Экспортированные данные
      structure: [
        '/reports/{userId}/',
        '/backups/{userId}/',
        '/analytics/'
      ]
    },
    
    'verpa-ai-data': {          // AI обработка
      structure: [
        '/training-data/',
        '/processed-images/',
        '/model-checkpoints/'
      ]
    }
  }
}
```

### Политики хранения
```typescript
interface StoragePolicy {
  // Размеры и форматы
  images: {
    maxSize: '10MB',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    compression: {
      quality: 85,
      generateThumbnails: true,
      sizes: {
        thumbnail: '150x150',
        medium: '800x800',
        large: '1920x1920'
      }
    }
  },
  
  videos: {
    maxSize: '100MB',
    formats: ['mp4', 'mov', 'avi'],
    maxDuration: 60,            // секунд
    compression: {
      codec: 'h264',
      bitrate: '2M',
      generatePreview: true
    }
  },
  
  // Lifecycle правила
  lifecycle: {
    userContent: {
      moveToIA: 90,             // дней - перенос в Infrequent Access
      expire: 365               // дней - удаление для неактивных пользователей
    },
    
    exports: {
      expire: 30                // дней - временные файлы
    },
    
    backups: {
      retain: 'forever'         // для Premium пользователей
    }
  }
}
```

### Upload процесс
```typescript
interface FileUploadService {
  // Прямая загрузка из приложения в S3
  generatePresignedUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<{
    uploadUrl: string;
    fileUrl: string;
    expiresIn: number;
  }>;
  
  // Обработка после загрузки
  processUpload(event: S3Event): Promise<{
    thumbnails?: string[];
    optimized?: string;
    metadata?: ImageMetadata;
  }>;
  
  // CDN интеграция
  getCdnUrl(s3Url: string): string;
}
```

## Микросервисы

### 1. User Service
```typescript
interface UserService {
  port: 3001;
  database: 'mongodb://user-service-db';
  responsibilities: [
    'Аутентификация',
    'Управление профилями',
    'OAuth интеграции',
    'Подписки'
  ];
}
```

### 2. Aquarium Service
```typescript
interface AquariumService {
  port: 3002;
  database: 'mongodb://aquarium-service-db';
  responsibilities: [
    'CRUD аквариумов',
    'События и timeline',
    'Параметры воды',
    'Оборудование'
  ];
}
```

### 3. Notification Service
```typescript
interface NotificationService {
  port: 3003;
  database: 'mongodb://notification-service-db';
  responsibilities: [
    'Push уведомления',
    'Email рассылки',
    'In-app уведомления',
    'Планировщик напоминаний'
  ];
}
```

### 4. Media Service
```typescript
interface MediaService {
  port: 3004;
  responsibilities: [
    'Загрузка в S3',
    'Обработка изображений',
    'Генерация превью',
    'Управление CDN'
  ];
  
  integrations: {
    s3: 'AWS S3 / MinIO';
    cdn: 'CloudFront / Cloudflare';
    imageProcessor: 'Sharp / ImageMagick';
  };
}
```

### 5. Analytics Service
```typescript
interface AnalyticsService {
  port: 3005;
  database: 'mongodb://analytics-service-db';
  responsibilities: [
    'Сбор метрик',
    'Генерация отчетов',
    'Экспорт данных',
    'Дашборды'
  ];
}
```

### 6. AI Service (Phase 3)
```typescript
interface AIService {
  port: 3006;
  responsibilities: [
    'Обработка изображений',
    'Подсчет рыб',
    'Рекомендации',
    'Чат-бот'
  ];
  
  infrastructure: {
    gpu: true;
    models: {
      storage: 's3://verpa-ai-data/models/',
      cache: 'redis://ai-cache'
    };
  };
}
```

## Безопасность файлов

### Доступ к файлам
```typescript
interface FileAccessControl {
  // Приватные файлы пользователя
  private: {
    pattern: '/users/{userId}/**',
    access: 'owner-only',
    signedUrls: true,
    expiration: 3600            // 1 час
  };
  
  // Публичные файлы аквариумов
  public: {
    pattern: '/aquariums/{aquariumId}/public/**',
    access: 'public-read',
    cdn: true
  };
  
  // Защищенный контент
  protected: {
    pattern: '/premium/**',
    access: 'subscription-required',
    watermark: true
  };
}
```

### Валидация и сканирование
```typescript
interface FileSecurity {
  validation: {
    checkMimeType: true;
    checkMagicBytes: true;
    maxFileSize: true;
  };
  
  scanning: {
    antivirus: true;
    contentModeration: true;    // Для изображений
    metadata: {
      stripExif: true;          // Удаление GPS и других данных
      preserveOrientation: true;
    };
  };
}
```

## Оптимизация

### Кэширование
- CloudFront / Cloudflare для статики
- Redis для метаданных
- Browser cache headers
- Service Worker для офлайн доступа

### Производительность
- Lazy loading изображений
- Progressive image loading
- WebP поддержка
- Адаптивные размеры

## Платежные системы

### Интеграции
```typescript
interface PaymentProviders {
  stripe: {
    subscriptions: true;
    oneTimePayments: true;
    webhooks: '/webhooks/stripe';
    supportedCurrencies: ['USD', 'EUR', 'GBP'];
  };
  
  paypal: {
    subscriptions: true;
    oneTimePayments: true;
    webhooks: '/webhooks/paypal';
    supportedCurrencies: ['USD', 'EUR'];
  };
  
  applePay: {
    inAppPurchase: true;
    subscriptionManagement: 'App Store';
  };
  
  googlePay: {
    inAppPurchase: true;
    subscriptionManagement: 'Play Store';
  };
}
```

### Billing Service
```typescript
interface BillingService {
  port: 3007;
  database: 'mongodb://billing-service-db';
  
  responsibilities: [
    'Обработка платежей',
    'Управление подписками',
    'Webhooks обработка',
    'Возвраты и диспуты',
    'Налоговые расчеты'
  ];
  
  features: {
    multiCurrency: true;
    taxCalculation: true;
    invoiceGeneration: true;
    dunningManagement: true;    // Повторные попытки оплаты
  };
}
```

## Rate Limiting и защита API

### Стратегии ограничений
```typescript
interface RateLimits {
  // Глобальные лимиты
  global: {
    requestsPerMinute: 60;
    requestsPerHour: 1000;
  };
  
  // По типам пользователей
  userTypes: {
    anonymous: {
      requestsPerMinute: 10;
      requestsPerHour: 100;
    };
    
    free: {
      requestsPerMinute: 30;
      requestsPerHour: 500;
      apiCalls: {
        daily: 1000;
        dataExport: 5;          // В день
      };
    };
    
    premium: {
      requestsPerMinute: 100;
      requestsPerHour: 5000;
      apiCalls: {
        daily: 10000;
        dataExport: 'unlimited';
      };
    };
  };
  
  // По эндпоинтам
  endpoints: {
    '/auth/login': {
      attempts: 5;
      windowMinutes: 15;
      blockDuration: 3600;      // 1 час блокировки
    };
    
    '/api/events': {
      free: {
        creates: 5;             // В день (по подписке)
        reads: 100;
      };
      premium: {
        creates: 'unlimited';
        reads: 'unlimited';
      };
    };
    
    '/api/upload': {
      maxSize: {
        free: '10MB';
        premium: '100MB';
      };
      dailyLimit: {
        free: 10;
        premium: 1000;
      };
    };
    
    '/api/ai/*': {
      free: 0;                  // Недоступно
      premium: {
        requestsPerDay: 100;
        requestsPerMinute: 5;
      };
    };
  };
}
```

### Реализация защиты
```typescript
interface SecurityMiddleware {
  // DDoS защита
  ddosProtection: {
    enabled: true;
    provider: 'Cloudflare';
    rules: {
      rateLimit: true;
      geoBlocking: false;
      botProtection: true;
    };
  };
  
  // API защита
  apiSecurity: {
    authentication: 'JWT';
    apiKeys: true;
    cors: {
      origins: ['app://verpa', 'https://verpa.app'];
      credentials: true;
    };
    
    headers: {
      'X-RateLimit-Limit': number;
      'X-RateLimit-Remaining': number;
      'X-RateLimit-Reset': Date;
    };
  };
  
  // Защита от абуза
  abuseProtection: {
    ipBlacklist: true;
    userAgentFilter: true;
    suspiciousActivityDetection: true;
    
    actions: {
      softBlock: 'CAPTCHA';
      hardBlock: 'IP ban';
      reportToAdmin: true;
    };
  };
}
```

## Messaging Services (AWS)

### Email Service - Amazon SES
```typescript
interface EmailService {
  provider: 'AWS SES';
  
  templates: {
    welcome: 'verpa-welcome';
    passwordReset: 'verpa-password-reset';
    subscription: 'verpa-subscription-status';
    alert: 'verpa-alert';
    report: 'verpa-weekly-report';
  };
  
  configuration: {
    region: 'us-east-1';
    sandboxMode: false;
    configurationSet: 'verpa-tracking';
    
    sending: {
      fromEmail: 'noreply@verpa.app';
      replyTo: 'support@verpa.app';
      bounce: 'bounce@verpa.app';
    };
  };
  
  features: {
    bulkSending: true;
    tracking: {
      opens: true;
      clicks: true;
      bounces: true;
      complaints: true;
    };
    suppression: true;          // Автоматическое управление отписками
  };
}
```

### SMS Service - Amazon SNS
```typescript
interface SMSService {
  provider: 'AWS SNS';
  
  useCases: {
    criticalAlerts: {
      enabled: true;
      conditions: [
        'temperature_critical',
        'oxygen_low',
        'equipment_failure',
        'mass_mortality'
      ];
    };
    
    twoFactorAuth: {
      enabled: true;
      template: 'Your Verpa verification code: {code}';
    };
    
    marketing: {
      enabled: false;           // Только критические уведомления
    };
  };
  
  configuration: {
    region: 'us-east-1';
    senderID: 'VERPA';
    messageType: 'Transactional';
    
    limits: {
      maxPrice: 0.50;           // Максимальная цена за SMS
      monthlySpend: 100;        // Месячный лимит
    };
  };
}
```

### Push Notifications - Amazon SNS
```typescript
interface PushNotificationService {
  provider: 'AWS SNS';
  
  platforms: {
    ios: {
      platform: 'APNS',
      certificateArn: 'arn:aws:sns:...:app/APNS/verpa-ios';
      sandbox: false;
    };
    
    android: {
      platform: 'FCM',
      serverKey: process.env.FCM_SERVER_KEY;
      applicationArn: 'arn:aws:sns:...:app/GCM/verpa-android';
    };
  };
  
  topics: {
    all: 'arn:aws:sns:...:verpa-all-users';
    premium: 'arn:aws:sns:...:verpa-premium-users';
    alerts: 'arn:aws:sns:...:verpa-critical-alerts';
  };
  
  messageTypes: {
    alert: {
      priority: 'high';
      ttl: 3600;
      sound: 'alert.wav';
      badge: true;
    };
    
    reminder: {
      priority: 'normal';
      ttl: 86400;
      sound: 'default';
    };
    
    marketing: {
      priority: 'low';
      ttl: 604800;
      silent: true;
    };
  };
}
```

### Notification Service Architecture
```typescript
interface NotificationServiceComplete {
  port: 3003;
  
  integrations: {
    email: 'AWS SES';
    sms: 'AWS SNS';
    push: 'AWS SNS';
    inApp: 'WebSocket';
  };
  
  queue: {
    provider: 'AWS SQS';
    queues: {
      email: 'verpa-email-queue';
      sms: 'verpa-sms-queue';
      push: 'verpa-push-queue';
    };
  };
  
  prioritization: {
    critical: {
      channels: ['push', 'sms', 'email'];
      delay: 0;
    };
    high: {
      channels: ['push', 'email'];
      delay: 0;
    };
    normal: {
      channels: ['push'];
      delay: 300;               // 5 минут группировка
    };
    low: {
      channels: ['email'];
      delay: 3600;              // Час группировка
    };
  };
  
  userPreferences: {
    respectQuietHours: true;
    timezone: 'user-specific';
    frequency: {
      immediate: boolean;
      daily: boolean;
      weekly: boolean;
    };
    channels: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
  };
}
```

## IoT интеграция (Future Phases)

### Phase 4 - IoT устройства
```typescript
interface IoTIntegration {
  protocols: {
    mqtt: {
      broker: 'mosquitto';
      topics: [
        'aquarium/{id}/sensors/+',
        'aquarium/{id}/controls/+',
        'aquarium/{id}/alerts/+'
      ];
    };
    
    coap: {
      enabled: true;
      lowPowerDevices: true;
    };
    
    webSocket: {
      realTimeUpdates: true;
      bidirectional: true;
    };
  };
  
  devices: {
    sensors: [
      'temperature',
      'ph',
      'dissolved_oxygen',
      'water_level',
      'flow_rate',
      'tds',
      'ammonia',
      'nitrite',
      'nitrate'
    ];
    
    controllers: [
      'heater',
      'filter',
      'lights',
      'co2_valve',
      'dosing_pump',
      'auto_feeder',
      'water_change_pump'
    ];
  };
  
  features: {
    autoDiscovery: true;
    firmwareOTA: true;
    localControl: true;         // Работа без интернета
    encryption: 'TLS 1.3';
  };
}
```