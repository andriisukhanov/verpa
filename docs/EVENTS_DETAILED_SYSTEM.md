# Детальная система событий

## Типы событий

### 1. Быстрые события (Quick Events)
Одноразовые действия, которые происходят "сейчас" или произошли недавно

```typescript
interface QuickEvent {
  // Измерения
  measurement: {
    types: [
      'temperature',      // Замер температуры
      'ph',              // Замер pH
      'ammonia',         // Тест на аммиак
      'nitrite',         // Тест на нитриты
      'nitrate',         // Тест на нитраты
      'gh',              // Общая жесткость
      'kh',              // Карбонатная жесткость
      'tds',             // TDS метр
      'salinity',        // Соленость (для морских)
      'multiple'         // Несколько параметров сразу
    ];
    
    entry: {
      quick: {           // Быстрый ввод
        value: number;
        unit: string;
        photo?: string;  // Фото тест-полоски
      };
      
      detailed: {        // Детальный ввод
        values: Record<string, number>;
        testKit: string; // Какой тест использовали
        notes?: string;
        photos?: string[];
      };
    };
  };
  
  // Наблюдения
  observation: {
    types: [
      'photo',           // Просто фото
      'behavior',        // Поведение рыб
      'health',          // Состояние здоровья
      'growth',          // Рост растений/рыб
      'spawning',        // Нерест
      'problem',         // Проблема замечена
      'improvement'      // Улучшение состояния
    ];
    
    entry: {
      description: string;
      photos: string[];
      tags: string[];    // #нерест #болезнь #рост
      mood?: 'positive' | 'neutral' | 'negative' | 'critical';
    };
  };
  
  // Быстрые действия
  quickAction: {
    types: [
      'feeding',         // Покормил
      'lights_on',       // Включил свет
      'lights_off',      // Выключил свет
      'dose_fertilizer', // Добавил удобрения
      'dose_medication', // Добавил лекарство
      'top_off'          // Долил воду
    ];
    
    templates: {       // Предустановленные шаблоны
      feeding: {
        food: string;
        amount: 'little' | 'normal' | 'much';
        allEaten: boolean;
      };
      
      dosing: {
        product: string;
        amount: number;
        unit: 'ml' | 'drops' | 'tablets';
      };
    };
  };
}
```

### 2. Периодические события (Recurring Events)
События, которые повторяются по расписанию

```typescript
interface RecurringEvent {
  // Обслуживание
  maintenance: {
    types: [
      'water_change',    // Подмена воды
      'filter_clean',    // Чистка фильтра
      'glass_clean',     // Чистка стекол
      'gravel_vacuum',   // Сифонка грунта
      'equipment_check', // Проверка оборудования
      'trim_plants',     // Стрижка растений
      'test_water',      // Тестирование воды
      'backup_power'     // Проверка ИБП
    ];
    
    schedule: {
      pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
      
      // Для кастомных интервалов
      custom?: {
        every: number;
        unit: 'days' | 'weeks' | 'months';
        
        // Или по дням недели
        weekdays?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
        
        // Или по числам месяца
        monthDays?: number[]; // [1, 15] - 1го и 15го
      };
      
      // Время выполнения
      time: {
        preferred: string; // "18:00"
        flexible: boolean; // Можно сдвигать
        window?: {         // Окно выполнения
          from: string;    // "17:00"
          to: string;      // "21:00"
        };
      };
    };
    
    // Детали для конкретных типов
    details: {
      waterChange?: {
        percentage: number;
        volume: number;    // Литры
        
        steps: [
          'turn_off_equipment',
          'remove_water',
          'clean_glass',
          'vacuum_substrate',
          'add_water',
          'add_conditioner',
          'turn_on_equipment',
          'check_temperature'
        ];
        
        reminders: {
          prepareWater: number; // Часов до события
          buyConditioner: boolean;
        };
      };
      
      filterMaintenance?: {
        type: 'rinse' | 'deep_clean' | 'media_change';
        
        media: Array<{
          type: string;
          action: 'rinse' | 'replace' | 'recharge';
          interval: number; // Дней
        }>;
      };
    };
  };
  
  // Дозирование
  dosing: {
    types: [
      'fertilizer',      // Удобрения
      'supplement',      // Добавки
      'medication',      // Лекарства
      'water_conditioner', // Кондиционер
      'bacteria',        // Бактерии
      'buffer'           // pH/KH буфер
    ];
    
    schedule: {
      method: 'ei' | 'pps' | 'weekly' | 'daily' | 'custom';
      
      doses: Array<{
        product: string;
        amount: number;
        unit: string;
        days: string[]; // ['mon', 'wed', 'fri']
        time: string;
      }>;
      
      // Автокорректировка
      autoAdjust?: {
        based_on: 'nitrate_level' | 'plant_growth' | 'algae';
        factor: number; // Множитель дозы
      };
    };
  };
}
```

### 3. События изменений (Change Events)
События, которые меняют состав аквариума

```typescript
interface ChangeEvent {
  // Живность
  livestock: {
    action: 'add' | 'remove' | 'died' | 'born' | 'sold' | 'quarantine';
    
    details: {
      species: string;
      quantity: number;
      
      // Для добавления
      add?: {
        source: 'store' | 'breeder' | 'friend' | 'wild' | 'own_breeding';
        price?: number;
        acclimatization: {
          method: 'float' | 'drip' | 'quick';
          duration: number; // минут
        };
        quarantine: {
          required: boolean;
          duration?: number; // дней
          tank?: string;
        };
      };
      
      // Для удаления
      remove?: {
        reason: 'sold' | 'died' | 'donated' | 'moved' | 'culled';
        destination?: string; // Куда переместили
        notes?: string;
      };
      
      // Для рождения
      birth?: {
        parents?: string[]; // ID родителей
        approximate: boolean; // Примерное количество
        survival_rate?: number; // %
      };
    };
    
    // Фото для истории
    photos?: string[];
    
    // Обновление инвентаря
    updateInventory: boolean;
  };
  
  // Растения
  plants: {
    action: 'add' | 'remove' | 'trim' | 'propagate' | 'died';
    
    details: {
      species: string;
      quantity?: number;
      
      add?: {
        source: string;
        condition: 'excellent' | 'good' | 'fair' | 'poor';
        placement: string[]; // Где посадили
      };
      
      trim?: {
        amount: 'light' | 'moderate' | 'heavy';
        propagated: boolean;
        cuttings: number;
      };
    };
  };
  
  // Оборудование
  equipment: {
    action: 'add' | 'remove' | 'replace' | 'repair' | 'upgrade';
    
    item: {
      type: string;
      brand: string;
      model: string;
      
      change?: {
        reason: string;
        old_item?: string;
        warranty?: boolean;
        cost?: number;
      };
    };
  };
  
  // Декорации
  decorations: {
    action: 'add' | 'remove' | 'rearrange';
    
    items: Array<{
      type: 'rock' | 'wood' | 'artificial' | 'substrate';
      description: string;
      photo?: string;
    }>;
    
    // Для перестановки
    rearrange?: {
      reason: string;
      before_photo: string;
      after_photo: string;
      satisfaction: 1 | 2 | 3 | 4 | 5;
    };
  };
}
```

## Система планирования

### Гибкое планирование событий
```typescript
interface EventScheduling {
  // Время события
  timing: {
    // Немедленно
    immediate: {
      timestamp: Date; // Сейчас или задним числом
      backdated?: boolean;
    };
    
    // Запланировано
    scheduled: {
      date: Date;
      time?: string; // Опционально время
      
      // Гибкость времени
      flexibility: {
        type: 'exact' | 'morning' | 'afternoon' | 'evening' | 'anytime';
        window?: {
          from: string;
          to: string;
        };
      };
    };
    
    // Повторяющееся
    recurring: {
      startDate: Date;
      endDate?: Date; // Опционально конец
      
      pattern: RecurrencePattern;
      
      // Исключения
      exceptions?: Date[]; // Даты пропуска
      
      // Автоподстройка
      autoReschedule: {
        enabled: boolean;
        ifMissed: 'skip' | 'next_day' | 'asap';
      };
    };
  };
  
  // Напоминания
  reminders: {
    enabled: boolean;
    
    alerts: Array<{
      type: 'push' | 'email' | 'sms' | 'in-app';
      timing: {
        value: number;
        unit: 'minutes' | 'hours' | 'days';
        before: boolean; // До события
      };
      
      // Кастомное сообщение
      customMessage?: string;
      
      // Условия
      conditions?: {
        onlyIfHome: boolean; // Только если дома (по геолокации)
        quietHours: boolean; // Учитывать тихие часы
      };
    }>;
    
    // Настойчивые напоминания
    persistent: {
      enabled: boolean;
      interval: number; // Минут между напоминаниями
      maxAttempts: number;
    };
  };
  
  // Зависимости
  dependencies?: {
    // Зависит от других событий
    dependsOn?: string[]; // ID событий
    
    // Условия выполнения
    conditions?: Array<{
      type: 'parameter' | 'event' | 'time' | 'weather';
      
      parameter?: {
        name: string;
        operator: '>' | '<' | '=' | '!=';
        value: number;
      };
      
      event?: {
        id: string;
        status: 'completed' | 'skipped';
        within?: number; // Дней
      };
    }>;
  };
}
```

## Ввод задним числом

### Исторические события
```typescript
interface BackdatedEvent {
  // Указание времени
  timestamp: {
    date: Date;
    time?: string; // Опционально точное время
    approximate?: boolean; // Примерное время
  };
  
  // Причина заднего ввода
  reason?: 'forgot' | 'bulk_entry' | 'migration' | 'paper_log';
  
  // Источник данных
  source?: {
    type: 'memory' | 'paper' | 'photo' | 'other_app';
    reference?: string; // Ссылка на источник
  };
  
  // Валидация
  validation: {
    // Проверка логичности
    plausible: boolean; // Не в будущем, не слишком давно
    
    // Конфликты
    conflicts?: Array<{
      event: string;
      reason: string;
    }>;
    
    // Подтверждение
    confirmed: boolean; // Пользователь подтвердил
  };
  
  // Пакетный ввод
  batch?: {
    id: string; // ID пакета
    total: number;
    current: number;
    
    // Шаблон для быстрого ввода
    template?: Partial<Event>;
  };
}
```

## Интерфейс добавления событий

### UI/UX для создания событий
```typescript
interface EventCreationUI {
  // Быстрое добавление
  quickAdd: {
    // Виджеты на главном экране
    widgets: [
      { icon: '🌡️', action: 'temperature', label: 'Температура' },
      { icon: '💧', action: 'water_change', label: 'Подмена' },
      { icon: '🐟', action: 'feeding', label: 'Кормление' },
      { icon: '📸', action: 'photo', label: 'Фото' },
      { icon: '🧪', action: 'test_water', label: 'Тесты' }
    ];
    
    // Умные предложения
    suggestions: {
      based_on: 'time' | 'history' | 'schedule';
      items: string[]; // "Пора покормить", "Запланирована подмена"
    };
  };
  
  // Полная форма
  fullForm: {
    // Шаги создания
    steps: [
      'type_selection',
      'details_input',
      'timing_setup',
      'reminders_config',
      'review_confirm'
    ];
    
    // Автозаполнение
    autofill: {
      from_previous: boolean; // Из предыдущих событий
      from_schedule: boolean; // Из расписания
      smart_defaults: boolean; // Умные значения по умолчанию
    };
    
    // Шаблоны
    templates: {
      personal: Template[]; // Личные шаблоны
      community: Template[]; // Из сообщества
      suggested: Template[]; // Предложенные системой
    };
  };
  
  // Голосовой ввод
  voiceInput?: {
    enabled: boolean;
    commands: [
      "Температура 25 градусов",
      "Подменил 30 процентов",
      "Добавил 5 неонов",
      "Почистил фильтр"
    ];
  };
}
```