import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppLocalizations {
  final Locale locale;
  late Map<String, String> _localizedStrings;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  Future<bool> load() async {
    String jsonString = await rootBundle.loadString(
      'assets/languages/${locale.languageCode}.json',
    );
    
    Map<String, dynamic> jsonMap = json.decode(jsonString);
    
    _localizedStrings = jsonMap.map((key, value) {
      return MapEntry(key, value.toString());
    });

    return true;
  }

  String translate(String key) {
    return _localizedStrings[key] ?? key;
  }

  // Helper method for easy access
  String get(String key) => translate(key);

  // Common translations
  String get appName => translate('app_name');
  String get welcome => translate('welcome');
  String get login => translate('login');
  String get register => translate('register');
  String get email => translate('email');
  String get password => translate('password');
  String get confirmPassword => translate('confirm_password');
  String get forgotPassword => translate('forgot_password');
  String get dashboard => translate('dashboard');
  String get aquariums => translate('aquariums');
  String get settings => translate('settings');
  String get profile => translate('profile');
  String get logout => translate('logout');
  String get save => translate('save');
  String get cancel => translate('cancel');
  String get delete => translate('delete');
  String get edit => translate('edit');
  String get add => translate('add');
  String get search => translate('search');
  String get filter => translate('filter');
  String get noData => translate('no_data');
  String get loading => translate('loading');
  String get error => translate('error');
  String get success => translate('success');
  String get warning => translate('warning');
  String get info => translate('info');
  
  // Aquarium specific
  String get aquarium => translate('aquarium');
  String get addAquarium => translate('add_aquarium');
  String get editAquarium => translate('edit_aquarium');
  String get aquariumName => translate('aquarium_name');
  String get aquariumType => translate('aquarium_type');
  String get volume => translate('volume');
  String get liters => translate('liters');
  String get gallons => translate('gallons');
  String get temperature => translate('temperature');
  String get celsius => translate('celsius');
  String get fahrenheit => translate('fahrenheit');
  String get ph => translate('ph');
  String get ammonia => translate('ammonia');
  String get nitrite => translate('nitrite');
  String get nitrate => translate('nitrate');
  String get salinity => translate('salinity');
  String get alkalinity => translate('alkalinity');
  String get phosphate => translate('phosphate');
  String get calcium => translate('calcium');
  String get magnesium => translate('magnesium');
  
  // Equipment
  String get equipment => translate('equipment');
  String get addEquipment => translate('add_equipment');
  String get equipmentName => translate('equipment_name');
  String get equipmentType => translate('equipment_type');
  String get brand => translate('brand');
  String get model => translate('model');
  String get purchaseDate => translate('purchase_date');
  String get warrantyExpiry => translate('warranty_expiry');
  
  // Inhabitants
  String get inhabitants => translate('inhabitants');
  String get addInhabitant => translate('add_inhabitant');
  String get species => translate('species');
  String get commonName => translate('common_name');
  String get scientificName => translate('scientific_name');
  String get quantity => translate('quantity');
  String get dateAdded => translate('date_added');
  String get notes => translate('notes');
  
  // Water Changes
  String get waterChange => translate('water_change');
  String get waterChanges => translate('water_changes');
  String get recordWaterChange => translate('record_water_change');
  String get waterChangeHistory => translate('water_change_history');
  String get amountChanged => translate('amount_changed');
  String get percentage => translate('percentage');
  
  // Maintenance
  String get maintenance => translate('maintenance');
  String get maintenanceTasks => translate('maintenance_tasks');
  String get addTask => translate('add_task');
  String get taskName => translate('task_name');
  String get frequency => translate('frequency');
  String get lastCompleted => translate('last_completed');
  String get nextDue => translate('next_due');
  String get markComplete => translate('mark_complete');
  
  // Feeding
  String get feeding => translate('feeding');
  String get feedingSchedule => translate('feeding_schedule');
  String get addFeeding => translate('add_feeding');
  String get foodType => translate('food_type');
  String get amount => translate('amount');
  String get time => translate('time');
  
  // Disease Detection
  String get diseaseDetection => translate('disease_detection');
  String get scanFish => translate('scan_fish');
  String get symptoms => translate('symptoms');
  String get diagnosis => translate('diagnosis');
  String get treatment => translate('treatment');
  String get severity => translate('severity');
  String get confidence => translate('confidence');
  
  // Expenses
  String get expenses => translate('expenses');
  String get addExpense => translate('add_expense');
  String get expenseCategory => translate('expense_category');
  String get amount => translate('amount');
  String get date => translate('date');
  String get description => translate('description');
  String get budget => translate('budget');
  String get totalSpent => translate('total_spent');
  String get remaining => translate('remaining');
  
  // Backup
  String get backup => translate('backup');
  String get restore => translate('restore');
  String get backupRestore => translate('backup_restore');
  String get createBackup => translate('create_backup');
  String get restoreBackup => translate('restore_backup');
  String get lastBackup => translate('last_backup');
  String get backupSize => translate('backup_size');
  
  // Social
  String get community => translate('community');
  String get shareAquarium => translate('share_aquarium');
  String get sharedAquariums => translate('shared_aquariums');
  String get followers => translate('followers');
  String get following => translate('following');
  String get posts => translate('posts');
  String get likes => translate('likes');
  String get comments => translate('comments');
  
  // Notifications
  String get notifications => translate('notifications');
  String get notificationSettings => translate('notification_settings');
  String get enableNotifications => translate('enable_notifications');
  String get parameterAlerts => translate('parameter_alerts');
  String get maintenanceReminders => translate('maintenance_reminders');
  String get feedingReminders => translate('feeding_reminders');
  
  // Validation messages
  String get fieldRequired => translate('field_required');
  String get invalidEmail => translate('invalid_email');
  String get passwordTooShort => translate('password_too_short');
  String get passwordsDoNotMatch => translate('passwords_do_not_match');
  String get invalidValue => translate('invalid_value');
  
  // Error messages
  String get networkError => translate('network_error');
  String get serverError => translate('server_error');
  String get unauthorizedError => translate('unauthorized_error');
  String get notFoundError => translate('not_found_error');
  String get unknownError => translate('unknown_error');
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar']
        .contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    AppLocalizations localizations = AppLocalizations(locale);
    await localizations.load();
    return localizations;
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

// Supported locales
class AppLocales {
  static const List<Locale> supportedLocales = [
    Locale('en', 'US'), // English
    Locale('es', 'ES'), // Spanish
    Locale('fr', 'FR'), // French
    Locale('de', 'DE'), // German
    Locale('pt', 'BR'), // Portuguese (Brazil)
    Locale('ru', 'RU'), // Russian
    Locale('zh', 'CN'), // Chinese (Simplified)
    Locale('ja', 'JP'), // Japanese
    Locale('ko', 'KR'), // Korean
    Locale('ar', 'SA'), // Arabic
  ];

  static String getLanguageName(String languageCode) {
    switch (languageCode) {
      case 'en':
        return 'English';
      case 'es':
        return 'Español';
      case 'fr':
        return 'Français';
      case 'de':
        return 'Deutsch';
      case 'pt':
        return 'Português';
      case 'ru':
        return 'Русский';
      case 'zh':
        return '中文';
      case 'ja':
        return '日本語';
      case 'ko':
        return '한국어';
      case 'ar':
        return 'العربية';
      default:
        return 'English';
    }
  }

  static String getFlag(String languageCode) {
    switch (languageCode) {
      case 'en':
        return '🇺🇸';
      case 'es':
        return '🇪🇸';
      case 'fr':
        return '🇫🇷';
      case 'de':
        return '🇩🇪';
      case 'pt':
        return '🇧🇷';
      case 'ru':
        return '🇷🇺';
      case 'zh':
        return '🇨🇳';
      case 'ja':
        return '🇯🇵';
      case 'ko':
        return '🇰🇷';
      case 'ar':
        return '🇸🇦';
      default:
        return '🌐';
    }
  }
}