# Настройки приложения и работа с временными зонами

## Экран настроек

### Структура настроек:
```typescript
interface UserSettings {
  // Персональные данные
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  
  // Локализация
  localization: {
    language: 'ru' | 'en' | 'es' | 'de' | 'fr' | 'uk';
    timezone: string;  // IANA timezone (Europe/Moscow, America/New_York)
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '24h' | '12h';
    firstDayOfWeek: 'monday' | 'sunday';
  };
  
  // Единицы измерения
  units: {
    temperature: 'celsius' | 'fahrenheit';
    volume: 'liters' | 'gallons';
    length: 'cm' | 'inches';
    weight: 'grams' | 'ounces';
  };
  
  // Уведомления
  notifications: {
    push: {
      enabled: boolean;
      criticalAlerts: boolean;
      reminders: boolean;
      news: boolean;
    };
    email: {
      enabled: boolean;
      frequency: 'immediately' | 'daily' | 'weekly';
      types: string[];
    };
  };
  
  // Приватность
  privacy: {
    shareAnalytics: boolean;
    publicProfile: boolean;
    showInCommunity: boolean;
  };
}
```

## Работа с временными зонами

### Принципы работы:
1. **Хранение в UTC** - все timestamps в базе данных хранятся в UTC
2. **Конвертация на клиенте** - отображение в локальной timezone пользователя
3. **Timezone в профиле** - каждый пользователь имеет свою timezone
4. **Автоопределение** - при первом входе определяем timezone автоматически

### Архитектура работы с временем:
```typescript
// Все даты в базе данных
interface DatabaseTimestamp {
  createdAt: Date;        // UTC
  scheduledAt: Date;      // UTC
  userTimezone: string;   // IANA timezone для контекста
}

// Конвертация для отображения
class TimezoneService {
  // Сохранение события
  saveEvent(event: Event, userTimezone: string) {
    return {
      ...event,
      scheduledAt: this.toUTC(event.scheduledAt, userTimezone),
      userTimezone: userTimezone
    };
  }
  
  // Загрузка события
  loadEvent(event: DatabaseEvent, userTimezone: string) {
    return {
      ...event,
      scheduledAt: this.fromUTC(event.scheduledAt, userTimezone),
      scheduledAtLocal: this.formatLocal(event.scheduledAt, userTimezone)
    };
  }
  
  // Проверка наступления времени события
  isEventDue(event: DatabaseEvent): boolean {
    const now = new Date(); // UTC
    return now >= event.scheduledAt;
  }
}
```

### Сценарии использования:

#### 1. Создание события с напоминанием:
```typescript
// Пользователь в Москве создает кормление на 18:00
const userInput = {
  type: 'feeding',
  time: '18:00',           // Локальное время пользователя
  date: '2024-01-15',      // Локальная дата
  timezone: 'Europe/Moscow'
};

// Сохраняем в БД
const dbEvent = {
  scheduledAt: '2024-01-15T15:00:00Z',  // 18:00 MSK = 15:00 UTC
  userTimezone: 'Europe/Moscow'
};
```

#### 2. Push-уведомления:
```typescript
// Cron job проверяет события каждую минуту
class NotificationScheduler {
  async checkDueEvents() {
    const now = new Date(); // UTC
    const dueEvents = await Event.find({
      scheduledAt: { $lte: now },
      status: 'scheduled'
    });
    
    for (const event of dueEvents) {
      // Отправляем push с учетом timezone пользователя
      const localTime = this.formatLocal(event.scheduledAt, event.userTimezone);
      await this.sendPush(event.userId, {
        title: `Время для: ${event.title}`,
        body: `Запланировано на ${localTime}`
      });
    }
  }
}
```

#### 3. Смена временной зоны:
```typescript
class TimezoneChangeHandler {
  async handleTimezoneChange(userId: string, oldTz: string, newTz: string) {
    // Обновляем профиль пользователя
    await User.updateOne({ _id: userId }, { 'localization.timezone': newTz });
    
    // НЕ меняем существующие события в БД
    // Они остаются в UTC и будут просто отображаться в новой timezone
    
    // Информируем пользователя
    return {
      message: 'Временная зона изменена. Все события будут отображаться в новом часовом поясе.'
    };
  }
}
```

### Особые случаи:

#### Переход на летнее/зимнее время:
```typescript
// Используем IANA timezone database которая автоматически учитывает DST
// Europe/Moscow - без перехода
// America/New_York - с переходом на летнее время
```

#### Повторяющиеся события:
```typescript
interface RecurringEvent {
  // Сохраняем локальное время для повторений
  recurrence: {
    localTime: '09:00',        // Всегда в 9 утра по местному
    timezone: 'Europe/London', // Может меняться с DST
    pattern: 'daily'
  };
}
```

## UI/UX для настроек времени

### Отображение времени:
- Всегда показываем в локальной timezone пользователя
- Опционально показываем UTC для технических пользователей
- Относительное время для недавних событий ("5 минут назад")

### Выбор timezone:
- Автоопределение при первом входе
- Поиск по городу/стране
- Группировка по регионам
- Показ текущего времени в выбранной зоне