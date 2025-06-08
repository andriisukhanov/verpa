# Enhanced Features для Verpa

## 1. Расширенная система уведомлений

### Мультиканальные алерты
```typescript
interface NotificationChannels {
  // Основные каналы
  push: {
    enabled: boolean;
    provider: 'FCM' | 'APNS';
  };
  
  sms: {
    enabled: boolean;
    phone: string;
    criticalOnly: boolean;  // Для Free - только критические
  };
  
  email: {
    enabled: boolean;
    address: string;
    frequency: 'immediate' | 'daily_digest' | 'weekly_summary';
  };
  
  // Мессенджеры
  messengers: {
    telegram: {
      enabled: boolean;
      chatId: string;
      botToken: string;  // Пользователь подключает через BotFather
      commands: boolean;  // Управление через команды бота
    };
    
    whatsapp: {
      enabled: boolean;
      phone: string;
      businessApi: boolean;  // WhatsApp Business API
    };
    
    discord: {
      enabled: boolean;
      webhookUrl: string;
      userId?: string;
      serverId?: string;
    };
    
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      workspace: string;
    };
  };
  
  // Настройки по типам событий
  eventPreferences: {
    critical: ['push', 'sms', 'telegram', 'email'];  // Все каналы
    maintenance: ['push', 'email'];
    reminders: ['push', 'telegram'];
    reports: ['email'];
    social: ['push', 'discord'];  // Phase 2
  };
  
  // Quiet hours для каждого канала
  quietHours: {
    enabled: boolean;
    from: string;  // "22:00"
    to: string;    // "08:00"
    timezone: string;
    exceptCritical: boolean;  // Критические всегда отправлять
  };
}

// Telegram Bot Integration
interface TelegramBotService {
  // Команды бота
  commands: {
    '/start': 'Подключить аккаунт Verpa';
    '/status': 'Статус всех аквариумов';
    '/params <aquarium>': 'Параметры аквариума';
    '/feed': 'Отметить кормление';
    '/water': 'Отметить подмену воды';
    '/alert <on|off>': 'Включить/выключить уведомления';
    '/help': 'Список команд';
  };
  
  // Inline keyboards для быстрых действий
  quickActions: {
    confirmEvent: {
      text: 'Подтвердить выполнение ✅';
      callback: 'confirm_event';
    };
    
    snoozeReminder: {
      text: 'Отложить на час ⏰';
      callback: 'snooze_1h';
    };
    
    viewDetails: {
      text: 'Подробнее 📊';
      callback: 'view_details';
    };
  };
  
  // Rich messages
  messageFormats: {
    critical: '🚨 *КРИТИЧНО*: {message}\n\n_{aquarium}_\n_{timestamp}_';
    reminder: '⏰ *Напоминание*: {title}\n\n📍 {aquarium}\n⏱ {time}';
    report: '📊 *Отчет за {period}*\n\n{statistics}\n\n[Подробнее]({link})';
  };
}
```

## 2. Умные напоминания на основе паттернов

### Smart Reminder System
```typescript
interface SmartReminderService {
  // Анализ паттернов пользователя
  analyzeUserPatterns(userId: string): UserPatterns {
    return {
      // Время активности
      activityHours: {
        morning: { from: '07:00', to: '09:00', probability: 0.8 },
        evening: { from: '18:00', to: '21:00', probability: 0.9 },
      },
      
      // Дни недели
      activeDays: {
        weekdays: { responseRate: 0.85 },
        weekends: { responseRate: 0.95 },
      },
      
      // Типичные задержки
      averageDelay: {
        waterChange: 45,  // минут после напоминания
        feeding: 15,
        maintenance: 120,
      },
      
      // Предпочтительные каналы по времени
      channelPreferences: {
        morning: ['push', 'telegram'],
        workHours: ['email', 'slack'],
        evening: ['push', 'whatsapp'],
      },
    };
  }
  
  // Оптимизация времени напоминаний
  optimizeReminderTime(
    scheduledTime: Date,
    eventType: EventType,
    userPatterns: UserPatterns
  ): OptimizedReminder {
    // ML модель предсказывает лучшее время
    const prediction = this.mlModel.predict({
      eventType,
      scheduledTime,
      userPatterns,
      historicalResponse: this.getHistoricalData(userId),
    });
    
    return {
      originalTime: scheduledTime,
      suggestedTime: prediction.optimalTime,
      confidence: prediction.confidence,
      reason: prediction.reason,
      
      // Адаптивные напоминания
      reminderSchedule: [
        { 
          time: subMinutes(prediction.optimalTime, 30),
          channel: 'push',
          message: 'Скоро время для {event}',
        },
        {
          time: prediction.optimalTime,
          channel: prediction.preferredChannel,
          message: 'Пора выполнить: {event}',
        },
        {
          time: addMinutes(prediction.optimalTime, 60),
          channel: 'telegram',
          message: 'Вы еще не подтвердили: {event}',
          critical: true,
        },
      ],
    };
  }
  
  // Персонализированные сообщения
  generatePersonalizedMessage(
    event: Event,
    user: User,
    context: ReminderContext
  ): string {
    const templates = {
      friendly: [
        'Привет! Не забудь про {event} для {aquarium} 🐠',
        'Твои рыбки ждут! Время для {event} 🐟',
        '{aquarium} напоминает о {event} 💙',
      ],
      
      professional: [
        'Запланировано: {event} для аквариума {aquarium}',
        'Напоминание: {event} в {time}',
        'Требуется выполнить: {event}',
      ],
      
      urgent: [
        'ВАЖНО: {event} просрочено на {delay} минут!',
        'Критично: немедленно выполните {event}',
        'Последнее напоминание: {event} для {aquarium}',
      ],
    };
    
    // Выбор тона на основе истории
    const tone = this.getUserTonePreference(user);
    const template = this.selectTemplate(templates[tone], context);
    
    return this.interpolate(template, {
      event: event.title,
      aquarium: event.aquarium.name,
      time: formatTime(event.scheduledAt, user.timezone),
      delay: context.delayMinutes,
    });
  }
}
```

## 3. Bulk события

### Массовые операции с событиями
```typescript
interface BulkEventService {
  // Создание множественных событий
  createBulkEvents(request: BulkEventRequest): BulkEventResult {
    const { template, targets, schedule } = request;
    
    // Пример: создать подмену воды для всех аквариумов
    const events = targets.aquariums.map(aquarium => ({
      ...template,
      aquariumId: aquarium.id,
      scheduledAt: this.calculateSchedule(schedule, aquarium),
      metadata: {
        bulkOperationId: generateId(),
        customizations: this.applyAquariumSpecifics(template, aquarium),
      },
    }));
    
    return {
      created: events.length,
      events: events.map(e => ({ id: e.id, aquarium: e.aquariumId })),
      schedule: this.generateBulkSchedule(events),
    };
  }
  
  // Шаблоны для bulk операций
  bulkTemplates: {
    weeklyMaintenance: {
      name: 'Еженедельное обслуживание',
      events: [
        { type: 'water_change', percentage: 25, offset: 0 },
        { type: 'glass_clean', offset: 0 },
        { type: 'filter_check', offset: 0 },
        { type: 'plant_trim', offset: 1 },  // День спустя
      ],
    },
    
    vacationMode: {
      name: 'Режим отпуска',
      events: [
        { type: 'auto_feeder_check', frequency: 'daily' },
        { type: 'parameter_monitoring', frequency: 'twice_daily' },
        { type: 'emergency_contact', condition: 'if_critical' },
      ],
    },
  };
  
  // Bulk изменения
  updateBulkEvents(
    filter: EventFilter,
    updates: Partial<Event>
  ): BulkUpdateResult {
    // Пример: перенести все события на час позже
    const affected = this.eventRepository.updateMany(
      filter,
      {
        $set: {
          scheduledAt: { $add: ['$scheduledAt', 3600000] },
          'metadata.bulkUpdated': new Date(),
        },
      }
    );
    
    // Пересчитать напоминания
    this.reminderService.recalculateBulk(affected.eventIds);
    
    return {
      updated: affected.count,
      eventIds: affected.eventIds,
    };
  }
}
```

## 4. Интеграция с календарями

### Calendar Integration Service
```typescript
interface CalendarIntegrationService {
  // Google Calendar
  googleCalendar: {
    // OAuth2 flow
    async authorize(userId: string): Promise<AuthUrl> {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.API_URL}/auth/google/callback`
      );
      
      const scopes = ['https://www.googleapis.com/auth/calendar'];
      
      return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: encodeState({ userId, service: 'calendar' }),
      });
    },
    
    // Синхронизация событий
    async syncEvents(userId: string, aquariumId: string): Promise<SyncResult> {
      const calendar = google.calendar({ version: 'v3', auth });
      
      // Создаем календарь для аквариума
      const aquariumCalendar = await calendar.calendars.insert({
        requestBody: {
          summary: `Verpa - ${aquarium.name}`,
          description: 'Автоматически созданный календарь для аквариума',
          timeZone: user.timezone,
        },
      });
      
      // Синхронизируем события
      const events = await this.eventService.getUpcoming(aquariumId);
      
      for (const event of events) {
        await calendar.events.insert({
          calendarId: aquariumCalendar.data.id,
          requestBody: {
            summary: event.title,
            description: this.formatEventDescription(event),
            start: {
              dateTime: event.scheduledAt.toISOString(),
              timeZone: user.timezone,
            },
            end: {
              dateTime: addHours(event.scheduledAt, 1).toISOString(),
              timeZone: user.timezone,
            },
            reminders: {
              useDefault: false,
              overrides: event.reminders.map(r => ({
                method: 'popup',
                minutes: r.minutesBefore,
              })),
            },
            // Метаданные для обратной синхронизации
            extendedProperties: {
              private: {
                verpaEventId: event.id,
                verpaAquariumId: aquariumId,
              },
            },
          },
        });
      }
      
      return { synced: events.length, calendarId: aquariumCalendar.data.id };
    },
  };
  
  // iCal экспорт
  iCalExport: {
    generateFeed(userId: string, aquariumIds: string[]): string {
      const cal = ical({ 
        name: 'Verpa Aquarium Events',
        timezone: user.timezone,
      });
      
      const events = this.eventService.getEventsForExport(aquariumIds);
      
      events.forEach(event => {
        cal.createEvent({
          start: event.scheduledAt,
          end: addHours(event.scheduledAt, 1),
          summary: event.title,
          description: event.description,
          location: event.aquarium.name,
          url: `${process.env.APP_URL}/events/${event.id}`,
          alarms: event.reminders.map(r => ({
            type: 'display',
            trigger: r.minutesBefore * 60,  // секунды
          })),
        });
      });
      
      return cal.toString();
    },
    
    // Подписка на календарь
    subscriptionUrl(userId: string, token: string): string {
      // Уникальный URL для подписки
      return `${process.env.API_URL}/calendar/feed/${userId}/${token}.ics`;
    },
  };
  
  // Двусторонняя синхронизация
  twoWaySync: {
    // Webhook для Google Calendar
    async handleCalendarWebhook(notification: CalendarNotification): Promise<void> {
      if (notification.eventType === 'updated') {
        const googleEvent = await this.getGoogleEvent(notification.eventId);
        const verpaEventId = googleEvent.extendedProperties?.private?.verpaEventId;
        
        if (verpaEventId) {
          // Обновляем событие в Verpa
          await this.eventService.updateFromCalendar(verpaEventId, {
            scheduledAt: new Date(googleEvent.start.dateTime),
            title: googleEvent.summary,
          });
        }
      }
    },
  };
}
```

## 5. OAuth провайдеры

### Расширенная OAuth интеграция
```typescript
interface OAuthProviders {
  // Существующие
  google: GoogleOAuth;
  apple: AppleOAuth;
  
  // Новые провайдеры
  facebook: {
    clientId: string;
    clientSecret: string;
    callbackURL: string;
    scope: ['email', 'public_profile'];
    
    profileMapping: (profile: FacebookProfile) => ({
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      avatar: profile.photos[0].value,
      locale: profile._json.locale,
    });
  };
  
  github: {
    clientId: string;
    clientSecret: string;
    callbackURL: string;
    scope: ['user:email'];
    
    // Специальные features для GitHub users
    developerFeatures: {
      apiRateLimit: 10000,  // Увеличенный лимит
      webhooksAccess: true,
      customIntegrations: true,
    };
  };
  
  microsoft: {
    clientId: string;
    clientSecret: string;
    callbackURL: string;
    tenant: 'common',
    scope: ['user.read', 'calendars.readwrite'],  // + календарь
  };
  
  // Универсальный обработчик
  async handleOAuthCallback(
    provider: string,
    profile: any,
    tokens: OAuthTokens
  ): Promise<User> {
    // Проверяем существующего пользователя
    let user = await this.userRepository.findByOAuthId(provider, profile.id);
    
    if (!user) {
      // Проверяем по email
      user = await this.userRepository.findByEmail(profile.email);
      
      if (user) {
        // Связываем аккаунты
        user.linkOAuthProvider(provider, profile.id, tokens);
      } else {
        // Создаем нового
        user = await this.createUserFromOAuth(provider, profile, tokens);
      }
    }
    
    // Обновляем токены
    await this.updateOAuthTokens(user.id, provider, tokens);
    
    // Специальные features по провайдеру
    if (provider === 'github') {
      user.enableDeveloperFeatures();
    }
    
    return user;
  }
}
```

## 6. Шаблоны аквариумов

### Aquarium Templates
```typescript
interface AquariumTemplateService {
  // Предустановленные шаблоны
  templates: {
    // Пресноводные
    freshwater: {
      nanoShrimp: {
        name: 'Nano креветочник',
        volume: 30,
        description: 'Идеально для начинающих',
        parameters: {
          temp: { min: 22, max: 26, target: 24 },
          ph: { min: 6.5, max: 7.5, target: 7.0 },
          gh: { min: 4, max: 8, target: 6 },
          kh: { min: 0, max: 4, target: 2 },
        },
        equipment: [
          { type: 'filter', model: 'Sponge filter', required: true },
          { type: 'heater', watts: 25, required: true },
          { type: 'light', watts: 10, hours: 8 },
        ],
        suggestedLivestock: [
          { species: 'Neocaridina davidi', quantity: 10 },
          { species: 'Planorbella duryi', quantity: 5 },
        ],
        suggestedPlants: [
          'Java moss', 'Anubias nana petite', 'Cryptocoryne parva'
        ],
        maintenanceSchedule: {
          waterChange: { percentage: 20, frequency: 'weekly' },
          feeding: { frequency: 'daily', amount: 'small' },
        },
      },
      
      plantedCommunity: {
        name: 'Травник с рыбками',
        volume: 100,
        // ... детали
      },
      
      africanCichlids: {
        name: 'Африканские цихлиды',
        volume: 200,
        // ... детали
      },
    },
    
    // Морские
    marine: {
      beginnerReef: {
        name: 'Риф для начинающих',
        volume: 150,
        // ... детали
      },
    },
  };
  
  // Применение шаблона
  async applyTemplate(
    aquariumId: string,
    templateId: string,
    options: ApplyTemplateOptions
  ): Promise<void> {
    const template = this.templates[templateId];
    const aquarium = await this.aquariumService.get(aquariumId);
    
    // Обновляем параметры
    if (options.applyParameters) {
      aquarium.targetParameters = template.parameters;
    }
    
    // Создаем события обслуживания
    if (options.createMaintenanceSchedule) {
      await this.eventService.createFromTemplate(
        aquariumId,
        template.maintenanceSchedule
      );
    }
    
    // Добавляем рекомендации
    if (options.addSuggestions) {
      aquarium.suggestions = {
        livestock: template.suggestedLivestock,
        plants: template.suggestedPlants,
        equipment: template.equipment,
      };
    }
    
    await this.aquariumService.save(aquarium);
  }
  
  // Пользовательские шаблоны
  async saveUserTemplate(
    userId: string,
    aquariumId: string,
    name: string
  ): Promise<UserTemplate> {
    const aquarium = await this.aquariumService.getFullDetails(aquariumId);
    
    return this.templateRepository.create({
      userId,
      name,
      basedOn: aquariumId,
      data: {
        parameters: aquarium.parameters,
        equipment: aquarium.equipment,
        livestock: aquarium.livestock,
        plants: aquarium.plants,
        maintenanceSchedule: await this.eventService.extractSchedule(aquariumId),
      },
      isPublic: false,  // Можно сделать публичным позже
      tags: this.generateTags(aquarium),
    });
  }
}
```

## 7. QR коды и шаринг

### QR Code Sharing
```typescript
interface QRCodeService {
  // Генерация QR кода
  async generateAquariumQR(
    aquariumId: string,
    options: QROptions
  ): Promise<QRCodeData> {
    const shareToken = await this.generateShareToken(aquariumId, options);
    
    const qrData = {
      version: 1,
      type: 'aquarium_share',
      data: {
        url: `${process.env.APP_URL}/shared/${shareToken}`,
        aquariumId,
        expires: options.expiresAt,
      },
    };
    
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1B5E20',
        light: '#FFFFFF',
      },
    });
    
    // Сохраняем в S3
    const qrUrl = await this.mediaService.uploadQRCode(qrCode, aquariumId);
    
    return {
      qrCodeUrl: qrUrl,
      shareUrl: qrData.data.url,
      token: shareToken,
      expiresAt: options.expiresAt,
    };
  }
  
  // Опции шаринга
  shareOptions: {
    readOnly: {
      parameters: true,
      events: true,
      photos: true,
      modifications: false,
    },
    
    collaborate: {
      parameters: true,
      events: true,
      photos: true,
      modifications: true,
      requireApproval: true,
    },
    
    temporary: {
      duration: '24h',
      maxViews: 10,
      watermark: true,
    },
  };
  
  // Обработка сканирования
  async handleQRScan(
    token: string,
    scannedByUserId: string
  ): Promise<SharedAquariumAccess> {
    const shareData = await this.validateShareToken(token);
    
    if (shareData.expired) {
      throw new ShareLinkExpiredException();
    }
    
    // Логируем доступ
    await this.logShareAccess(shareData, scannedByUserId);
    
    // Создаем временный или постоянный доступ
    if (shareData.options.collaborate) {
      return this.createCollaboratorRequest(
        shareData.aquariumId,
        scannedByUserId
      );
    } else {
      return this.createReadOnlyAccess(
        shareData.aquariumId,
        scannedByUserId,
        shareData.options
      );
    }
  }
}
```

## 8. Scheduler Service

### Централизованный планировщик
```typescript
interface SchedulerService {
  // Регистрация задач
  jobs: {
    // Уведомления
    'notifications.send-reminders': {
      schedule: '* * * * *',  // Каждую минуту
      handler: async () => {
        const dueReminders = await this.reminderService.getDue();
        await this.notificationService.sendBatch(dueReminders);
      },
    },
    
    // Очистка
    'cleanup.old-events': {
      schedule: '0 2 * * *',  // 2 AM daily
      handler: async () => {
        const cutoffDate = subDays(new Date(), 365);
        await this.eventService.archiveOldEvents(cutoffDate);
      },
    },
    
    // Отчеты
    'reports.weekly-summary': {
      schedule: '0 9 * * 1',  // Понедельник 9 AM
      handler: async () => {
        const users = await this.userService.getActiveWithWeeklyReports();
        for (const user of users) {
          await this.reportService.generateWeeklySummary(user.id);
        }
      },
    },
    
    // Биллинг
    'billing.process-subscriptions': {
      schedule: '0 0 * * *',  // Полночь
      handler: async () => {
        await this.billingService.processRecurringCharges();
        await this.billingService.handleExpiredTrials();
      },
    },
    
    // Аналитика
    'analytics.calculate-metrics': {
      schedule: '0 * * * *',  // Каждый час
      handler: async () => {
        await this.analyticsService.calculateHourlyMetrics();
        await this.analyticsService.updateDashboards();
      },
    },
  };
  
  // Dead letter queue
  deadLetterQueue: {
    async processFailedJobs(): Promise<void> {
      const failedJobs = await this.getFailedJobs();
      
      for (const job of failedJobs) {
        if (job.attempts < job.maxRetries) {
          await this.retry(job, {
            delay: Math.pow(2, job.attempts) * 1000,  // Exponential backoff
          });
        } else {
          await this.alertOps(job);
          await this.moveToDeadLetter(job);
        }
      }
    },
  };
  
  // Мониторинг
  monitoring: {
    async healthCheck(): Promise<SchedulerHealth> {
      return {
        activeJobs: await this.getActiveJobsCount(),
        queueSize: await this.getQueueSize(),
        failureRate: await this.getFailureRate(),
        nextJobs: await this.getUpcomingJobs(10),
      };
    },
  };
}
```