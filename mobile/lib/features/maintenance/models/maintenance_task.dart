import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class MaintenanceTask extends Equatable {
  final String id;
  final String aquariumId;
  final String title;
  final String? description;
  final MaintenanceCategory category;
  final MaintenancePriority priority;
  final DateTime? dueDate;
  final RecurrenceType? recurrence;
  final int? recurrenceInterval; // days
  final bool isCompleted;
  final DateTime? completedDate;
  final String? completedBy;
  final List<String>? notes;
  final List<String>? attachments;
  final DateTime createdAt;
  final DateTime updatedAt;

  const MaintenanceTask({
    required this.id,
    required this.aquariumId,
    required this.title,
    this.description,
    required this.category,
    required this.priority,
    this.dueDate,
    this.recurrence,
    this.recurrenceInterval,
    this.isCompleted = false,
    this.completedDate,
    this.completedBy,
    this.notes,
    this.attachments,
    required this.createdAt,
    required this.updatedAt,
  });

  MaintenanceTask copyWith({
    String? id,
    String? aquariumId,
    String? title,
    String? description,
    MaintenanceCategory? category,
    MaintenancePriority? priority,
    DateTime? dueDate,
    RecurrenceType? recurrence,
    int? recurrenceInterval,
    bool? isCompleted,
    DateTime? completedDate,
    String? completedBy,
    List<String>? notes,
    List<String>? attachments,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return MaintenanceTask(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      dueDate: dueDate ?? this.dueDate,
      recurrence: recurrence ?? this.recurrence,
      recurrenceInterval: recurrenceInterval ?? this.recurrenceInterval,
      isCompleted: isCompleted ?? this.isCompleted,
      completedDate: completedDate ?? this.completedDate,
      completedBy: completedBy ?? this.completedBy,
      notes: notes ?? this.notes,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'title': title,
      'description': description,
      'category': category.value,
      'priority': priority.value,
      'dueDate': dueDate?.toIso8601String(),
      'recurrence': recurrence?.value,
      'recurrenceInterval': recurrenceInterval,
      'isCompleted': isCompleted,
      'completedDate': completedDate?.toIso8601String(),
      'completedBy': completedBy,
      'notes': notes,
      'attachments': attachments,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory MaintenanceTask.fromJson(Map<String, dynamic> json) {
    return MaintenanceTask(
      id: json['id'] as String,
      aquariumId: json['aquariumId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: MaintenanceCategory.fromValue(json['category'] as String),
      priority: MaintenancePriority.fromValue(json['priority'] as String),
      dueDate: json['dueDate'] != null 
          ? DateTime.parse(json['dueDate'] as String) 
          : null,
      recurrence: json['recurrence'] != null 
          ? RecurrenceType.fromValue(json['recurrence'] as String)
          : null,
      recurrenceInterval: json['recurrenceInterval'] as int?,
      isCompleted: json['isCompleted'] as bool? ?? false,
      completedDate: json['completedDate'] != null 
          ? DateTime.parse(json['completedDate'] as String) 
          : null,
      completedBy: json['completedBy'] as String?,
      notes: json['notes'] != null 
          ? List<String>.from(json['notes'] as List) 
          : null,
      attachments: json['attachments'] != null 
          ? List<String>.from(json['attachments'] as List) 
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  bool get isOverdue {
    if (dueDate == null || isCompleted) return false;
    return dueDate!.isBefore(DateTime.now());
  }

  int get daysUntilDue {
    if (dueDate == null) return -1;
    return dueDate!.difference(DateTime.now()).inDays;
  }

  MaintenanceTask createNextRecurrence() {
    if (recurrence == null || recurrenceInterval == null) {
      throw Exception('Task is not recurring');
    }

    final nextDueDate = dueDate?.add(Duration(days: recurrenceInterval!)) ?? 
                       DateTime.now().add(Duration(days: recurrenceInterval!));

    return MaintenanceTask(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      aquariumId: aquariumId,
      title: title,
      description: description,
      category: category,
      priority: priority,
      dueDate: nextDueDate,
      recurrence: recurrence,
      recurrenceInterval: recurrenceInterval,
      isCompleted: false,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [
    id,
    aquariumId,
    title,
    description,
    category,
    priority,
    dueDate,
    recurrence,
    recurrenceInterval,
    isCompleted,
    completedDate,
    completedBy,
    notes,
    attachments,
    createdAt,
    updatedAt,
  ];
}

enum MaintenanceCategory {
  waterChange('water_change', 'Water Change', Icons.water_drop, Color(0xFF2196F3)),
  filterCleaning('filter_cleaning', 'Filter Cleaning', Icons.air, Color(0xFF4CAF50)),
  equipment('equipment', 'Equipment Check', Icons.build, Color(0xFFFF9800)),
  testing('testing', 'Water Testing', Icons.science, Color(0xFF9C27B0)),
  feeding('feeding', 'Feeding', Icons.restaurant, Color(0xFFE91E63)),
  medication('medication', 'Medication', Icons.medical_services, Color(0xFFF44336)),
  landscaping('landscaping', 'Aquascaping', Icons.park, Color(0xFF8BC34A)),
  general('general', 'General Task', Icons.task_alt, Color(0xFF607D8B));

  final String value;
  final String displayName;
  final IconData icon;
  final Color color;

  const MaintenanceCategory(this.value, this.displayName, this.icon, this.color);

  static MaintenanceCategory fromValue(String value) {
    return MaintenanceCategory.values.firstWhere(
      (cat) => cat.value == value,
      orElse: () => MaintenanceCategory.general,
    );
  }
}

enum MaintenancePriority {
  low('low', 'Low', Color(0xFF4CAF50)),
  medium('medium', 'Medium', Color(0xFFFF9800)),
  high('high', 'High', Color(0xFFF44336)),
  critical('critical', 'Critical', Color(0xFF9C27B0));

  final String value;
  final String displayName;
  final Color color;

  const MaintenancePriority(this.value, this.displayName, this.color);

  static MaintenancePriority fromValue(String value) {
    return MaintenancePriority.values.firstWhere(
      (priority) => priority.value == value,
      orElse: () => MaintenancePriority.medium,
    );
  }
}

enum RecurrenceType {
  daily('daily', 'Daily'),
  weekly('weekly', 'Weekly'),
  biweekly('biweekly', 'Bi-weekly'),
  monthly('monthly', 'Monthly'),
  custom('custom', 'Custom');

  final String value;
  final String displayName;

  const RecurrenceType(this.value, this.displayName);

  static RecurrenceType fromValue(String value) {
    return RecurrenceType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => RecurrenceType.custom,
    );
  }

  int get defaultInterval {
    switch (this) {
      case RecurrenceType.daily:
        return 1;
      case RecurrenceType.weekly:
        return 7;
      case RecurrenceType.biweekly:
        return 14;
      case RecurrenceType.monthly:
        return 30;
      case RecurrenceType.custom:
        return 7;
    }
  }
}

class MaintenanceTaskTemplate {
  final String title;
  final String description;
  final MaintenanceCategory category;
  final MaintenancePriority priority;
  final RecurrenceType recurrence;
  final int recurrenceInterval;

  const MaintenanceTaskTemplate({
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.recurrence,
    required this.recurrenceInterval,
  });

  static const List<MaintenanceTaskTemplate> commonTemplates = [
    MaintenanceTaskTemplate(
      title: 'Weekly Water Change',
      description: 'Perform 10-20% water change',
      category: MaintenanceCategory.waterChange,
      priority: MaintenancePriority.high,
      recurrence: RecurrenceType.weekly,
      recurrenceInterval: 7,
    ),
    MaintenanceTaskTemplate(
      title: 'Filter Maintenance',
      description: 'Clean or replace filter media',
      category: MaintenanceCategory.filterCleaning,
      priority: MaintenancePriority.medium,
      recurrence: RecurrenceType.monthly,
      recurrenceInterval: 30,
    ),
    MaintenanceTaskTemplate(
      title: 'Water Parameter Test',
      description: 'Test pH, ammonia, nitrite, and nitrate levels',
      category: MaintenanceCategory.testing,
      priority: MaintenancePriority.high,
      recurrence: RecurrenceType.weekly,
      recurrenceInterval: 7,
    ),
    MaintenanceTaskTemplate(
      title: 'Equipment Inspection',
      description: 'Check heater, pump, and lights functionality',
      category: MaintenanceCategory.equipment,
      priority: MaintenancePriority.medium,
      recurrence: RecurrenceType.biweekly,
      recurrenceInterval: 14,
    ),
    MaintenanceTaskTemplate(
      title: 'Glass Cleaning',
      description: 'Clean aquarium glass inside and outside',
      category: MaintenanceCategory.general,
      priority: MaintenancePriority.low,
      recurrence: RecurrenceType.weekly,
      recurrenceInterval: 7,
    ),
    MaintenanceTaskTemplate(
      title: 'Plant Trimming',
      description: 'Trim overgrown plants and remove dead leaves',
      category: MaintenanceCategory.landscaping,
      priority: MaintenancePriority.low,
      recurrence: RecurrenceType.biweekly,
      recurrenceInterval: 14,
    ),
  ];
}