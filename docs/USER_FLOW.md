# User Flow и Аутентификация

## Вход в приложение
### Методы аутентификации:
1. **OAuth провайдеры**:
   - Google Sign-In
   - Apple ID
2. **Классическая аутентификация**:
   - Email + Password

## Регистрация и верификация email

### Flow регистрации через email:
```typescript
interface RegistrationFlow {
  // 1. Регистрация
  register: {
    email: string;
    password: string;
    username: string;
    timezone: string;  // Автоопределение на клиенте
  };
  
  // 2. После успешной регистрации
  afterRegistration: {
    userId: string;
    status: 'pending_verification';
    emailSent: true;
    message: 'Проверьте вашу почту для подтверждения';
  };
  
  // 3. Email с подтверждением
  verificationEmail: {
    subject: 'Подтвердите ваш email - Verpa';
    link: 'https://app.verpa.app/verify?token=xxx';
    expiresIn: '24 hours';
  };
  
  // 4. После подтверждения
  afterVerification: {
    status: 'active';
    autoLogin: true;
    redirect: '/onboarding';
  };
}
```

### Flow восстановления пароля:
```typescript
interface PasswordRecoveryFlow {
  // 1. Запрос восстановления
  requestReset: {
    email: string;
    captcha?: string;  // Защита от брутфорса
  };
  
  // 2. Email отправлен
  emailSent: {
    message: 'Если email существует, мы отправили инструкции';
    // Не раскрываем существует ли email
  };
  
  // 3. Email с ссылкой
  resetEmail: {
    subject: 'Восстановление пароля - Verpa';
    link: 'https://app.verpa.app/reset-password?token=xxx';
    expiresIn: '1 hour';
    ipAddress: string;  // Для безопасности
  };
  
  // 4. Форма нового пароля
  newPasswordForm: {
    password: string;
    passwordConfirm: string;
    requirements: {
      minLength: 8;
      hasUpperCase: true;
      hasLowerCase: true;
      hasNumbers: true;
    };
  };
  
  // 5. После смены пароля
  afterReset: {
    success: true;
    autoLogin: false;  // Требуем войти заново
    sessionsRevoked: true;  // Отзываем все сессии
    notificationSent: true;  // Email о смене пароля
  };
}
```

### Повторная отправка email:
```typescript
interface ResendEmail {
  cooldown: 60;  // Секунд между отправками
  maxAttempts: 5;  // Максимум попыток
  dailyLimit: 10;  // В день
}

## Модель пользователя

### Типы подписок:
- **Free** - базовый функционал
  - 1 аквариум максимум
  - Базовые параметры мониторинга (температура, pH)
  - История данных за 7 дней
  - Ограниченные события (5 в день)
  - Без экспорта данных
  - Без API доступа
  - Реклама в приложении
  
- **Premium** - полный функционал
  - Неограниченное количество аквариумов
  - Все параметры мониторинга
  - История данных без ограничений
  - Неограниченные события
  - Push-уведомления
  - Экспорт данных (PDF, CSV)
  - API доступ
  - Без рекламы
  - Автоматизация и расписания
  - AI рекомендации (Gemma3)
  - Облачное резервное копирование

### Статусы пользователя:
1. **Active** - активный пользователь
2. **Suspended** - временно заблокирован (неоплата, нарушения)
3. **Inactive** - неактивен более 30 дней
4. **Pending** - ожидает подтверждения email
5. **Trial** - пробный период Premium (14 дней)

## User Domain Model

```typescript
interface User {
  id: string;
  email: string;
  username: string;              // Уникальный никнейм
  profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;        // Отображаемое имя
    avatar?: {
      url: string;               // S3 URL
      thumbnailUrl: string;      // Маленькая версия
      updatedAt: Date;
    };
    bio?: string;                // О себе
    timezone: string;
    locale: string;
  };
  
  authProviders: {
    google?: {
      id: string;
      email: string;
    };
    apple?: {
      id: string;
      email: string;
    };
    local?: {
      passwordHash: string;
      emailVerified: boolean;
    };
  };
  
  subscription: {
    type: 'free' | 'premium';
    status: 'active' | 'cancelled' | 'expired';
    validUntil?: Date;
    autoRenew: boolean;
    trialUsed: boolean;
  };
  
  status: 'active' | 'suspended' | 'inactive' | 'pending' | 'trial';
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
    loginCount: number;
  };
  
  preferences: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    units: {
      temperature: 'celsius' | 'fahrenheit';
      volume: 'liters' | 'gallons';
    };
  };
}
```

## Права доступа по подпискам

### Free:
- 1 аквариум максимум
- Базовые параметры (температура, pH)
- История за 7 дней
- До 5 событий в день
- Уведомления только в приложении
- Реклама
- Без автоматизации
- Без экспорта данных

### Premium:
- Неограниченно аквариумов
- Все параметры мониторинга
- Полная история
- Неограниченные события
- Push-уведомления
- Без рекламы
- Автоматизация и расписания
- Экспорт в PDF/CSV
- API доступ
- AI рекомендации
- Облачный бэкап
- Приоритетная поддержка