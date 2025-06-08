# Ограничения подписок

## Сравнительная таблица

| Функция | Free | Premium |
|---------|------|---------|
| Количество аквариумов | 1 | Неограниченно |
| События в день | 5 | Неограниченно |
| История данных | 7 дней | Без ограничений |
| Параметры мониторинга | Температура, pH | Все параметры |
| Push-уведомления | ❌ | ✅ |
| Экспорт данных | ❌ | ✅ (PDF, CSV) |
| API доступ | ❌ | ✅ |
| Автоматизация | ❌ | ✅ |
| AI рекомендации | ❌ | ✅ |
| Облачный бэкап | ❌ | ✅ |
| Реклама | ✅ | ❌ |

## Технические ограничения Free

### События:
```typescript
interface FreeUserLimits {
  maxAquariums: 1;
  maxEventsPerDay: 5;
  historyRetentionDays: 7;
  
  allowedEventTypes: [
    'feeding',
    'waterChange',
    'measurement' // только temperature и ph
  ];
  
  blockedEventTypes: [
    'automation',
    'scheduled',
    'recurring'
  ];
}
```

### Параметры мониторинга:
```typescript
interface FreeUserParameters {
  allowed: ['temperature', 'ph'];
  blocked: ['ammonia', 'nitrite', 'nitrate', 'gh', 'kh', 'tds', 'oxygen'];
}
```

### UI ограничения:
- Баннерная реклама внизу экрана
- Межстраничная реклама каждые 10 минут
- Кнопки Premium функций заблокированы с иконкой замка
- Попап с предложением апгрейда при попытке использовать Premium функцию

## Проверка лимитов

### Middleware для проверки:
```typescript
interface SubscriptionCheck {
  checkAquariumLimit(userId: string): boolean;
  checkDailyEventLimit(userId: string): boolean;
  checkFeatureAccess(userId: string, feature: string): boolean;
  getHistoryRetention(userId: string): number;
}
```

### Сообщения об ограничениях:
```typescript
const limitMessages = {
  aquariumLimit: "Достигнут лимит аквариумов. Обновитесь до Premium для добавления новых.",
  eventLimit: "Достигнут дневной лимит событий (5). Попробуйте завтра или обновитесь до Premium.",
  featureBlocked: "Эта функция доступна только в Premium версии.",
  historyLimited: "История доступна только за последние 7 дней. Обновитесь для полного доступа."
};
```