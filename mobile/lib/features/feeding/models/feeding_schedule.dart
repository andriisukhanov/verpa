import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class FeedingSchedule extends Equatable {
  final String id;
  final String aquariumId;
  final String name;
  final TimeOfDay time;
  final List<int> weekdays; // 1-7, where 1 is Monday
  final String? notes;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? lastFed;

  const FeedingSchedule({
    required this.id,
    required this.aquariumId,
    required this.name,
    required this.time,
    required this.weekdays,
    this.notes,
    this.isActive = true,
    required this.createdAt,
    this.lastFed,
  });

  FeedingSchedule copyWith({
    String? id,
    String? aquariumId,
    String? name,
    TimeOfDay? time,
    List<int>? weekdays,
    String? notes,
    bool? isActive,
    DateTime? createdAt,
    DateTime? lastFed,
  }) {
    return FeedingSchedule(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      name: name ?? this.name,
      time: time ?? this.time,
      weekdays: weekdays ?? this.weekdays,
      notes: notes ?? this.notes,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      lastFed: lastFed ?? this.lastFed,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'name': name,
      'time': '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
      'weekdays': weekdays,
      'notes': notes,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'lastFed': lastFed?.toIso8601String(),
    };
  }

  factory FeedingSchedule.fromJson(Map<String, dynamic> json) {
    final timeParts = (json['time'] as String).split(':');
    return FeedingSchedule(
      id: json['id'] as String,
      aquariumId: json['aquariumId'] as String,
      name: json['name'] as String,
      time: TimeOfDay(
        hour: int.parse(timeParts[0]),
        minute: int.parse(timeParts[1]),
      ),
      weekdays: List<int>.from(json['weekdays'] as List),
      notes: json['notes'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastFed: json['lastFed'] != null 
          ? DateTime.parse(json['lastFed'] as String)
          : null,
    );
  }

  String get timeString {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  String get weekdaysString {
    if (weekdays.length == 7) return 'Every day';
    if (weekdays.length == 5 && !weekdays.contains(6) && !weekdays.contains(7)) {
      return 'Weekdays';
    }
    if (weekdays.length == 2 && weekdays.contains(6) && weekdays.contains(7)) {
      return 'Weekends';
    }
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return weekdays.map((day) => dayNames[day - 1]).join(', ');
  }

  bool get shouldFeedToday {
    final today = DateTime.now().weekday;
    return weekdays.contains(today);
  }

  bool get wasRecentlyFed {
    if (lastFed == null) return false;
    final now = DateTime.now();
    final todayFeeding = DateTime(now.year, now.month, now.day, time.hour, time.minute);
    return lastFed!.isAfter(todayFeeding.subtract(const Duration(hours: 1)));
  }

  @override
  List<Object?> get props => [
    id,
    aquariumId,
    name,
    time,
    weekdays,
    notes,
    isActive,
    createdAt,
    lastFed,
  ];
}