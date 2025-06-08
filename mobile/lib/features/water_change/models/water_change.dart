import 'package:equatable/equatable.dart';

class WaterChange extends Equatable {
  final String id;
  final String aquariumId;
  final DateTime date;
  final double amount;
  final String unit; // liters or gallons
  final double percentage; // percentage of total volume
  final WaterChangeType type;
  final String? notes;
  final Map<String, double>? parametersBeforeChange;
  final Map<String, double>? parametersAfterChange;
  final List<String>? productsUsed;
  final DateTime createdAt;

  const WaterChange({
    required this.id,
    required this.aquariumId,
    required this.date,
    required this.amount,
    required this.unit,
    required this.percentage,
    required this.type,
    this.notes,
    this.parametersBeforeChange,
    this.parametersAfterChange,
    this.productsUsed,
    required this.createdAt,
  });

  WaterChange copyWith({
    String? id,
    String? aquariumId,
    DateTime? date,
    double? amount,
    String? unit,
    double? percentage,
    WaterChangeType? type,
    String? notes,
    Map<String, double>? parametersBeforeChange,
    Map<String, double>? parametersAfterChange,
    List<String>? productsUsed,
    DateTime? createdAt,
  }) {
    return WaterChange(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      date: date ?? this.date,
      amount: amount ?? this.amount,
      unit: unit ?? this.unit,
      percentage: percentage ?? this.percentage,
      type: type ?? this.type,
      notes: notes ?? this.notes,
      parametersBeforeChange: parametersBeforeChange ?? this.parametersBeforeChange,
      parametersAfterChange: parametersAfterChange ?? this.parametersAfterChange,
      productsUsed: productsUsed ?? this.productsUsed,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'date': date.toIso8601String(),
      'amount': amount,
      'unit': unit,
      'percentage': percentage,
      'type': type.value,
      'notes': notes,
      'parametersBeforeChange': parametersBeforeChange,
      'parametersAfterChange': parametersAfterChange,
      'productsUsed': productsUsed,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory WaterChange.fromJson(Map<String, dynamic> json) {
    return WaterChange(
      id: json['id'] as String,
      aquariumId: json['aquariumId'] as String,
      date: DateTime.parse(json['date'] as String),
      amount: (json['amount'] as num).toDouble(),
      unit: json['unit'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      type: WaterChangeType.fromValue(json['type'] as String),
      notes: json['notes'] as String?,
      parametersBeforeChange: json['parametersBeforeChange'] != null
          ? Map<String, double>.from(json['parametersBeforeChange'] as Map)
          : null,
      parametersAfterChange: json['parametersAfterChange'] != null
          ? Map<String, double>.from(json['parametersAfterChange'] as Map)
          : null,
      productsUsed: json['productsUsed'] != null
          ? List<String>.from(json['productsUsed'] as List)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
    id,
    aquariumId,
    date,
    amount,
    unit,
    percentage,
    type,
    notes,
    parametersBeforeChange,
    parametersAfterChange,
    productsUsed,
    createdAt,
  ];
}

enum WaterChangeType {
  partial('partial', 'Partial Water Change'),
  complete('complete', 'Complete Water Change'),
  topOff('top_off', 'Top Off'),
  emergency('emergency', 'Emergency Change');

  final String value;
  final String displayName;

  const WaterChangeType(this.value, this.displayName);

  static WaterChangeType fromValue(String value) {
    return WaterChangeType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => WaterChangeType.partial,
    );
  }
}

class WaterChangeStats extends Equatable {
  final int totalChanges;
  final double totalVolume;
  final double averagePercentage;
  final DateTime? lastChangeDate;
  final int daysSinceLastChange;
  final Map<WaterChangeType, int> changesByType;
  final List<MonthlyWaterChangeStats> monthlyStats;

  const WaterChangeStats({
    required this.totalChanges,
    required this.totalVolume,
    required this.averagePercentage,
    this.lastChangeDate,
    required this.daysSinceLastChange,
    required this.changesByType,
    required this.monthlyStats,
  });

  factory WaterChangeStats.fromChanges(List<WaterChange> changes) {
    if (changes.isEmpty) {
      return const WaterChangeStats(
        totalChanges: 0,
        totalVolume: 0,
        averagePercentage: 0,
        daysSinceLastChange: -1,
        changesByType: {},
        monthlyStats: [],
      );
    }

    // Sort by date
    final sortedChanges = List<WaterChange>.from(changes)
      ..sort((a, b) => b.date.compareTo(a.date));

    final lastChange = sortedChanges.first;
    final daysSince = DateTime.now().difference(lastChange.date).inDays;

    // Calculate totals
    double totalVolume = 0;
    double totalPercentage = 0;
    final typeCount = <WaterChangeType, int>{};

    for (final change in changes) {
      totalVolume += change.amount;
      totalPercentage += change.percentage;
      typeCount[change.type] = (typeCount[change.type] ?? 0) + 1;
    }

    // Calculate monthly stats
    final monthlyMap = <String, MonthlyWaterChangeStats>{};
    for (final change in changes) {
      final monthKey = '${change.date.year}-${change.date.month.toString().padLeft(2, '0')}';
      
      if (!monthlyMap.containsKey(monthKey)) {
        monthlyMap[monthKey] = MonthlyWaterChangeStats(
          year: change.date.year,
          month: change.date.month,
          count: 0,
          totalVolume: 0,
          averagePercentage: 0,
        );
      }

      final current = monthlyMap[monthKey]!;
      monthlyMap[monthKey] = MonthlyWaterChangeStats(
        year: current.year,
        month: current.month,
        count: current.count + 1,
        totalVolume: current.totalVolume + change.amount,
        averagePercentage: (current.averagePercentage * current.count + change.percentage) / (current.count + 1),
      );
    }

    final monthlyStats = monthlyMap.values.toList()
      ..sort((a, b) => DateTime(b.year, b.month).compareTo(DateTime(a.year, a.month)));

    return WaterChangeStats(
      totalChanges: changes.length,
      totalVolume: totalVolume,
      averagePercentage: totalPercentage / changes.length,
      lastChangeDate: lastChange.date,
      daysSinceLastChange: daysSince,
      changesByType: typeCount,
      monthlyStats: monthlyStats,
    );
  }

  @override
  List<Object?> get props => [
    totalChanges,
    totalVolume,
    averagePercentage,
    lastChangeDate,
    daysSinceLastChange,
    changesByType,
    monthlyStats,
  ];
}

class MonthlyWaterChangeStats extends Equatable {
  final int year;
  final int month;
  final int count;
  final double totalVolume;
  final double averagePercentage;

  const MonthlyWaterChangeStats({
    required this.year,
    required this.month,
    required this.count,
    required this.totalVolume,
    required this.averagePercentage,
  });

  String get monthName {
    const months = [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  @override
  List<Object> get props => [year, month, count, totalVolume, averagePercentage];
}