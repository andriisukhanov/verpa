# Auth Service Implementation Details

## Email Verification Service

```typescript
// private/user-service/src/domain/services/email-verification.service.ts
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: VerificationTokenRepository,
    private readonly eventBus: EventBus,
    private readonly emailService: EmailService,
  ) {}

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 24);

    // Сохраняем токен
    await this.tokenRepository.create({
      token,
      userId,
      email,
      type: 'email_verification',
      expiresAt,
      used: false,
    });

    // Отправляем email через SES
    await this.emailService.send({
      to: email,
      template: 'email-verification',
      data: {
        verificationUrl: `${process.env.APP_URL}/verify?token=${token}`,
        expiresIn: '24 часа',
      },
    });

    // Публикуем событие
    await this.eventBus.publish({
      topic: 'user.verification.sent',
      data: { userId, email, timestamp: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<User> {
    // Проверяем токен
    const verificationToken = await this.tokenRepository.findByToken(token);
    
    if (!verificationToken) {
      throw new InvalidTokenException('Недействительный токен');
    }

    if (verificationToken.used) {
      throw new TokenAlreadyUsedException('Токен уже использован');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException('Токен истек');
    }

    // Обновляем пользователя
    const user = await this.userRepository.findById(verificationToken.userId);
    user.verifyEmail();
    await this.userRepository.save(user);

    // Помечаем токен как использованный
    verificationToken.markAsUsed();
    await this.tokenRepository.save(verificationToken);

    // Публикуем событие
    await this.eventBus.publish({
      topic: 'user.email.verified',
      data: { 
        userId: user.id, 
        email: user.email,
        timestamp: new Date(),
      },
    });

    return user;
  }

  async resendVerification(email: string): Promise<void> {
    // Rate limiting проверка
    const recentAttempts = await this.tokenRepository.countRecentAttempts(email, 60);
    if (recentAttempts > 0) {
      throw new TooManyAttemptsException('Подождите минуту перед повторной отправкой');
    }

    // Дневной лимит
    const dailyAttempts = await this.tokenRepository.countDailyAttempts(email);
    if (dailyAttempts >= 10) {
      throw new DailyLimitExceededException('Превышен дневной лимит отправок');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Не раскрываем существование email
      return;
    }

    if (user.isEmailVerified()) {
      throw new EmailAlreadyVerifiedException('Email уже подтвержден');
    }

    await this.sendVerificationEmail(user.id, user.email);
  }
}
```

## Password Reset Service

```typescript
// private/user-service/src/domain/services/password-reset.service.ts
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: ResetTokenRepository,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly eventBus: EventBus,
    private readonly ipService: IpGeolocationService,
  ) {}

  async requestPasswordReset(
    email: string, 
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Всегда возвращаем успех для безопасности
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Логируем попытку, но не раскрываем
      await this.logResetAttempt(email, ipAddress, false);
      return;
    }

    // Проверяем rate limit по IP
    const recentAttempts = await this.tokenRepository.countRecentAttemptsByIp(ipAddress, 300);
    if (recentAttempts >= 3) {
      await this.logSuspiciousActivity(email, ipAddress, 'too_many_reset_attempts');
      return;
    }

    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 1);

    await this.tokenRepository.create({
      token,
      userId: user.id,
      email: user.email,
      type: 'password_reset',
      expiresAt,
      used: false,
      ipAddress,
      userAgent,
    });

    // Получаем информацию о местоположении
    const location = await this.ipService.getLocation(ipAddress);

    // Отправляем email
    await this.emailService.send({
      to: email,
      template: 'password-reset',
      data: {
        resetUrl: `${process.env.APP_URL}/reset-password?token=${token}`,
        expiresIn: '1 час',
        ipAddress,
        location: location.city ? `${location.city}, ${location.country}` : 'Неизвестно',
        browserInfo: this.parseBrowserInfo(userAgent),
      },
    });

    // Публикуем событие
    await this.eventBus.publish({
      topic: 'user.password.reset.requested',
      data: { 
        userId: user.id,
        ipAddress,
        timestamp: new Date(),
      },
    });
  }

  async validateResetToken(token: string): Promise<boolean> {
    const resetToken = await this.tokenRepository.findByToken(token);
    
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.tokenRepository.findByToken(token);
    
    if (!resetToken) {
      throw new InvalidTokenException('Недействительный токен');
    }

    if (resetToken.used) {
      throw new TokenAlreadyUsedException('Токен уже использован');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new TokenExpiredException('Токен истек');
    }

    // Валидация пароля
    this.validatePassword(newPassword);

    // Обновляем пароль
    const user = await this.userRepository.findById(resetToken.userId);
    await user.changePassword(newPassword);
    await this.userRepository.save(user);

    // Отзываем все сессии
    await this.sessionService.revokeAllSessions(user.id);

    // Помечаем токен как использованный
    resetToken.markAsUsed();
    await this.tokenRepository.save(resetToken);

    // Отправляем уведомление о смене пароля
    await this.emailService.send({
      to: user.email,
      template: 'password-changed',
      data: {
        timestamp: new Date(),
        ipAddress: resetToken.ipAddress,
      },
    });

    // Публикуем событие
    await this.eventBus.publish({
      topic: 'user.password.changed',
      data: { 
        userId: user.id,
        method: 'reset',
        timestamp: new Date(),
      },
    });
  }

  private validatePassword(password: string): void {
    const requirements = {
      minLength: 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
    };

    if (password.length < requirements.minLength) {
      throw new WeakPasswordException('Пароль должен быть минимум 8 символов');
    }

    if (!requirements.hasUpperCase) {
      throw new WeakPasswordException('Пароль должен содержать заглавные буквы');
    }

    if (!requirements.hasLowerCase) {
      throw new WeakPasswordException('Пароль должен содержать строчные буквы');
    }

    if (!requirements.hasNumbers) {
      throw new WeakPasswordException('Пароль должен содержать цифры');
    }

    // Проверка на распространенные пароли
    if (this.isCommonPassword(password)) {
      throw new WeakPasswordException('Этот пароль слишком распространенный');
    }
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '12345678', 'qwerty', '123456789',
      'password123', 'admin', 'letmein', 'welcome',
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
}
```

## Email Templates (AWS SES)

```html
<!-- email-templates/email-verification.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Подтвердите ваш email - Verpa</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background: #4F46E5; 
      color: white; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 20px 0;
    }
    .footer { color: #6B7280; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Добро пожаловать в Verpa! 🐠</h1>
    
    <p>Спасибо за регистрацию! Пожалуйста, подтвердите ваш email адрес, чтобы начать использовать Verpa.</p>
    
    <a href="{{verificationUrl}}" class="button">Подтвердить email</a>
    
    <p>Или скопируйте эту ссылку в браузер:</p>
    <p style="word-break: break-all; color: #6B7280;">{{verificationUrl}}</p>
    
    <p>Ссылка действительна в течение {{expiresIn}}.</p>
    
    <div class="footer">
      <p>Если вы не регистрировались в Verpa, просто проигнорируйте это письмо.</p>
      <p>С уважением,<br>Команда Verpa</p>
    </div>
  </div>
</body>
</html>

<!-- email-templates/password-reset.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Восстановление пароля - Verpa</title>
  <style>
    /* Те же стили */
    .warning { 
      background: #FEF3C7; 
      border: 1px solid #F59E0B; 
      padding: 12px; 
      border-radius: 8px; 
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Восстановление пароля</h1>
    
    <p>Мы получили запрос на восстановление пароля для вашего аккаунта.</p>
    
    <div class="warning">
      <strong>Информация о безопасности:</strong><br>
      Этот запрос был сделан с IP адреса: {{ipAddress}}<br>
      Местоположение: {{location}}<br>
      Браузер: {{browserInfo}}
    </div>
    
    <p>Если это были вы, нажмите кнопку ниже для создания нового пароля:</p>
    
    <a href="{{resetUrl}}" class="button">Восстановить пароль</a>
    
    <p>Ссылка действительна в течение {{expiresIn}}.</p>
    
    <p><strong>Если это были не вы:</strong> немедленно смените пароль в настройках аккаунта и включите двухфакторную аутентификацию.</p>
    
    <div class="footer">
      <p>С уважением,<br>Команда Verpa</p>
    </div>
  </div>
</body>
</html>
```

## Mobile App Integration

```dart
// Flutter - Email Verification Screen
class EmailVerificationScreen extends StatefulWidget {
  final String email;
  
  @override
  _EmailVerificationScreenState createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _canResend = false;
  int _cooldownSeconds = 60;
  Timer? _timer;
  
  @override
  void initState() {
    super.initState();
    _startCooldown();
  }
  
  void _startCooldown() {
    setState(() {
      _canResend = false;
      _cooldownSeconds = 60;
    });
    
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      setState(() {
        _cooldownSeconds--;
        if (_cooldownSeconds <= 0) {
          _canResend = true;
          timer.cancel();
        }
      });
    });
  }
  
  Future<void> _resendEmail() async {
    try {
      await AuthService.resendVerificationEmail(widget.email);
      _startCooldown();
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Email отправлен повторно')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ошибка: ${e.message}')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.email, size: 80, color: Theme.of(context).primaryColor),
              SizedBox(height: 24),
              Text(
                'Подтвердите ваш email',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              SizedBox(height: 16),
              Text(
                'Мы отправили письмо на ${widget.email}',
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 32),
              if (_canResend)
                ElevatedButton(
                  onPressed: _resendEmail,
                  child: Text('Отправить повторно'),
                )
              else
                Text(
                  'Отправить повторно через $_cooldownSeconds сек',
                  style: TextStyle(color: Colors.grey),
                ),
              SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                child: Text('Вернуться к входу'),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
```