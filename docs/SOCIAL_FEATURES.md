# Социальные функции (Phase 2 - после MVP)

## Концепция: Социальная сеть аквариумов

### Основная идея:
- Посты публикуются от имени **аквариума**, а не человека
- Каждый аквариум имеет свой профиль и "личность"
- Владельцы ведут блог от лица своего аквариума

## Структура социальных функций

### 1. Профиль аквариума
```typescript
interface AquariumProfile {
  id: string;
  name: string;
  avatar: string;                    // Главное фото аквариума
  coverPhoto: string;                // Обложка профиля
  bio: string;                       // Описание аквариума
  
  stats: {
    age: number;                     // Дней с момента запуска
    volume: number;                  // Объем
    inhabitants: number;             // Количество обитателей
    plants: number;                  // Количество растений
  };
  
  social: {
    followers: number;               // Подписчики
    following: number;               // Подписки на другие аквариумы
    posts: number;                   // Количество постов
    isPublic: boolean;              // Публичный/приватный профиль
  };
  
  achievements: Achievement[];       // Достижения (100 дней, первая рыба, etc)
  tags: string[];                   // Теги (#planted #iwagumi #reef)
}
```

### 2. Стена постов (Feed)
```typescript
interface Post {
  id: string;
  aquariumId: string;               // От какого аквариума
  aquariumName: string;
  aquariumAvatar: string;
  
  content: {
    text: string;                   // Текст поста
    images: string[];               // До 10 фото
    video?: string;                 // Опционально видео
    
    // Специальные типы постов
    type?: 'regular' | 'milestone' | 'question' | 'help' | 'showcase';
    
    // Прикрепленные данные
    attachments?: {
      parameters?: WaterParameters; // Показать параметры воды
      inhabitants?: LivestockInfo;  // Новые обитатели
      event?: Event;               // Связанное событие
    };
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    location?: string;             // Город/страна (опционально)
  };
  
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;                 // Сохранить в закладки
  };
  
  // Для алгоритма ленты
  visibility: 'public' | 'followers' | 'private';
  language: string;               // Язык поста для фильтрации
}
```

### 3. Комментарии
```typescript
interface Comment {
  id: string;
  postId: string;
  authorAquariumId: string;        // Комментарий от аквариума
  
  content: {
    text: string;
    image?: string;                // Можно прикрепить фото
  };
  
  parentCommentId?: string;        // Для ответов на комментарии
  
  likes: number;
  createdAt: Date;
  
  // Модерация
  status: 'visible' | 'hidden' | 'deleted';
}
```

### 4. Личные сообщения (DM)
```typescript
interface Chat {
  id: string;
  participants: {
    aquarium1: AquariumInfo;
    aquarium2: AquariumInfo;
  };
  
  lastMessage: {
    text: string;
    timestamp: Date;
    readBy: string[];             // ID аквариумов, которые прочитали
  };
  
  settings: {
    muted: boolean;
    archived: boolean;
  };
}

interface Message {
  id: string;
  chatId: string;
  senderAquariumId: string;
  
  content: {
    text?: string;
    images?: string[];
    
    // Специальные типы сообщений
    type?: 'text' | 'image' | 'parameters_share' | 'advice_request';
    
    // Можно поделиться параметрами
    sharedData?: {
      parameters?: WaterParameters;
      equipment?: Equipment;
    };
  };
  
  timestamp: Date;
  readAt?: Date;
  
  status: 'sent' | 'delivered' | 'read';
}
```

## Функциональные возможности

### Лента новостей:
1. **Алгоритм ленты**:
   - Посты от подписок
   - Рекомендации по интересам
   - Локальные аквариумы (по геолокации)
   - Популярные посты

2. **Фильтры ленты**:
   - По типу аквариума (пресный/морской)
   - По тегам (#plants #shrimp)
   - По языку
   - По типу контента (фото/видео/вопросы)

### Взаимодействие:
- **Лайки** - от имени аквариума
- **Комментарии** - обсуждение и советы
- **Репосты** - поделиться в своем профиле
- **Сохранение** - закладки на потом

### Уведомления:
```typescript
interface SocialNotification {
  type: 
    | 'new_follower'
    | 'post_liked'
    | 'comment_received'
    | 'mentioned'
    | 'dm_received';
    
  fromAquarium: {
    id: string;
    name: string;
    avatar: string;
  };
  
  relatedEntity?: {
    postId?: string;
    commentId?: string;
    messageId?: string;
  };
}
```

## Модерация и безопасность

### Инструменты модерации:
- Жалобы на контент
- Автоматическая фильтрация спама
- Блокировка аквариумов
- Скрытие комментариев

### Приватность:
- Приватные/публичные профили
- Одобрение подписчиков
- Скрытие параметров воды
- Анонимные вопросы

## Геймификация

### Достижения аквариума:
- 🏆 "Первый месяц" - 30 дней без проблем
- 🌱 "Зеленый рай" - 10+ видов растений
- 🐟 "Большая семья" - 20+ обитателей
- 💎 "Идеальные параметры" - месяц стабильных параметров
- 📸 "Фотограф" - 50+ постов с фото
- ❤️ "Популярный" - 100+ подписчиков

### Рейтинги:
- Топ аквариумов недели/месяца
- Лучшие по категориям
- Самые полезные советчики

## Монетизация социальных функций (Premium)

### Premium возможности:
- Неограниченные сообщения
- Продвижение постов
- Эксклюзивные рамки для аватара
- Статистика просмотров
- Приоритет в ленте рекомендаций
- HD видео в постах