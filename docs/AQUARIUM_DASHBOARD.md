# Страница аквариума - События

## Главный экран аквариума - Timeline событий

### Структура экрана:
1. **Header** - название аквариума, фото, быстрые индикаторы
2. **Timeline** - вертикальная временная шкала
3. **FAB** - плавающая кнопка "Добавить событие"

## Timeline событий

### Разделение по времени:
```typescript
interface Timeline {
  futureEvents: Event[];      // События в будущем (сверху)
  todayMarker: boolean;       // Маркер "Сегодня"
  pastEvents: Event[];        // Прошедшие события (снизу)
}
```

### Типы событий:
```typescript
type EventType = 
  | 'measurement'      // Замер параметров
  | 'waterChange'      // Подмена воды
  | 'feeding'          // Кормление
  | 'maintenance'      // Обслуживание оборудования
  | 'livestock'        // Добавление/удаление рыб
  | 'plant'           // Работа с растениями
  | 'medication'       // Лечение/добавки
  | 'photo'           // Фотография
  | 'note'            // Заметка
  | 'equipment';      // Изменение оборудования

interface Event {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: Date;
  status: 'scheduled' | 'completed' | 'missed' | 'pending_confirmation';
  
  // Данные события
  data: {
    // Для measurement
    parameters?: {
      temperature?: number;
      ph?: number;
      ammonia?: number;
      nitrite?: number;
      nitrate?: number;
      gh?: number;
      kh?: number;
    };
    
    // Для waterChange
    waterChange?: {
      percentage: number;
      volume: number;
      additives?: string[];
    };
    
    // Для livestock/plant
    species?: {
      name: string;
      quantity: number;
      action: 'added' | 'removed' | 'died';
      photo?: string;
    };
    
    // Для photo
    photos?: string[];
    
    // Общие
    notes?: string;
    attachments?: string[];
  };
  
  // Настройки напоминаний
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
    type: 'push' | 'email' | 'both';
  };
  
  // Для повторяющихся событий
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
    exceptions?: Date[];
  };
}
```

## Добавление события

### Quick Add (Быстрое добавление):
- Предустановленные шаблоны частых событий
- Одним тапом для рутинных задач
```typescript
interface QuickAddTemplate {
  type: EventType;
  title: string;
  icon: string;
  defaultData: Partial<Event['data']>;
}

// Примеры шаблонов
const quickTemplates = [
  { type: 'feeding', title: 'Кормление', icon: '🐟' },
  { type: 'waterChange', title: 'Подмена 25%', icon: '💧' },
  { type: 'photo', title: 'Фото', icon: '📸' },
  { type: 'measurement', title: 'Тест воды', icon: '🧪' }
];
```

### Advanced Add (Расширенное добавление):
1. Выбор типа события
2. Заполнение деталей
3. Настройка времени (сейчас/запланировать)
4. Настройка напоминаний
5. Настройка повторений

## Система подтверждений

### Логика подтверждения:
```typescript
interface EventConfirmation {
  eventId: string;
  scheduledTime: Date;
  confirmationDeadline: Date;  // +1 час после scheduledTime
  
  confirmationFlow: {
    // Сразу после наступления времени
    initialNotification: {
      title: "Время выполнить: {eventTitle}";
      actions: ['Выполнено', 'Отложить', 'Пропустить'];
    };
    
    // Через 30 минут
    reminderNotification?: {
      title: "Напоминание: {eventTitle}";
      body: "Подтвердите выполнение";
    };
    
    // Через 1 час
    finalNotification: {
      title: "Вы выполнили: {eventTitle}?";
      actions: ['Да', 'Нет', 'Отменить'];
    };
  };
}
```

### Статусы после истечения времени:
- **Confirmed** - пользователь подтвердил
- **Missed** - пользователь сказал "Нет" или не ответил
- **Rescheduled** - перенесено на другое время

## UI/UX особенности

### Визуальное отображение:
1. **Будущие события** - полупрозрачные, с иконкой часов
2. **Сегодняшние** - выделены цветом, анимация
3. **Прошедшие** - обычные, с галочкой если выполнены
4. **Пропущенные** - красная метка, восклицательный знак

### Интерактивность:
- Свайп влево - быстрое подтверждение/отмена
- Свайп вправо - отложить
- Тап - открыть детали
- Долгий тап - меню действий

### Группировка:
- По дням для прошедших
- По часам для сегодняшних
- По датам для будущих