import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';

import '../../../shared/services/notification_service.dart';
import '../../aquarium/models/aquarium_model.dart';

class AquariumNotificationService {
  static final Logger _logger = Logger();
  static const String _notificationPrefsKey = 'aquarium_notifications';
  
  // Notification IDs ranges
  static const int _maintenanceBaseId = 1000;
  static const int _feedingBaseId = 2000;
  static const int _parameterBaseId = 3000;
  static const int _healthBaseId = 4000;

  static Future<void> init() async {
    tz.initializeTimeZones();
  }

  // Schedule equipment maintenance reminders
  static Future<void> scheduleMaintenanceReminder({
    required Equipment equipment,
    required String aquariumName,
  }) async {
    if (equipment.nextMaintenanceDate == null) return;

    final prefs = await SharedPreferences.getInstance();
    final isEnabled = prefs.getBool('$_notificationPrefsKey.maintenance') ?? true;
    if (!isEnabled) return;

    final notificationId = _maintenanceBaseId + equipment.id.hashCode % 1000;
    
    // Cancel existing notification
    await NotificationService.cancelNotification(notificationId);

    // Schedule for the day before maintenance
    final reminderDate = equipment.nextMaintenanceDate!.subtract(const Duration(days: 1));
    
    if (reminderDate.isAfter(DateTime.now())) {
      await NotificationService.scheduleNotification(
        id: notificationId,
        title: 'Maintenance Reminder',
        body: '${equipment.name} maintenance is due tomorrow in $aquariumName',
        scheduledDate: reminderDate,
        payload: 'equipment:${equipment.id}',
      );
      
      _logger.i('Scheduled maintenance reminder for ${equipment.name}');
    }
  }

  // Schedule feeding reminders
  static Future<void> scheduleFeedingReminder({
    required String aquariumId,
    required String aquariumName,
    required TimeOfDay feedingTime,
    required List<int> weekdays, // 1-7, where 1 is Monday
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final isEnabled = prefs.getBool('$_notificationPrefsKey.feeding') ?? true;
    if (!isEnabled) return;

    final now = DateTime.now();
    
    for (int i = 0; i < 7; i++) {
      final date = now.add(Duration(days: i));
      
      if (weekdays.contains(date.weekday)) {
        final scheduledDate = DateTime(
          date.year,
          date.month,
          date.day,
          feedingTime.hour,
          feedingTime.minute,
        );
        
        if (scheduledDate.isAfter(now)) {
          final notificationId = _feedingBaseId + aquariumId.hashCode % 1000 + i;
          
          await NotificationService.scheduleNotification(
            id: notificationId,
            title: 'Feeding Time',
            body: 'Time to feed your fish in $aquariumName',
            scheduledDate: scheduledDate,
            payload: 'feeding:$aquariumId',
          );
        }
      }
    }
    
    _logger.i('Scheduled feeding reminders for $aquariumName');
  }

  // Cancel feeding reminders
  static Future<void> cancelFeedingReminders(String aquariumId) async {
    for (int i = 0; i < 7; i++) {
      final notificationId = _feedingBaseId + aquariumId.hashCode % 1000 + i;
      await NotificationService.cancelNotification(notificationId);
    }
    
    _logger.i('Cancelled feeding reminders for aquarium $aquariumId');
  }

  // Schedule water parameter testing reminders
  static Future<void> scheduleParameterTestReminder({
    required String aquariumId,
    required String aquariumName,
    required int intervalDays,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final isEnabled = prefs.getBool('$_notificationPrefsKey.parameters') ?? true;
    if (!isEnabled) return;

    final notificationId = _parameterBaseId + aquariumId.hashCode % 1000;
    
    // Cancel existing notification
    await NotificationService.cancelNotification(notificationId);

    // Get last test date from storage
    final lastTestKey = 'last_parameter_test_$aquariumId';
    final lastTestMillis = prefs.getInt(lastTestKey);
    final lastTestDate = lastTestMillis != null 
        ? DateTime.fromMillisecondsSinceEpoch(lastTestMillis)
        : DateTime.now();
    
    final nextTestDate = lastTestDate.add(Duration(days: intervalDays));
    
    if (nextTestDate.isAfter(DateTime.now())) {
      await NotificationService.scheduleNotification(
        id: notificationId,
        title: 'Water Testing Reminder',
        body: 'Time to test water parameters for $aquariumName',
        scheduledDate: nextTestDate,
        payload: 'parameters:$aquariumId',
      );
      
      _logger.i('Scheduled parameter test reminder for $aquariumName');
    }
  }

  // Update last parameter test date
  static Future<void> updateLastParameterTest(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      'last_parameter_test_$aquariumId',
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  // Send immediate health alert
  static Future<void> sendHealthAlert({
    required String aquariumId,
    required String aquariumName,
    required String alertTitle,
    required String alertMessage,
    required AlertSeverity severity,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final isEnabled = prefs.getBool('$_notificationPrefsKey.health') ?? true;
    if (!isEnabled) return;

    final notificationId = _healthBaseId + aquariumId.hashCode % 1000 + 
                          DateTime.now().millisecondsSinceEpoch % 100;

    String title;
    switch (severity) {
      case AlertSeverity.critical:
        title = '🚨 Critical Alert: $aquariumName';
        break;
      case AlertSeverity.warning:
        title = '⚠️ Warning: $aquariumName';
        break;
      case AlertSeverity.info:
        title = 'ℹ️ Info: $aquariumName';
        break;
    }

    await NotificationService.showLocalNotification(
      title: title,
      body: alertMessage,
      payload: 'health:$aquariumId',
    );
    
    _logger.i('Sent health alert for $aquariumName: $alertMessage');
  }

  // Configure notification preferences
  static Future<void> setNotificationEnabled(String type, bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_notificationPrefsKey.$type', enabled);
    
    _logger.i('Set notification $type enabled: $enabled');
  }

  static Future<bool> isNotificationEnabled(String type) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('$_notificationPrefsKey.$type') ?? true;
  }

  // Get all notification settings
  static Future<Map<String, bool>> getNotificationSettings() async {
    final prefs = await SharedPreferences.getInstance();
    
    return {
      'maintenance': prefs.getBool('$_notificationPrefsKey.maintenance') ?? true,
      'feeding': prefs.getBool('$_notificationPrefsKey.feeding') ?? true,
      'parameters': prefs.getBool('$_notificationPrefsKey.parameters') ?? true,
      'health': prefs.getBool('$_notificationPrefsKey.health') ?? true,
    };
  }

  // Schedule all notifications for an aquarium
  static Future<void> scheduleAquariumNotifications(Aquarium aquarium) async {
    // Schedule maintenance reminders for all equipment
    for (final equipment in aquarium.equipment) {
      if (equipment.isActive) {
        await scheduleMaintenanceReminder(
          equipment: equipment,
          aquariumName: aquarium.name,
        );
      }
    }

    // Schedule parameter test reminder (default every 7 days)
    await scheduleParameterTestReminder(
      aquariumId: aquarium.id,
      aquariumName: aquarium.name,
      intervalDays: 7,
    );
    
    _logger.i('Scheduled all notifications for aquarium ${aquarium.name}');
  }

  // Cancel all notifications for an aquarium
  static Future<void> cancelAquariumNotifications(String aquariumId) async {
    // Cancel feeding reminders
    await cancelFeedingReminders(aquariumId);
    
    // Cancel parameter test reminder
    final parameterNotificationId = _parameterBaseId + aquariumId.hashCode % 1000;
    await NotificationService.cancelNotification(parameterNotificationId);
    
    // Note: Equipment maintenance notifications would need to be cancelled individually
    // as they use equipment IDs
    
    _logger.i('Cancelled notifications for aquarium $aquariumId');
  }
}

enum AlertSeverity {
  critical,
  warning,
  info,
}