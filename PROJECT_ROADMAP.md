# PROJECT ROADMAP - VERPA

## 🎯 Цель проекта
Создать систему мониторинга аквариумов с мобильным приложением (Flutter) и микросервисным backend (NestJS).

---

## 📅 PHASE 1: MVP (10-12 недель)

### Неделя 1-2: Инфраструктура и базовая архитектура
- [ ] **Setup монорепозитория**
  - [ ] Инициализация проекта с Nx/Lerna
  - [ ] Настройка package.json для всех сервисов
  - [ ] Конфигурация TypeScript, ESLint, Prettier
  
- [ ] **Common библиотека**
  - [ ] Создать `@verpa/common` пакет
  - [ ] Интерфейсы и DTOs
  - [ ] Константы и enums
  - [ ] Утилиты (timezone, validation)
  - [ ] Proto файлы для gRPC

- [ ] **Docker и инфраструктура**
  - [ ] Docker Compose для локальной разработки
  - [ ] MongoDB replica set
  - [ ] Redis cluster
  - [ ] Kafka setup
  - [ ] MinIO для S3

### Неделя 3-4: Core микросервисы

- [ ] **User Service**
  - [ ] DDD структура (entities, repositories, services)
  - [ ] Регистрация через email/password
  - [ ] JWT авторизация
  - [ ] Email верификация flow
  - [ ] Password reset flow
  - [ ] Управление сессиями (1 device для Free)
  - [ ] Health checks
  - [ ] Unit и integration тесты

- [ ] **API Gateway + Mobile BFF**
  - [ ] Kong/Traefik setup
  - [ ] JWT validation middleware
  - [ ] Rate limiting
  - [ ] Request aggregation
  - [ ] Error handling
  - [ ] Logging

### Неделя 5-6: Aquarium и Event сервисы

- [ ] **Aquarium Service**
  - [ ] CRUD аквариумов
  - [ ] Проверка лимитов подписки
  - [ ] Параметры воды
  - [ ] Фото аквариума
  - [ ] gRPC endpoints
  - [ ] Kafka events publishing

- [ ] **Event Service**
  - [ ] Timeline implementation
  - [ ] Quick events (температура, фото)
  - [ ] Scheduled events
  - [ ] Event confirmation logic
  - [ ] Reminder через час
  - [ ] Backdate events
  - [ ] CQRS pattern

### Неделя 7-8: Notification и Media сервисы

- [ ] **Notification Service**
  - [ ] AWS SES integration (email)
  - [ ] AWS SNS integration (push)
  - [ ] Email templates
  - [ ] Push для iOS/Android
  - [ ] Kafka consumer
  - [ ] User preferences

- [ ] **Media Service**
  - [ ] S3/MinIO integration
  - [ ] Presigned URLs
  - [ ] Image processing
  - [ ] Thumbnail generation
  - [ ] File validation

### Неделя 9-10: Flutter приложение (основа)

- [ ] **Проект и архитектура**
  - [ ] Flutter project setup
  - [ ] Folder structure (clean architecture)
  - [ ] State management (Riverpod/Bloc)
  - [ ] Dio для HTTP
  - [ ] Secure storage

- [ ] **Auth screens**
  - [ ] Login screen
  - [ ] Registration screen
  - [ ] Email verification screen
  - [ ] Password reset screen
  - [ ] Session kicked dialog

- [ ] **Main screens**
  - [ ] Aquarium list
  - [ ] Create aquarium flow
  - [ ] Aquarium dashboard
  - [ ] Event timeline
  - [ ] Quick event add
  - [ ] Settings screen

### Неделя 11-12: Интеграция и тестирование

- [ ] **CI/CD**
  - [ ] GitHub Actions pipelines
  - [ ] Docker build & push
  - [ ] Automated tests
  - [ ] Code coverage

- [ ] **Тестирование**
  - [ ] E2E тесты основных flows
  - [ ] Load testing
  - [ ] Security testing
  - [ ] Bug fixes

- [ ] **Deployment**
  - [ ] Kubernetes configs
  - [ ] Environment setup (staging)
  - [ ] Monitoring (Prometheus, Grafana)
  - [ ] Backup strategy

---

## 📅 PHASE 2: Billing & Polish (4-6 недель)

### Неделя 13-14: Billing Service

- [ ] **Payment integration**
  - [ ] Stripe setup
  - [ ] PayPal integration
  - [ ] Subscription management
  - [ ] Webhook handling
  - [ ] Invoice generation

- [ ] **In-app purchases**
  - [ ] iOS IAP
  - [ ] Google Play Billing
  - [ ] Receipt validation

### Неделя 15-16: Расширенные функции

- [ ] **Analytics Service**
  - [ ] Metrics collection
  - [ ] User dashboards
  - [ ] Reports generation

- [ ] **Enhanced notifications**
  - [ ] Telegram bot
  - [ ] WhatsApp integration
  - [ ] Calendar sync (Google, iCal)

### Неделя 17-18: Production подготовка

- [ ] **Admin panel**
  - [ ] React + TypeScript setup
  - [ ] User management
  - [ ] Subscription management
  - [ ] Metrics dashboard

- [ ] **Production deployment**
  - [ ] AWS/GCP setup
  - [ ] SSL certificates
  - [ ] CDN configuration
  - [ ] Production monitoring

---

## 📅 PHASE 3: Social & AI (6-8 недель)

### Social Features
- [ ] Посты от аквариумов
- [ ] Комментарии и лайки
- [ ] Direct messages
- [ ] Подписки на аквариумы

### AI Features
- [ ] Подсчет рыб по фото
- [ ] AI помощник (Gemma3)
- [ ] Предсказание проблем
- [ ] Умные рекомендации

---

## 📅 PHASE 4: IoT & Advanced (8+ недель)

### IoT Integration
- [ ] MQTT broker
- [ ] Device management
- [ ] Real-time sensors
- [ ] Automation rules

### Knowledge Base
- [ ] Import from FishBase
- [ ] Plant database
- [ ] Care guides
- [ ] Community content

---

## 🚀 Ключевые метрики успеха MVP

1. **Технические**:
   - [ ] 99.9% uptime
   - [ ] < 1s response time
   - [ ] < 3s app launch
   - [ ] Push delivery > 95%

2. **Бизнес**:
   - [ ] User registration flow works
   - [ ] Can create aquarium
   - [ ] Can add/confirm events
   - [ ] Notifications delivered
   - [ ] Free/Premium limits enforced

3. **Качество**:
   - [ ] Test coverage > 80%
   - [ ] No critical bugs
   - [ ] All flows tested
   - [ ] Security audit passed

---

## 📋 Приоритеты для MVP

### Must Have (P0)
- ✅ User registration/login
- ✅ Create 1 aquarium (Free)
- ✅ Add events (quick + scheduled)
- ✅ Event confirmations
- ✅ Push notifications
- ✅ Basic timeline view

### Should Have (P1)
- ✅ Email verification
- ✅ Password reset
- ✅ Photo upload
- ✅ Multiple messengers
- ✅ Calendar integration

### Nice to Have (P2)
- ⏳ Social features
- ⏳ AI features
- ⏳ IoT support
- ⏳ Advanced analytics

---

## 🛠 Технический стек

### Backend
- NestJS + TypeScript
- MongoDB (данные)
- Redis (кэш, сессии)
- Kafka (события)
- gRPC (межсервисная связь)
- AWS (SES, SNS, S3)

### Mobile
- Flutter
- Riverpod/Bloc
- Dio
- Secure Storage

### Infrastructure
- Docker + K8s
- GitHub Actions
- Prometheus + Grafana
- Nginx/Traefik

---

## 👥 Команда и роли

### Разработка
- **Backend Lead**: Микросервисы, API
- **Mobile Lead**: Flutter приложение
- **DevOps**: Infrastructure, CI/CD

### Порядок работы
1. Daily standup
2. Weekly planning
3. Sprint review (2 недели)
4. Retrospective

---

## 📝 Документация

### Обязательная
- [ ] API documentation (OpenAPI)
- [ ] Database schemas
- [ ] Deployment guide
- [ ] User manual

### Дополнительная
- [ ] Architecture decisions
- [ ] Troubleshooting guide
- [ ] Performance tuning
- [ ] Security guidelines

---

## ⚠️ Риски и митигация

1. **Сложность микросервисов**
   - Митигация: Начать с 3-4 core сервисов
   
2. **Flutter производительность**
   - Митигация: Профилирование с первого дня
   
3. **Масштабирование**
   - Митигация: Load testing на раннем этапе
   
4. **Безопасность**
   - Митигация: Security audit перед production

---

## 🎯 Definition of Done

### Для каждой задачи:
- [ ] Код написан и работает
- [ ] Unit тесты (coverage > 80%)
- [ ] Code review пройден
- [ ] Документация обновлена
- [ ] No critical bugs
- [ ] Performance acceptable

### Для каждого спринта:
- [ ] All tasks completed
- [ ] Integration tests pass
- [ ] Demo ready
- [ ] Deployed to staging

---

## 📊 Прогресс

### Phase 1 (MVP): 0% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
### Phase 2 (Billing): 0% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
### Phase 3 (Social/AI): 0% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
### Phase 4 (IoT): 0% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜

---

**Последнее обновление**: 2025-01-06