# Масштабирование микросервисов Verpa

## Принципы независимости и масштабирования

### 1. Полная изоляция сервисов

```yaml
# k8s/private/user-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: verpa-private
spec:
  replicas: 3  # Минимум 3 инстанса
  selector:
    matchLabels:
      app: user-service
  template:
    spec:
      containers:
      - name: user-service
        image: verpa/user-service:latest
        env:
        - name: MONGO_URI
          value: "mongodb://user-mongo-0.user-mongo:27017,user-mongo-1.user-mongo:27017,user-mongo-2.user-mongo:27017/users?replicaSet=rs0"
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 2. Автоскейлинг

```yaml
# k8s/private/user-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: kafka_consumer_lag
      target:
        type: AverageValue
        averageValue: "1000"
```

### 3. База данных на сервис

```typescript
// Каждый сервис имеет свою MongoDB базу
export const DATABASE_CONFIG = {
  'user-service': {
    uri: 'mongodb://user-mongo:27017/users',
    options: {
      replicaSet: 'rs0',
      readPreference: 'secondaryPreferred',
      w: 'majority',
      retryWrites: true,
    }
  },
  'aquarium-service': {
    uri: 'mongodb://aquarium-mongo:27017/aquariums',
    // Полностью изолированная база
  },
  'event-service': {
    uri: 'mongodb://event-mongo:27017/events',
    // Своя база для событий
  }
};

// Шардирование для больших коллекций
export const SHARDING_CONFIG = {
  events: {
    shardKey: { aquariumId: 1, createdAt: -1 },
    numInitialChunks: 64
  },
  users: {
    shardKey: { _id: 'hashed' },
    numInitialChunks: 32
  }
};
```

### 4. Kafka для асинхронной коммуникации

```typescript
// shared/kafka-schemas/index.ts
export const EventSchemas = {
  // User events
  UserCreated: z.object({
    userId: z.string(),
    email: z.string().email(),
    subscription: z.enum(['free', 'premium']),
    createdAt: z.date(),
  }),
  
  // Aquarium events  
  AquariumCreated: z.object({
    aquariumId: z.string(),
    userId: z.string(),
    name: z.string(),
    volume: z.number(),
    type: z.enum(['freshwater', 'marine', 'brackish']),
  }),
  
  // Event scheduling
  EventScheduled: z.object({
    eventId: z.string(),
    aquariumId: z.string(),
    type: z.string(),
    scheduledAt: z.date(),
    recurrence: z.object({
      pattern: z.string(),
      interval: z.number(),
    }).optional(),
  }),
};

// Kafka partitioning strategy
export const PARTITION_STRATEGY = {
  // По userId для равномерного распределения
  userEvents: (message: any) => {
    return hashCode(message.userId) % 12; // 12 партиций
  },
  
  // По aquariumId для группировки событий аквариума
  aquariumEvents: (message: any) => {
    return hashCode(message.aquariumId) % 24; // 24 партиции
  },
};
```

### 5. Service Mesh для наблюдаемости

```yaml
# Istio configuration
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
  - user-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: user-service
        subset: v2
      weight: 20  # Canary deployment
  - route:
    - destination:
        host: user-service
        subset: v1
      weight: 80
  
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    loadBalancer:
      simple: LEAST_REQUEST
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### 6. Resilience patterns

```typescript
// Circuit breaker для межсервисных вызовов
export class ResilientKafkaClient {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    cooldownPeriod: 30000, // 30 секунд
    requestTimeout: 5000,   // 5 секунд
  });
  
  async publish(topic: string, message: any): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      // Retry logic
      for (let i = 0; i < 3; i++) {
        try {
          await this.kafka.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
            acks: -1, // Wait for all replicas
            timeout: 3000,
          });
          return;
        } catch (error) {
          if (i === 2) throw error;
          await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        }
      }
    });
  }
}

// Bulkhead pattern для изоляции ресурсов
export class BulkheadExecutor {
  private pools = new Map<string, WorkerPool>();
  
  async execute<T>(
    poolName: string,
    task: () => Promise<T>
  ): Promise<T> {
    const pool = this.pools.get(poolName) || 
      this.createPool(poolName, { size: 10, queue: 50 });
    
    return pool.execute(task);
  }
}
```

### 7. Мониторинг и метрики

```typescript
// Prometheus metrics
export const metrics = {
  // Счетчики
  requestsTotal: new Counter({
    name: 'verpa_requests_total',
    help: 'Total number of requests',
    labelNames: ['service', 'method', 'status'],
  }),
  
  // Гистограммы
  requestDuration: new Histogram({
    name: 'verpa_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['service', 'method'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  
  // Gauges
  activeConnections: new Gauge({
    name: 'verpa_active_connections',
    help: 'Number of active connections',
    labelNames: ['service', 'type'],
  }),
  
  // Kafka metrics
  kafkaLag: new Gauge({
    name: 'verpa_kafka_consumer_lag',
    help: 'Kafka consumer lag',
    labelNames: ['topic', 'partition', 'consumer_group'],
  }),
};
```

## База знаний - источники данных

### 1. Рыбы и беспозвоночные

```typescript
export const KNOWLEDGE_BASE_SOURCES = {
  fish: {
    // Открытые API
    fishbase: {
      url: 'https://fishbase.org/api',
      description: 'Крупнейшая база данных о рыбах',
      license: 'CC BY-NC',
      features: [
        'Научные названия',
        'Параметры воды',
        'Размеры',
        'Ареал обитания',
      ],
    },
    
    seriouslyFish: {
      url: 'https://www.seriouslyfish.com',
      description: 'Детальные care guides',
      scraping: true, // Требует парсинга
      features: [
        'Условия содержания',
        'Кормление',
        'Разведение',
        'Совместимость',
      ],
    },
    
    // Datasets
    gbif: {
      url: 'https://www.gbif.org/dataset',
      description: 'Global Biodiversity Information Facility',
      format: 'Darwin Core',
      license: 'CC0',
    },
    
    inaturalist: {
      url: 'https://www.inaturalist.org/observations',
      api: 'https://www.inaturalist.org/pages/api+reference',
      features: [
        'Фото рыб',
        'Географическое распределение',
        'Наблюдения в природе',
      ],
    },
  },
  
  plants: {
    // Растения
    flowgrow: {
      url: 'https://www.flowgrow.de/db/aquaticplants',
      description: 'База водных растений',
      languages: ['de', 'en'],
    },
    
    tropica: {
      url: 'https://tropica.com/en/plants/',
      description: 'Каталог Tropica',
      features: [
        'Требования к свету',
        'CO2 требования',
        'Скорость роста',
        'Сложность',
      ],
    },
    
    plantedTank: {
      url: 'https://www.plantedtank.net/plant-database/',
      description: 'Community database',
      crowdsourced: true,
    },
  },
  
  parameters: {
    // Химия воды
    apifishcare: {
      url: 'https://www.apifishcare.com',
      datasets: [
        'Таблицы совместимости параметров',
        'Целевые значения для разных биотопов',
      ],
    },
    
    // Научные публикации
    pubmed: {
      api: 'https://pubmed.ncbi.nlm.nih.gov/api',
      queries: [
        'aquarium water chemistry',
        'ornamental fish diseases',
        'aquarium nitrogen cycle',
      ],
    },
  },
};

// Парсер для импорта данных
export class KnowledgeBaseImporter {
  async importFishbaseData(): Promise<void> {
    // CSV экспорт от FishBase
    const csvUrl = 'https://www.fishbase.org/Download/SpeciesList.csv';
    const data = await this.downloadCsv(csvUrl);
    
    for (const row of data) {
      await this.knowledgeService.upsertSpecies({
        scientificName: row.Species,
        commonNames: this.parseCommonNames(row.CommonNames),
        family: row.Family,
        waterType: row.Fresh === '1' ? 'freshwater' : 'marine',
        parameters: {
          tempMin: parseFloat(row.TempMin),
          tempMax: parseFloat(row.TempMax),
          phMin: parseFloat(row.pHMin),
          phMax: parseFloat(row.pHMax),
        },
        maxSize: parseFloat(row.Length),
        distribution: row.Distribution,
      });
    }
  }
  
  async scrapeSeriously Fish(species: string): Promise<CareGuide> {
    // Respectful scraping with delays
    const url = `https://www.seriouslyfish.com/species/${species}`;
    await this.rateLimiter.wait('seriouslyfish', 2000); // 2 sec delay
    
    const html = await this.fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    return {
      maintenance: this.extractSection($, 'Maintenance'),
      diet: this.extractSection($, 'Diet'),
      behaviour: this.extractSection($, 'Behaviour and Compatibility'),
      reproduction: this.extractSection($, 'Sexual Dimorphism'),
      notes: this.extractSection($, 'Notes'),
    };
  }
}
```