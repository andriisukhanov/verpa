# Веб админ-панель

## Технологический стек
- **Frontend**: React + TypeScript
- **UI Framework**: Ant Design / Material-UI
- **State Management**: Redux Toolkit / Zustand
- **API Client**: Axios + React Query
- **Charts**: Recharts / Chart.js
- **Tables**: React Table / AG Grid

## Структура админ-панели

### 1. Dashboard
```typescript
interface DashboardStats {
  users: {
    total: number;
    active: number;           // За последние 30 дней
    new: number;              // За последние 7 дней
    churn: number;            // Отток %
  };
  
  subscriptions: {
    free: number;
    premium: number;
    revenue: {
      daily: number;
      monthly: number;
      yearly: number;
    };
    mrr: number;              // Monthly Recurring Revenue
  };
  
  aquariums: {
    total: number;
    active: number;
    byType: {
      freshwater: number;
      marine: number;
      brackish: number;
    };
  };
  
  system: {
    apiCalls: number;
    errorRate: number;
    avgResponseTime: number;
    storageUsed: number;
  };
}
```

### 2. Управление пользователями
```typescript
interface UserManagement {
  // Список пользователей
  users: {
    search: string;
    filters: {
      status: UserStatus[];
      subscription: SubscriptionType[];
      registrationDate: DateRange;
      lastActivity: DateRange;
    };
    sorting: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
  
  // Действия с пользователем
  userActions: {
    viewProfile(userId: string): UserDetails;
    editUser(userId: string, data: Partial<User>): void;
    
    // Управление статусом
    suspend(userId: string, reason: string): void;
    activate(userId: string): void;
    delete(userId: string): void;
    
    // Управление подпиской
    upgradeSubscription(userId: string): void;
    downgradeSubscription(userId: string): void;
    grantTrialExtension(userId: string, days: number): void;
    
    // Коммуникация
    sendEmail(userId: string, template: EmailTemplate): void;
    sendPushNotification(userId: string, message: string): void;
  };
}
```

### 3. Управление подписками
```typescript
interface SubscriptionManagement {
  // Операции с подписками
  operations: {
    // Массовые действия
    bulkUpgrade(userIds: string[]): void;
    createPromoCode(params: PromoCodeParams): void;
    
    // Отчеты
    generateReport(type: 'revenue' | 'churn' | 'growth'): Report;
    exportData(format: 'csv' | 'xlsx'): void;
  };
  
  // История транзакций
  transactions: {
    list: Transaction[];
    filters: {
      type: 'payment' | 'refund' | 'chargeback';
      status: 'success' | 'failed' | 'pending';
      dateRange: DateRange;
      amount: { min: number; max: number };
    };
    
    actions: {
      refund(transactionId: string, amount: number): void;
      retry(transactionId: string): void;
      viewDetails(transactionId: string): TransactionDetails;
    };
  };
}
```

### 4. Финансовые операции
```typescript
interface FinancialOperations {
  // Платежи
  payments: {
    providers: ['stripe', 'paypal', 'apple_pay', 'google_pay'];
    
    reconciliation: {
      matchPayments(): void;
      resolveDisputes(): void;
      exportForAccounting(): void;
    };
  };
  
  // Метрики
  metrics: {
    revenue: {
      gross: number;
      net: number;
      fees: number;
      refunds: number;
    };
    
    kpi: {
      arpu: number;           // Average Revenue Per User
      ltv: number;            // Lifetime Value
      cac: number;            // Customer Acquisition Cost
      churnRate: number;
    };
    
    forecasting: {
      nextMonth: number;
      nextQuarter: number;
      yearEnd: number;
    };
  };
}
```

### 5. Модерация контента
```typescript
interface ContentModeration {
  // Социальные функции (Phase 2)
  posts: {
    reported: Post[];
    
    actions: {
      approve(postId: string): void;
      remove(postId: string, reason: string): void;
      warnUser(userId: string, message: string): void;
      banUser(userId: string, duration: number): void;
    };
  };
  
  // AI контент (Phase 3)
  aiContent: {
    reviewGeneratedContent(): void;
    adjustAIParameters(): void;
    trainModeration(): void;
  };
}
```

### 6. Системные настройки
```typescript
interface SystemSettings {
  // Конфигурация
  config: {
    maintenance: {
      enabled: boolean;
      message: string;
      scheduledEnd?: Date;
    };
    
    features: {
      toggleFeature(feature: string, enabled: boolean): void;
      abTesting: ABTestConfig[];
    };
    
    limits: {
      freeUserLimits: FreeUserLimits;
      rateLimits: RateLimitConfig;
    };
  };
  
  // Мониторинг
  monitoring: {
    logs: {
      level: 'error' | 'warn' | 'info' | 'debug';
      search: string;
      timeRange: DateRange;
    };
    
    alerts: {
      rules: AlertRule[];
      notifications: NotificationChannel[];
    };
  };
}
```

## UI/UX компоненты

### Основные компоненты:
```typescript
// Таблица пользователей
interface UserTable {
  columns: [
    'id',
    'email',
    'name',
    'subscription',
    'status',
    'aquariums',
    'lastActive',
    'actions'
  ];
  
  features: {
    search: boolean;
    filters: boolean;
    export: boolean;
    bulkActions: boolean;
    pagination: boolean;
  };
}

// Графики и диаграммы
interface Charts {
  revenueChart: LineChart;
  userGrowthChart: AreaChart;
  subscriptionDistribution: PieChart;
  retentionCohort: HeatmapChart;
}
```

## Безопасность

### Авторизация админов:
```typescript
interface AdminAuth {
  roles: 'super_admin' | 'admin' | 'support' | 'finance';
  
  permissions: {
    users: ['read', 'write', 'delete'];
    subscriptions: ['read', 'write'];
    finances: ['read', 'write', 'refund'];
    content: ['read', 'moderate'];
    system: ['read', 'configure'];
  };
  
  twoFactorAuth: boolean;
  ipWhitelist: string[];
  auditLog: boolean;
}
```

### Аудит действий:
- Логирование всех действий
- Кто, что, когда изменил
- Возможность отката изменений
- Экспорт логов для compliance