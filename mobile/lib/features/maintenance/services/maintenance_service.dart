import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';
import 'dart:convert';

import '../models/maintenance_task.dart';
import '../../notifications/services/aquarium_notification_service.dart';
import '../../../shared/services/notification_service.dart';

class MaintenanceService {
  static final Logger _logger = Logger();
  static const String _storageKey = 'maintenance_tasks';
  
  // Get all tasks for an aquarium
  static Future<List<MaintenanceTask>> getTasks(String aquariumId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = prefs.getString(_storageKey);
      
      if (tasksJson == null) return [];
      
      final List<dynamic> tasksList = json.decode(tasksJson);
      return tasksList
          .map((json) => MaintenanceTask.fromJson(json))
          .where((task) => task.aquariumId == aquariumId)
          .toList()
        ..sort((a, b) {
          // Sort by completion status, then priority, then due date
          if (a.isCompleted != b.isCompleted) {
            return a.isCompleted ? 1 : -1;
          }
          if (a.priority != b.priority) {
            return b.priority.index.compareTo(a.priority.index);
          }
          if (a.dueDate != null && b.dueDate != null) {
            return a.dueDate!.compareTo(b.dueDate!);
          }
          return 0;
        });
    } catch (e) {
      _logger.e('Failed to get maintenance tasks: $e');
      return [];
    }
  }
  
  // Get upcoming tasks
  static Future<List<MaintenanceTask>> getUpcomingTasks(String aquariumId, {int days = 7}) async {
    final tasks = await getTasks(aquariumId);
    final cutoffDate = DateTime.now().add(Duration(days: days));
    
    return tasks.where((task) {
      if (task.isCompleted || task.dueDate == null) return false;
      return task.dueDate!.isBefore(cutoffDate);
    }).toList();
  }
  
  // Get overdue tasks
  static Future<List<MaintenanceTask>> getOverdueTasks(String aquariumId) async {
    final tasks = await getTasks(aquariumId);
    
    return tasks.where((task) => task.isOverdue).toList();
  }
  
  // Save a task
  static Future<void> saveTask(MaintenanceTask task, String aquariumName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = prefs.getString(_storageKey);
      
      List<dynamic> tasksList = [];
      if (tasksJson != null) {
        tasksList = json.decode(tasksJson);
      }
      
      // Remove existing task with same ID if updating
      tasksList.removeWhere((t) => t['id'] == task.id);
      
      // Add new/updated task
      tasksList.add(task.toJson());
      
      // Save to storage
      await prefs.setString(_storageKey, json.encode(tasksList));
      
      // Schedule notification if task has due date and is not completed
      if (task.dueDate != null && !task.isCompleted) {
        await _scheduleTaskNotification(task, aquariumName);
      }
      
      _logger.i('Saved maintenance task: ${task.title}');
    } catch (e) {
      _logger.e('Failed to save maintenance task: $e');
      throw Exception('Failed to save maintenance task');
    }
  }
  
  // Delete a task
  static Future<void> deleteTask(String taskId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = prefs.getString(_storageKey);
      
      if (tasksJson == null) return;
      
      List<dynamic> tasksList = json.decode(tasksJson);
      tasksList.removeWhere((t) => t['id'] == taskId);
      
      await prefs.setString(_storageKey, json.encode(tasksList));
      
      // Cancel notification
      await _cancelTaskNotification(taskId);
      
      _logger.i('Deleted maintenance task: $taskId');
    } catch (e) {
      _logger.e('Failed to delete maintenance task: $e');
      throw Exception('Failed to delete maintenance task');
    }
  }
  
  // Complete a task
  static Future<void> completeTask(
    String taskId,
    String aquariumId,
    String aquariumName,
    String completedBy,
  ) async {
    try {
      final tasks = await getTasks(aquariumId);
      final task = tasks.firstWhere((t) => t.id == taskId);
      
      final completedTask = task.copyWith(
        isCompleted: true,
        completedDate: DateTime.now(),
        completedBy: completedBy,
        updatedAt: DateTime.now(),
      );
      
      await saveTask(completedTask, aquariumName);
      
      // Cancel notification
      await _cancelTaskNotification(taskId);
      
      // Create next recurrence if applicable
      if (task.recurrence != null) {
        final nextTask = task.createNextRecurrence();
        await saveTask(nextTask, aquariumName);
      }
      
      _logger.i('Completed maintenance task: ${task.title}');
    } catch (e) {
      _logger.e('Failed to complete maintenance task: $e');
      throw Exception('Failed to complete maintenance task');
    }
  }
  
  // Uncomplete a task
  static Future<void> uncompleteTask(
    String taskId,
    String aquariumId,
    String aquariumName,
  ) async {
    try {
      final tasks = await getTasks(aquariumId);
      final task = tasks.firstWhere((t) => t.id == taskId);
      
      final uncompletedTask = task.copyWith(
        isCompleted: false,
        completedDate: null,
        completedBy: null,
        updatedAt: DateTime.now(),
      );
      
      await saveTask(uncompletedTask, aquariumName);
      
      _logger.i('Uncompleted maintenance task: ${task.title}');
    } catch (e) {
      _logger.e('Failed to uncomplete maintenance task: $e');
      throw Exception('Failed to uncomplete maintenance task');
    }
  }
  
  // Create tasks from templates
  static Future<void> createTasksFromTemplates(
    String aquariumId,
    String aquariumName,
    List<MaintenanceTaskTemplate> templates,
  ) async {
    for (final template in templates) {
      final task = MaintenanceTask(
        id: DateTime.now().millisecondsSinceEpoch.toString() + template.title.hashCode.toString(),
        aquariumId: aquariumId,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        dueDate: DateTime.now().add(Duration(days: template.recurrenceInterval)),
        recurrence: template.recurrence,
        recurrenceInterval: template.recurrenceInterval,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      await saveTask(task, aquariumName);
    }
  }
  
  // Get task statistics
  static Future<Map<String, dynamic>> getTaskStats(String aquariumId) async {
    final tasks = await getTasks(aquariumId);
    
    final completedTasks = tasks.where((t) => t.isCompleted).length;
    final pendingTasks = tasks.where((t) => !t.isCompleted).length;
    final overdueTasks = tasks.where((t) => t.isOverdue).length;
    
    final tasksByCategory = <MaintenanceCategory, int>{};
    for (final task in tasks) {
      tasksByCategory[task.category] = (tasksByCategory[task.category] ?? 0) + 1;
    }
    
    final completionRate = tasks.isEmpty ? 0.0 : completedTasks / tasks.length;
    
    return {
      'total': tasks.length,
      'completed': completedTasks,
      'pending': pendingTasks,
      'overdue': overdueTasks,
      'completionRate': completionRate,
      'byCategory': tasksByCategory,
    };
  }
  
  // Private helper methods
  static Future<void> _scheduleTaskNotification(
    MaintenanceTask task,
    String aquariumName,
  ) async {
    if (task.dueDate == null) return;
    
    final notificationId = 5000 + task.id.hashCode % 1000;
    
    // Schedule for the day of the task
    await NotificationService.scheduleNotification(
      id: notificationId,
      title: 'Maintenance Due: ${task.title}',
      body: 'Time to complete "${task.title}" for $aquariumName',
      scheduledDate: DateTime(
        task.dueDate!.year,
        task.dueDate!.month,
        task.dueDate!.day,
        9, // 9 AM
        0,
      ),
      payload: 'maintenance:${task.id}',
    );
  }
  
  static Future<void> _cancelTaskNotification(String taskId) async {
    final notificationId = 5000 + taskId.hashCode % 1000;
    await NotificationService.cancelNotification(notificationId);
  }
}