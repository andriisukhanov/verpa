# Backend Architecture Diagram

```mermaid
graph TB
    %% External Layer
    subgraph "External Layer"
        Mobile[📱 Mobile App<br/>Flutter]
        Web[🌐 Web Admin<br/>React]
        IoT[🔌 IoT Devices<br/>Future]
    end

    %% API Gateway
    subgraph "API Gateway Layer"
        Gateway[API Gateway<br/>Kong/Traefik<br/>- Rate Limiting<br/>- DDoS Protection]
    end

    %% Public BFF Layer
    subgraph "Public Services (BFF)"
        MobileBFF[Mobile BFF<br/>- JWT Validation<br/>- Request Aggregation<br/>- Response Optimization]
        WebBFF[Web BFF<br/>- Admin Auth<br/>- Complex Queries<br/>- Reports]
    end

    %% Message Broker
    Kafka[Apache Kafka<br/>- Event Bus<br/>- 12 partitions/topic<br/>- 3 replicas]

    %% Private Microservices
    subgraph "Private Microservices"
        UserService[User Service<br/>- Authentication<br/>- Profile Management<br/>- Session Control]
        
        AquariumService[Aquarium Service<br/>- CRUD Operations<br/>- Parameters<br/>- Equipment]
        
        EventService[Event Service<br/>- Timeline<br/>- Scheduling<br/>- Reminders]
        
        NotificationService[Notification Service<br/>- Email (SES)<br/>- SMS (SNS)<br/>- Push (SNS)]
        
        MediaService[Media Service<br/>- S3 Upload<br/>- Image Processing<br/>- CDN Management]
        
        BillingService[Billing Service<br/>- Stripe/PayPal<br/>- Subscriptions<br/>- Invoices]
        
        AnalyticsService[Analytics Service<br/>- Metrics<br/>- Reports<br/>- Insights]
        
        KnowledgeService[Knowledge Service<br/>- Fish Database<br/>- Plant Database<br/>- Care Guides]
    end

    %% Data Layer
    subgraph "Data Layer"
        subgraph "MongoDB Cluster"
            UserDB[(User DB)]
            AquariumDB[(Aquarium DB)]
            EventDB[(Event DB)]
            BillingDB[(Billing DB)]
            KnowledgeDB[(Knowledge DB)]
        end
        
        subgraph "Cache Layer"
            Redis[Redis Cluster<br/>- Session Store<br/>- Cache<br/>- Rate Limiting]
        end
        
        subgraph "Object Storage"
            S3[AWS S3 / MinIO<br/>- User Avatars<br/>- Aquarium Photos<br/>- Event Media]
        end
    end

    %% External Services
    subgraph "External Services"
        AWS[AWS Services<br/>- SES (Email)<br/>- SNS (SMS/Push)<br/>- CloudFront (CDN)]
        Payment[Payment Providers<br/>- Stripe<br/>- PayPal<br/>- Apple/Google IAP]
        AI[AI Services<br/>- Gemma3<br/>- Image Recognition<br/>- Future]
    end

    %% Monitoring
    subgraph "Monitoring & Observability"
        Prometheus[Prometheus<br/>Metrics]
        Grafana[Grafana<br/>Dashboards]
        ELK[ELK Stack<br/>Logs]
        Jaeger[Jaeger<br/>Tracing]
        Sentry[Sentry<br/>Errors]
    end

    %% Connections - Client to Gateway
    Mobile --> Gateway
    Web --> Gateway
    IoT -.-> Gateway

    %% Gateway to BFF
    Gateway --> MobileBFF
    Gateway --> WebBFF

    %% BFF to Services (gRPC)
    MobileBFF -.->|gRPC| UserService
    MobileBFF -.->|gRPC| AquariumService
    MobileBFF -.->|gRPC| EventService
    MobileBFF -.->|gRPC| MediaService
    
    WebBFF -.->|gRPC| UserService
    WebBFF -.->|gRPC| BillingService
    WebBFF -.->|gRPC| AnalyticsService

    %% Kafka Events
    UserService -->|Publish| Kafka
    AquariumService -->|Publish| Kafka
    EventService -->|Publish| Kafka
    BillingService -->|Publish| Kafka
    
    Kafka -->|Subscribe| NotificationService
    Kafka -->|Subscribe| AnalyticsService
    Kafka -->|Subscribe| EventService
    Kafka -->|Subscribe| BillingService

    %% Service to Database
    UserService --> UserDB
    UserService --> Redis
    
    AquariumService --> AquariumDB
    AquariumService --> Redis
    
    EventService --> EventDB
    EventService --> Redis
    
    BillingService --> BillingDB
    
    KnowledgeService --> KnowledgeDB
    KnowledgeService --> Redis
    
    MediaService --> S3
    
    %% External Service Connections
    NotificationService --> AWS
    BillingService --> Payment
    MediaService --> AWS
    
    %% Monitoring Connections
    UserService -.-> Prometheus
    AquariumService -.-> Prometheus
    EventService -.-> Prometheus
    NotificationService -.-> Prometheus
    
    Prometheus --> Grafana
    
    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef public fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef private fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef monitoring fill:#f5f5f5,stroke:#424242,stroke-width:2px
    
    class Mobile,Web,IoT client
    class Gateway,MobileBFF,WebBFF public
    class UserService,AquariumService,EventService,NotificationService,MediaService,BillingService,AnalyticsService,KnowledgeService private
    class UserDB,AquariumDB,EventDB,BillingDB,KnowledgeDB,Redis,S3 data
    class AWS,Payment,AI external
    class Prometheus,Grafana,ELK,Jaeger,Sentry monitoring
```

## Архитектурные принципы

### 1. Разделение на слои
- **External Layer**: Клиентские приложения
- **API Gateway**: Единая точка входа, защита, rate limiting
- **BFF Layer**: Backend for Frontend - оптимизация для клиентов
- **Private Services**: Изолированные микросервисы с бизнес-логикой
- **Data Layer**: Персистентность и кэширование

### 2. Коммуникация
- **Синхронная**: gRPC между BFF и микросервисами
- **Асинхронная**: Kafka для событий между микросервисами
- **WebSocket**: Real-time уведомления для клиентов

### 3. Безопасность
- **JWT проверка**: Только на уровне BFF
- **mTLS**: Между внутренними сервисами
- **Service Mesh**: Istio для контроля трафика

### 4. Масштабирование
- **Horizontal Pod Autoscaling**: Для каждого сервиса
- **Kafka partitioning**: Для распределения нагрузки
- **MongoDB sharding**: Для больших коллекций
- **Redis cluster**: Для отказоустойчивости

### 5. Данные
- **Отдельная БД**: Для каждого микросервиса
- **Event Sourcing**: Для событий аквариума
- **CQRS**: Разделение чтения и записи
- **Cache-aside**: Паттерн кэширования

## Поток данных

### Создание аквариума
```
1. Mobile App → API Gateway → Mobile BFF
2. Mobile BFF → JWT validation
3. Mobile BFF → gRPC → User Service (check limits)
4. Mobile BFF → gRPC → Aquarium Service (create)
5. Aquarium Service → MongoDB (save)
6. Aquarium Service → Kafka (publish event)
7. Kafka → Analytics Service (update stats)
8. Kafka → Notification Service (send welcome)
9. Mobile BFF ← Response aggregation
10. Mobile App ← Optimized response
```

### Real-time уведомления
```
1. Event Service → Scheduled event due
2. Event Service → Kafka (publish reminder)
3. Kafka → Notification Service
4. Notification Service → Check user preferences
5. Notification Service → AWS SNS (push notification)
6. Notification Service → WebSocket (in-app notification)
7. Mobile App ← Push + WebSocket notification
```

### Управление сессиями (Free план)
```
1. User login from new device
2. Mobile BFF → User Service (create session)
3. User Service → Check subscription (free = 1 device)
4. User Service → Terminate old session
5. User Service → Kafka (session terminated event)
6. Kafka → Notification Service
7. Old device ← Push notification (kicked out)
8. Old device ← WebSocket (force logout)
```