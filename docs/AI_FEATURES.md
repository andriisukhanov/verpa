# AI функции (Phase 3)

## 1. Подсчет рыбок по фото

### Computer Vision для аквариумов
```typescript
interface FishCountingAI {
  // Входные данные
  input: {
    image: string;              // Base64 или URL фото
    aquariumId: string;         // Для контекста
    knownSpecies?: string[];    // Известные виды в аквариуме
  };
  
  // Результат анализа
  output: {
    totalCount: number;         // Общее количество обнаруженных рыб
    
    detectedFish: Array<{
      boundingBox: {            // Координаты рыбы на фото
        x: number;
        y: number;
        width: number;
        height: number;
      };
      
      species: {
        predicted: string;      // Предсказанный вид
        confidence: number;     // Уверенность 0-1
        alternatives: Array<{   // Альтернативные варианты
          species: string;
          confidence: number;
        }>;
      };
      
      health: {
        status: 'healthy' | 'possible_issue' | 'needs_attention';
        indicators?: string[];  // ["torn_fins", "spots", "unusual_coloring"]
      };
      
      size: {
        estimated: number;      // Размер в см
        category: 'juvenile' | 'adult' | 'elder';
      };
    }>;
    
    // Дополнительный анализ
    observations: {
      waterClarity: 'crystal' | 'clear' | 'cloudy' | 'murky';
      algaePresence: 'none' | 'minimal' | 'moderate' | 'excessive';
      plantHealth: 'thriving' | 'healthy' | 'struggling' | 'dying';
      overallImpression: string; // Текстовое описание
    };
    
    // Рекомендации
    suggestions?: string[];
  };
}
```

### Use cases:
1. **Инвентаризация** - быстрый подсчет при покупке/продаже
2. **Мониторинг здоровья** - обнаружение болезней по внешнему виду
3. **Отслеживание роста** - сравнение размеров во времени
4. **Поиск пропавших** - "Где моя королевская тетра?"

## 2. AI помощник для критических ситуаций

### Система экстренной помощи
```typescript
interface CriticalSituationAI {
  // Анализ ситуации
  analyze(input: {
    parameters: WaterParameters;
    symptoms: string[];         // ["рыбы на поверхности", "мутная вода"]
    timeline: Event[];          // Последние события
    photos?: string[];          // Фото проблемы
  }): EmergencyResponse;
}

interface EmergencyResponse {
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  diagnosis: {
    primaryCause: string;       // "Аммиачный скачок"
    confidence: number;         // 0.85
    alternativeCauses: string[]; // Другие возможные причины
  };
  
  immediateActions: Array<{
    priority: number;           // 1 - самое важное
    action: string;             // "Подмените 30% воды НЕМЕДЛЕННО"
    timeframe: string;          // "В течение 30 минут"
    reason: string;             // Почему это важно
  }>;
  
  followUpActions: Array<{
    when: string;               // "Через 2 часа"
    action: string;
    monitoring: string[];       // Что контролировать
  }>;
  
  doNotDo: string[];           // Чего НЕ делать
  
  // Пошаговый гайд
  stepByStepGuide: {
    estimated_time: number;     // Минут на все действия
    steps: Array<{
      title: string;
      description: string;
      materials_needed?: string[];
      warning?: string;
      image?: string;           // Иллюстрация
    }>;
  };
}
```

### Примеры критических ситуаций:
1. **Отравление аммиаком/нитритами**
2. **Недостаток кислорода**
3. **Температурный шок**
4. **Вспышка болезни**
5. **Отказ оборудования**
6. **Массовая гибель**

## 3. AI ассистент в приложении

### Интеллектуальный помощник
```typescript
interface AquariumAssistant {
  // Conversational AI
  chat: {
    sendMessage(text: string, context: AquariumContext): AIResponse;
    voiceInput(audio: Blob): Promise<string>;
    suggestedQuestions(): string[]; // Контекстные подсказки
  };
  
  // Проактивные советы
  insights: {
    daily(): Insight[];         // Ежедневные рекомендации
    weekly(): Report;           // Недельный отчет
    predictions(): Prediction[]; // Прогнозы
  };
  
  // Умные напоминания
  reminders: {
    generateSchedule(): MaintenanceSchedule;
    optimizeFeeding(): FeedingPlan;
    predictNextWaterChange(): Date;
  };
}

interface AIResponse {
  text: string;                 // Ответ ассистента
  
  actions?: Array<{             // Предлагаемые действия
    label: string;
    action: () => void;
  }>;
  
  visualizations?: {            // Графики/диаграммы
    type: 'chart' | 'comparison' | 'timeline';
    data: any;
  };
  
  sources?: Array<{             // Источники информации
    type: 'article' | 'video' | 'community_post';
    title: string;
    url: string;
  }>;
}
```

### Возможности AI ассистента:

#### 1. Ответы на вопросы:
- "Почему вода стала мутной?"
- "Можно ли держать вместе неонов и скалярий?"
- "Как понизить pH безопасно?"

#### 2. Анализ трендов:
- "Ваш pH постепенно растет последние 2 недели"
- "Температура нестабильна ночью"
- "Пора почистить фильтр - поток ослаб на 30%"

#### 3. Персонализированные советы:
- Основаны на истории аквариума
- Учитывают виды рыб и растений
- Адаптируются под уровень опыта

#### 4. Обучение:
- Интерактивные уроки
- Квизы и тесты
- Геймифицированное обучение

## 4. Дополнительные AI функции

### Распознавание растений
```typescript
interface PlantRecognitionAI {
  identify(image: string): {
    species: string;
    confidence: number;
    careGuide: PlantCareInfo;
    compatibility: string[];    // Совместимые растения
  };
}
```

### Калькулятор совместимости
```typescript
interface CompatibilityAI {
  checkCompatibility(inhabitants: string[]): {
    overallScore: number;       // 0-100
    conflicts: Conflict[];
    recommendations: string[];
    idealParameters: WaterParameters;
  };
}
```

### Предсказание проблем
```typescript
interface PredictiveAI {
  analyzeTrends(history: Event[]): {
    potentialIssues: Array<{
      issue: string;
      probability: number;
      timeframe: string;
      prevention: string[];
    }>;
  };
}
```

## Техническая реализация

### ML модели:
1. **YOLOv8** - для обнаружения и подсчета рыб
2. **ResNet** - для классификации видов
3. **Time Series** - для анализа параметров
4. **LLM (Gemma3)** - для чата и рекомендаций

### Обработка:
- Edge computing для быстрого отклика
- Cloud processing для сложных задач
- Кэширование результатов
- Offline режим для базовых функций

### Privacy:
- Локальная обработка где возможно
- Анонимизация данных
- Opt-in для всех AI функций
- Прозрачность использования данных