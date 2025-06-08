import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';
import 'dart:convert';

import '../models/feeding_schedule.dart';
import '../../notifications/services/aquarium_notification_service.dart';

class FeedingScheduleService {
  static final Logger _logger = Logger();
  static const String _storageKey = 'feeding_schedules';

  // Get all feeding schedules for an aquarium
  static Future<List<FeedingSchedule>> getSchedules(String aquariumId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final schedulesJson = prefs.getString(_storageKey);
      
      if (schedulesJson == null) return [];
      
      final List<dynamic> schedulesList = json.decode(schedulesJson);
      return schedulesList
          .map((json) => FeedingSchedule.fromJson(json))
          .where((schedule) => schedule.aquariumId == aquariumId)
          .toList();
    } catch (e) {
      _logger.e('Failed to get feeding schedules: $e');
      return [];
    }
  }

  // Get all active feeding schedules
  static Future<List<FeedingSchedule>> getAllActiveSchedules() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final schedulesJson = prefs.getString(_storageKey);
      
      if (schedulesJson == null) return [];
      
      final List<dynamic> schedulesList = json.decode(schedulesJson);
      return schedulesList
          .map((json) => FeedingSchedule.fromJson(json))
          .where((schedule) => schedule.isActive)
          .toList();
    } catch (e) {
      _logger.e('Failed to get active feeding schedules: $e');
      return [];
    }
  }

  // Save a feeding schedule
  static Future<void> saveSchedule(
    FeedingSchedule schedule,
    String aquariumName,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final schedulesJson = prefs.getString(_storageKey);
      
      List<dynamic> schedulesList = [];
      if (schedulesJson != null) {
        schedulesList = json.decode(schedulesJson);
      }
      
      // Remove existing schedule with same ID if updating
      schedulesList.removeWhere((s) => s['id'] == schedule.id);
      
      // Add new/updated schedule
      schedulesList.add(schedule.toJson());
      
      // Save to storage
      await prefs.setString(_storageKey, json.encode(schedulesList));
      
      // Schedule notifications if active
      if (schedule.isActive) {
        await AquariumNotificationService.scheduleFeedingReminder(
          aquariumId: schedule.aquariumId,
          aquariumName: aquariumName,
          feedingTime: schedule.time,
          weekdays: schedule.weekdays,
        );
      } else {
        // Cancel notifications if inactive
        await AquariumNotificationService.cancelFeedingReminders(schedule.aquariumId);
      }
      
      _logger.i('Saved feeding schedule: ${schedule.name}');
    } catch (e) {
      _logger.e('Failed to save feeding schedule: $e');
      throw Exception('Failed to save feeding schedule');
    }
  }

  // Delete a feeding schedule
  static Future<void> deleteSchedule(String scheduleId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final schedulesJson = prefs.getString(_storageKey);
      
      if (schedulesJson == null) return;
      
      List<dynamic> schedulesList = json.decode(schedulesJson);
      final schedule = schedulesList
          .map((json) => FeedingSchedule.fromJson(json))
          .firstWhere((s) => s.id == scheduleId);
      
      // Cancel notifications
      await AquariumNotificationService.cancelFeedingReminders(schedule.aquariumId);
      
      // Remove from storage
      schedulesList.removeWhere((s) => s['id'] == scheduleId);
      await prefs.setString(_storageKey, json.encode(schedulesList));
      
      _logger.i('Deleted feeding schedule: $scheduleId');
    } catch (e) {
      _logger.e('Failed to delete feeding schedule: $e');
      throw Exception('Failed to delete feeding schedule');
    }
  }

  // Mark feeding as completed
  static Future<void> markFed(String scheduleId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final schedulesJson = prefs.getString(_storageKey);
      
      if (schedulesJson == null) return;
      
      List<dynamic> schedulesList = json.decode(schedulesJson);
      final index = schedulesList.indexWhere((s) => s['id'] == scheduleId);
      
      if (index != -1) {
        schedulesList[index]['lastFed'] = DateTime.now().toIso8601String();
        await prefs.setString(_storageKey, json.encode(schedulesList));
        
        _logger.i('Marked feeding as completed: $scheduleId');
      }
    } catch (e) {
      _logger.e('Failed to mark feeding as completed: $e');
      throw Exception('Failed to mark feeding as completed');
    }
  }

  // Get today's feeding schedules for an aquarium
  static Future<List<FeedingSchedule>> getTodaySchedules(String aquariumId) async {
    final schedules = await getSchedules(aquariumId);
    return schedules.where((schedule) => 
      schedule.isActive && schedule.shouldFeedToday
    ).toList();
  }

  // Check if any feeding is due now
  static Future<List<FeedingSchedule>> getDueFeedings() async {
    final schedules = await getAllActiveSchedules();
    final now = DateTime.now();
    final currentTime = TimeOfDay.now();
    
    return schedules.where((schedule) {
      if (!schedule.shouldFeedToday) return false;
      
      // Check if it's within 30 minutes of feeding time
      final scheduledMinutes = schedule.time.hour * 60 + schedule.time.minute;
      final currentMinutes = currentTime.hour * 60 + currentTime.minute;
      final difference = (scheduledMinutes - currentMinutes).abs();
      
      return difference <= 30 && !schedule.wasRecentlyFed;
    }).toList();
  }
}