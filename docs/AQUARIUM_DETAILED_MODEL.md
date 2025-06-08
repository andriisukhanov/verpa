# Детальная модель аквариума

## Базовая классификация

### Тип аквариума
```typescript
interface AquariumType {
  waterType: 'freshwater' | 'marine' | 'brackish';
  
  subTypes: {
    freshwater: [
      'tropical',          // Тропический
      'coldwater',         // Холодноводный
      'planted',           // Травник
      'biotope',           // Биотоп
      'blackwater',        // Черная вода
      'cichlid',           // Цихлидник
      'shrimp',            // Креветочник
      'paludarium'         // Палюдариум
    ];
    
    marine: [
      'reef',              // Рифовый
      'fish-only',         // Только рыбы (FO)
      'fowlr',             // Рыбы с живыми камнями (FOWLR)
      'nano-reef',         // Нано-риф
      'species-specific'   // Видовой
    ];
    
    brackish: [
      'mangrove',          // Мангровый
      'estuary'            // Эстуарий
    ];
  };
}
```

## Физические характеристики

### Конструкция аквариума
```typescript
interface AquariumConstruction {
  // Размеры
  dimensions: {
    length: number;        // см
    width: number;         // см
    height: number;        // см
    volume: {
      gross: number;       // Полный объем (литры)
      net: number;         // Чистый объем (за вычетом декораций)
    };
  };
  
  // Материалы
  material: {
    type: 'glass' | 'acrylic' | 'plywood';
    thickness: number;     // мм
    
    glassType?: 'regular' | 'optiwhite' | 'starphire' | 'tempered';
    
    construction: 'rimmed' | 'rimless' | 'braceless';
    silicone: 'clear' | 'black' | 'custom';
  };
  
  // Особенности
  features: {
    overflow: boolean;     // Система перелива
    sump: {
      enabled: boolean;
      volume: number;      // литры
    };
    
    drilling: {
      holes: number;
      positions: string[]; // ['back-left', 'back-right']
    };
    
    cabinet: {
      included: boolean;
      material: string;
      waterproof: boolean;
    };
  };
  
  // Производитель
  manufacturer?: {
    brand: string;
    model: string;
    year: number;
  };
}
```

## Вода и её подготовка

### Источник воды
```typescript
interface WaterSource {
  type: 'tap' | 'well' | 'ro' | 'ro/di' | 'bottled' | 'natural';
  
  // Для водопроводной воды
  tapWater?: {
    chlorine: boolean;
    chloramine: boolean;
    heavyMetals: boolean;
    
    treatment: {
      dechlorinator: string;    // Название препарата
      dosage: number;           // мл на литр
      waitTime: number;         // минут до использования
    };
  };
  
  // Для RO/DI
  roSystem?: {
    stages: 3 | 4 | 5 | 6 | 7;
    tds: number;                // PPM на выходе
    
    remineralization: {
      product: string;          // GH/KH+ и т.д.
      targetGH: number;
      targetKH: number;
      targetTDS: number;
    };
  };
  
  // Добавки для подготовки
  additives: Array<{
    name: string;               // Название препарата
    brand: string;              // Производитель
    purpose: string;            // Назначение
    dosage: {
      amount: number;
      unit: 'ml' | 'g' | 'drops';
      perLiter: number;
    };
    frequency: 'once' | 'daily' | 'weekly' | 'water-change';
  }>;
}
```

### Параметры воды
```typescript
interface WaterParameters {
  // Основные параметры
  temperature: {
    current: number;            // °C
    target: number;
    range: {
      min: number;
      max: number;
    };
  };
  
  ph: {
    current: number;
    target: number;
    range: {
      min: number;
      max: number;
    };
  };
  
  // Жесткость
  hardness: {
    gh: number;                 // °dGH
    kh: number;                 // °dKH
    tds: number;                // PPM
  };
  
  // Азотный цикл
  nitrogen: {
    ammonia: number;            // mg/L
    nitrite: number;            // mg/L
    nitrate: number;            // mg/L
  };
  
  // Дополнительные параметры
  additional: {
    phosphate?: number;         // mg/L
    silicate?: number;          // mg/L
    iron?: number;              // mg/L
    copper?: number;            // mg/L
    
    // Для морских
    salinity?: number;          // PPT
    calcium?: number;           // mg/L
    magnesium?: number;         // mg/L
    alkalinity?: number;        // dKH
  };
}
```

## Освещение

### Система освещения
```typescript
interface LightingSystem {
  // Режим работы
  mode: 'manual' | 'timer' | 'smart' | 'seasonal';
  
  // График освещения
  schedule: {
    sunrise: string;            // "06:00"
    sunset: string;             // "20:00"
    
    photoperiod: {
      total: number;            // Общее время света (часы)
      highIntensity: number;    // Время максимальной яркости
    };
    
    // Лунное освещение
    moonlight?: {
      enabled: boolean;
      duration: number;         // часы
    };
    
    // Имитация грозы
    storm?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'random';
    };
  };
  
  // Светильники
  fixtures: Array<{
    type: 'led' | 'fluorescent' | 'metal-halide' | 'hybrid';
    brand: string;
    model: string;
    
    specs: {
      wattage: number;
      lumens: number;
      colorTemp: number;        // Kelvin
      par?: number;             // μmol/m²/s
      coverage: number;         // см² площади покрытия
    };
    
    features: {
      dimmable: boolean;
      rgbControl: boolean;
      channels: number;         // Количество каналов управления
      fanCooled: boolean;
      waterproof: boolean;
    };
    
    position: {
      mounting: 'hanging' | 'bracket' | 'on-tank' | 'built-in';
      height: number;           // см над водой
    };
  }>;
  
  // Общие показатели
  metrics: {
    totalWattage: number;
    wattsPerLiter: number;
    parAtSubstrate: number;
  };
}
```

## Фильтрация

### Система фильтрации
```typescript
interface FiltrationSystem {
  // Основной фильтр
  primaryFilter: {
    type: 'canister' | 'hob' | 'internal' | 'sump' | 'wet-dry' | 'fluidized-bed';
    brand: string;
    model: string;
    
    specs: {
      ratedFlow: number;        // л/ч
      actualFlow: number;       // Реальный поток
      mediaVolume: number;      // литры
      powerConsumption: number; // Ватт
    };
    
    media: Array<{
      type: 'mechanical' | 'biological' | 'chemical';
      material: string;         // "керамика", "поролон", "активированный уголь"
      volume: number;           // литры
      lastChanged: Date;
      changeInterval: number;   // дней
    }>;
  };
  
  // Дополнительные фильтры
  additionalFilters?: Array<{
    type: string;
    purpose: string;
    flow: number;
  }>;
  
  // Показатели фильтрации
  metrics: {
    totalFlow: number;          // л/ч
    turnoverRate: number;       // Раз в час
    bioload: 'low' | 'medium' | 'high' | 'very-high';
  };
}
```

## Дополнительное оборудование

### Оборудование
```typescript
interface Equipment {
  // Помпы течения
  pumps: Array<{
    type: 'circulation' | 'wave-maker' | 'return' | 'dosing';
    brand: string;
    model: string;
    flow: number;               // л/ч
    
    control: {
      type: 'constant' | 'wave' | 'pulse' | 'random';
      controller?: string;      // Название контроллера
    };
    
    position: string;           // "задняя стенка, левый угол"
  }>;
  
  // Аэрация
  aeration: {
    type: 'none' | 'air-pump' | 'surface-agitation' | 'protein-skimmer';
    
    airPump?: {
      brand: string;
      model: string;
      output: number;           // л/ч
      outlets: number;
      
      accessories: string[];    // ["распылитель", "обратный клапан"]
    };
    
    // Для морских
    proteinSkimmer?: {
      brand: string;
      model: string;
      ratedVolume: number;      // литры
      airFlow: number;          // л/ч
    };
  };
  
  // Обогрев
  heating: {
    type: 'submersible' | 'inline' | 'substrate' | 'room-heating';
    
    heaters: Array<{
      brand: string;
      model: string;
      wattage: number;
      
      control: {
        type: 'built-in' | 'external-thermostat';
        accuracy: number;       // ±°C
      };
      
      safety: {
        shutoff: boolean;
        guard: boolean;
        indicator: boolean;
      };
    }>;
    
    totalWattage: number;
    wattsPerLiter: number;
  };
  
  // CO2 система (для растений)
  co2System?: {
    type: 'pressurized' | 'diy' | 'liquid';
    
    pressurized?: {
      cylinder: {
        size: number;           // кг
        pressure: number;       // bar
      };
      
      regulator: {
        brand: string;
        stages: 1 | 2;
        solenoid: boolean;
      };
      
      diffusion: 'reactor' | 'diffuser' | 'inline';
      
      monitoring: {
        dropChecker: boolean;
        phController: boolean;
        targetPpm: number;
      };
    };
  };
  
  // Дозирование
  dosing?: {
    type: 'manual' | 'pump' | 'reactor';
    
    pumps?: Array<{
      brand: string;
      channels: number;
      
      schedule: Array<{
        solution: string;
        dose: number;           // мл
        time: string;
      }>;
    }>;
  };
}
```

## Обитатели

### Животные
```typescript
interface Livestock {
  fish: Array<{
    species: {
      scientificName: string;   // Латинское название
      commonName: string;       // Обычное название
      localName?: string;       // Местное название
    };
    
    quantity: number;
    
    individuals?: Array<{       // Для ценных особей
      name?: string;
      sex?: 'male' | 'female' | 'unknown';
      age?: number;             // месяцев
      size: number;             // см
      notes?: string;
    }>;
    
    requirements: {
      tempRange: { min: number; max: number };
      phRange: { min: number; max: number };
      hardness: 'soft' | 'medium' | 'hard';
      
      diet: 'carnivore' | 'omnivore' | 'herbivore';
      feeding: string[];        // Типы корма
      
      behavior: {
        aggression: 'peaceful' | 'semi-aggressive' | 'aggressive';
        schooling: boolean;
        minGroup?: number;
        territory: number;      // см² на особь
      };
      
      compatibility: {
        species: string[];      // Совместимые виды
        restrictions: string[]; // Несовместимые
      };
    };
    
    health: {
      quarantined: boolean;
      lastTreatment?: Date;
      notes?: string;
    };
    
    breeding?: {
      mature: boolean;
      spawning: boolean;
      fryCount?: number;
    };
  }>;
  
  invertebrates: Array<{
    type: 'shrimp' | 'snail' | 'crab' | 'crayfish' | 'coral' | 'anemone' | 'other';
    species: string;
    quantity: number;
    
    special: {
      molting?: boolean;        // Для ракообразных
      feeding?: string;         // Специальное питание
      placement?: string;       // Для кораллов
    };
  }>;
}
```

### Растения
```typescript
interface Plants {
  species: Array<{
    scientificName: string;
    commonName: string;
    
    quantity: number;
    placement: 'foreground' | 'midground' | 'background' | 'floating' | 'attached';
    
    requirements: {
      light: 'low' | 'medium' | 'high';
      co2: 'required' | 'beneficial' | 'not-needed';
      
      nutrients: {
        rootFeeding: boolean;
        columnFeeding: boolean;
        ironDemand: 'low' | 'medium' | 'high';
      };
      
      growth: {
        rate: 'slow' | 'medium' | 'fast';
        maxHeight: number;      // см
        propagation: 'runners' | 'cuttings' | 'division' | 'seeds';
      };
    };
    
    condition: {
      health: 'thriving' | 'healthy' | 'struggling' | 'melting';
      algae: 'none' | 'minor' | 'moderate' | 'severe';
      trimming: {
        lastTrimmed?: Date;
        frequency: number;      // дней
      };
    };
  }>;
  
  fertilization: {
    substrate: {
      type: string;             // "ADA Aqua Soil", "Tabs"
      enriched: boolean;
      age: number;              // месяцев
    };
    
    liquid: {
      macro: string;            // NPK
      micro: string;            // Микроэлементы
      iron: string;             // Железо
      
      schedule: {
        frequency: 'daily' | 'weekly' | 'ei-method';
        doses: Record<string, number>;
      };
    };
  };
}
```

## Хардскейп и декорации

### Грунт и декорации
```typescript
interface Hardscape {
  substrate: {
    layers: Array<{
      type: 'sand' | 'gravel' | 'soil' | 'clay' | 'volcanic' | 'crushed-coral';
      brand?: string;
      product?: string;
      
      grain: {
        size: string;           // "1-2mm", "3-5mm"
        color: string;
        
        properties: {
          inert: boolean;       // Нейтральный к параметрам
          buffering: boolean;   // Буферизирует pH/KH
          nutrients: boolean;   // Содержит питательные вещества
        };
      };
      
      depth: {
        front: number;          // см
        back: number;           // см
        total: number;          // кг
      };
    }>;
  };
  
  decorations: {
    rocks: Array<{
      type: string;             // "Seiryu", "Dragon Stone", "Lava"
      quantity: number;
      totalWeight: number;      // кг
      
      arrangement: string;      // "Iwagumi", "Island", "Mountain"
      
      properties: {
        affectsWater: boolean;
        calcium: boolean;       // Выделяет кальций
        safe: boolean;          // Безопасен для параметров
      };
    }>;
    
    wood: Array<{
      type: string;             // "Mopani", "Spider", "Manzanita"
      pieces: number;
      
      preparation: {
        boiled: boolean;
        soaked: boolean;
        tannins: 'heavy' | 'moderate' | 'light' | 'none';
      };
      
      attached?: {
        plants: string[];       // Прикрепленные растения
        moss: string;
      };
    }>;
    
    artificial: Array<{
      type: string;             // "Корабль", "Замок", "Коряга"
      material: string;         // "Пластик", "Керамика"
      safe: boolean;
    }>;
  };
  
  // Общий стиль
  style: {
    type: 'nature' | 'dutch' | 'iwagumi' | 'jungle' | 'biotope' | 'minimalist' | 'artificial';
    inspiration?: string;       // Источник вдохновения
    theme?: string;            // Тема оформления
  };
}
```

## База знаний

### Структура базы знаний
```typescript
interface KnowledgeBase {
  // Рыбы
  fishDatabase: {
    families: Record<string, FishFamily>;
    species: Record<string, FishSpecies>;
    
    care: {
      guides: Record<string, CareGuide>;
      diseases: Record<string, Disease>;
      breeding: Record<string, BreedingGuide>;
    };
    
    compatibility: {
      matrix: CompatibilityMatrix;
      warnings: string[];
    };
  };
  
  // Растения  
  plantDatabase: {
    families: Record<string, PlantFamily>;
    species: Record<string, PlantSpecies>;
    
    care: {
      guides: Record<string, PlantCareGuide>;
      problems: Record<string, PlantProblem>;
      propagation: Record<string, PropagationGuide>;
    };
  };
  
  // Оборудование
  equipmentDatabase: {
    reviews: Record<string, EquipmentReview>;
    comparisons: Record<string, Comparison>;
    calculators: {
      lighting: LightingCalculator;
      filtration: FiltrationCalculator;
      heating: HeatingCalculator;
      co2: CO2Calculator;
    };
  };
  
  // Параметры воды
  waterChemistry: {
    parameters: Record<string, ParameterInfo>;
    interactions: ChemistryInteractions;
    troubleshooting: Record<string, Solution>;
  };
}
```