# MVP Requirements - Verpa

## Главные требования для MVP

### 1. Core функциональность

#### Аутентификация
- ✅ Вход через Google/Apple ID
- ✅ Email + пароль
- ✅ JWT токены
- ✅ Refresh tokens

#### Управление аквариумами
- ✅ Создание аквариума (1 для Free, unlimited для Premium)
- ✅ Базовая информация (фото, название, объем, тип воды)
- ✅ Просмотр списка аквариумов
- ✅ Детальная страница аквариума

#### События и Timeline
- ✅ Timeline с будущими и прошедшими событиями
- ✅ Быстрое добавление событий (температура, фото, кормление)
- ✅ Периодические события (подмены воды, чистка)
- ✅ ОБЯЗАТЕЛЬНОЕ подтверждение запланированных событий
- ✅ Напоминания и переспрашивание через час
- ✅ Ввод событий задним числом

#### Подписки
- ✅ Free план (1 аквариум, 5 событий/день, 7 дней истории)
- ✅ Premium план (unlimited всё)
- ✅ Интеграция Stripe + PayPal
- ✅ In-app purchases для iOS/Android

### 2. Технические требования

#### Backend
- ✅ NestJS микросервисы
- ✅ MongoDB для данных
- ✅ Redis для кэша
- ✅ S3 для медиафайлов
- ✅ Rate limiting (разные лимиты для Free/Premium)
- ✅ JWT авторизация
- ✅ DDD архитектура

#### Mobile App
- ✅ Flutter (iOS + Android + Web для тестов)
- ✅ Offline режим для базовых функций
- ✅ Push уведомления (AWS SNS)
- ✅ Работа с камерой для фото

#### Уведомления
- ✅ Email через AWS SES
- ✅ SMS через AWS SNS (только критические)
- ✅ Push через AWS SNS
- ✅ In-app уведомления

### 3. Обязательные фичи MVP

#### Для пользователя
1. **Регистрация и вход**
2. **Создание первого аквариума с фото**
3. **Timeline событий с прокруткой**
4. **Добавление быстрых событий** (температура, фото)
5. **Планирование подмены воды**
6. **Получение напоминаний**
7. **Подтверждение выполнения событий**
8. **Просмотр истории за 7 дней (Free) или всю (Premium)**

#### Для системы
1. **Правильная работа с timezone**
2. **Хранение всего в UTC**
3. **Автоматические напоминания**
4. **Проверка лимитов подписки**
5. **Безопасное хранение медиа в S3**

### 4. Что НЕ входит в MVP

❌ Социальные функции (Phase 2)
❌ AI функции (Phase 3)
❌ IoT интеграция (Phase 4)
❌ Детальная база знаний рыб/растений
❌ Сложная аналитика
❌ Экспорт данных
❌ Командные функции

### 5. Критерии успеха MVP

1. **Пользователь может**:
   - Зарегистрироваться и войти
   - Создать аквариум с фото
   - Добавлять события (быстрые и запланированные)
   - Получать напоминания
   - Подтверждать выполнение
   - Видеть историю событий

2. **Система должна**:
   - Быть стабильной 99.9% времени
   - Отправлять уведомления вовремя
   - Правильно работать с timezone
   - Защищать данные пользователей
   - Обрабатывать платежи безопасно

3. **Производительность**:
   - Загрузка Timeline < 1 сек
   - Добавление события < 500мс
   - Push уведомления в течение 1 минуты
   - Загрузка фото < 3 сек

### 6. Приоритеты разработки

1. **Неделя 1-2**: Backend структура
   - User Service с авторизацией
   - Aquarium Service базовый CRUD
   - Event Service с Timeline

2. **Неделя 3-4**: Mobile основа
   - Flutter структура
   - Экраны авторизации
   - Главный экран со списком
   - Создание аквариума

3. **Неделя 5-6**: События
   - Timeline UI
   - Добавление событий
   - Система напоминаний
   - Подтверждения

4. **Неделя 7-8**: Подписки и платежи
   - Stripe интеграция
   - Проверка лимитов
   - Premium функции

5. **Неделя 9-10**: Полировка
   - Тестирование
   - Исправление багов
   - Оптимизация
   - Подготовка к релизу