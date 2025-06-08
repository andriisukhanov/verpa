# Главный экран и создание аквариума

## Главный экран после входа

### Компоненты:
1. **Список аквариумов**
   - Карточки с превью (фото)
   - Название аквариума
   - Статус (зеленый/желтый/красный индикатор)
   - Основные параметры (температура, pH)
   - Последнее обновление данных

2. **Кнопка "Добавить аквариум"** (+)
   - Проверка лимитов по подписке
   - Запуск flow создания

3. **Секция "Новости"**
   - Тематические статьи по аквариумистике
   - Советы по уходу
   - Обновления приложения
   - Персонализированные рекомендации

## Flow создания аквариума

### Этап 1: Базовая информация (обязательный)
```typescript
interface AquariumBasicInfo {
  name: string;                    // Название аквариума
  photo: string;                   // Фото аквариума (base64/url)
  volume: number;                  // Объем в литрах
  type: 'freshwater' | 'marine' | 'brackish';  // Тип воды
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  setupDate: Date;                 // Дата запуска
}
```

### Этап 2: Растения (опциональный)
```typescript
interface PlantsSurvey {
  hasPlants: boolean;
  plants?: Array<{
    species: string;              // Вид растения
    quantity: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  lightingHours: number;          // Часов света в день
  co2System: boolean;             // Есть ли CO2
  fertilizers: string[];          // Используемые удобрения
}
```

### Этап 3: Животные (опциональный)
```typescript
interface LivestockSurvey {
  fish: Array<{
    species: string;              // Вид рыбы
    quantity: number;
    size: 'small' | 'medium' | 'large';
    addedDate: Date;
  }>;
  invertebrates: Array<{
    type: string;                 // Креветки, улитки, etc
    quantity: number;
  }>;
  feedingSchedule: {
    timesPerDay: number;
    foodTypes: string[];
  };
}
```

### Этап 4: Параметры воды (опциональный)
```typescript
interface WaterParameters {
  source: 'tap' | 'ro' | 'bottled' | 'well';
  currentParameters?: {
    temperature: number;
    ph: number;
    gh: number;                   // Общая жесткость
    kh: number;                   // Карбонатная жесткость
    ammonia: number;
    nitrite: number;
    nitrate: number;
  };
  waterChangeSchedule: {
    percentage: number;           // Процент подмены
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  };
}
```

### Этап 5: Оборудование (опциональный)
```typescript
interface Equipment {
  filter: {
    type: 'internal' | 'external' | 'hob' | 'sump';
    model: string;
    flowRate: number;             // л/ч
  };
  heater: {
    wattage: number;
    model: string;
    targetTemp: number;
  };
  lighting: {
    type: 'led' | 'fluorescent' | 'metal-halide';
    wattage: number;
    model: string;
  };
  additionalEquipment: Array<{
    type: string;
    model: string;
    purpose: string;
  }>;
}
```

## Onboarding после создания

### Флаг обучения
```typescript
interface UserOnboarding {
  isFirstAquarium: boolean;
  tutorialCompleted: boolean;
  tutorialSteps: {
    dashboard: boolean;
    parameters: boolean;
    equipment: boolean;
    maintenance: boolean;
    alerts: boolean;
  };
}
```

### Этапы обучения:
1. **Dashboard Tour**
   - Обзор главных показателей
   - Как читать индикаторы
   - Навигация по разделам

2. **Параметры воды**
   - Какие параметры критичны
   - Как часто измерять
   - Целевые значения

3. **Управление оборудованием**
   - Настройка расписаний
   - Автоматизация
   - Ручное управление

4. **Обслуживание**
   - График подмен воды
   - Чистка фильтров
   - Календарь задач

5. **Уведомления**
   - Настройка алертов
   - Критические ситуации
   - Push-уведомления

### Skip опции:
- Можно пропустить весь tutorial
- Можно вернуться к нему из настроек
- Контекстные подсказки остаются активными