import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class ParameterTrend extends Equatable {
  final String parameterId;
  final String parameterName;
  final String unit;
  final List<ParameterDataPoint> dataPoints;
  final double? idealMin;
  final double? idealMax;
  final double? warningMin;
  final double? warningMax;
  final double average;
  final double min;
  final double max;
  final TrendDirection trend;

  const ParameterTrend({
    required this.parameterId,
    required this.parameterName,
    required this.unit,
    required this.dataPoints,
    this.idealMin,
    this.idealMax,
    this.warningMin,
    this.warningMax,
    required this.average,
    required this.min,
    required this.max,
    required this.trend,
  });

  factory ParameterTrend.fromJson(Map<String, dynamic> json) {
    return ParameterTrend(
      parameterId: json['parameterId'],
      parameterName: json['parameterName'],
      unit: json['unit'] ?? '',
      dataPoints: (json['dataPoints'] as List<dynamic>)
          .map((dp) => ParameterDataPoint.fromJson(dp))
          .toList(),
      idealMin: json['idealMin']?.toDouble(),
      idealMax: json['idealMax']?.toDouble(),
      warningMin: json['warningMin']?.toDouble(),
      warningMax: json['warningMax']?.toDouble(),
      average: json['average'].toDouble(),
      min: json['min'].toDouble(),
      max: json['max'].toDouble(),
      trend: TrendDirection.fromString(json['trend']),
    );
  }

  bool get hasIdealRange => idealMin != null && idealMax != null;
  bool get hasWarningRange => warningMin != null && warningMax != null;

  bool isInIdealRange(double value) {
    if (!hasIdealRange) return true;
    return value >= idealMin! && value <= idealMax!;
  }

  bool isInWarningRange(double value) {
    if (!hasWarningRange) return false;
    return value < warningMin! || value > warningMax!;
  }

  @override
  List<Object?> get props => [
        parameterId,
        parameterName,
        unit,
        dataPoints,
        idealMin,
        idealMax,
        warningMin,
        warningMax,
        average,
        min,
        max,
        trend,
      ];
}

class ParameterDataPoint extends Equatable {
  final DateTime timestamp;
  final double value;
  final String? notes;

  const ParameterDataPoint({
    required this.timestamp,
    required this.value,
    this.notes,
  });

  factory ParameterDataPoint.fromJson(Map<String, dynamic> json) {
    return ParameterDataPoint(
      timestamp: DateTime.parse(json['timestamp']),
      value: json['value'].toDouble(),
      notes: json['notes'],
    );
  }

  @override
  List<Object?> get props => [timestamp, value, notes];
}

enum TrendDirection {
  increasing('increasing'),
  decreasing('decreasing'),
  stable('stable'),
  fluctuating('fluctuating');

  final String value;
  const TrendDirection(this.value);

  static TrendDirection fromString(String value) {
    return TrendDirection.values.firstWhere(
      (trend) => trend.value == value,
      orElse: () => TrendDirection.stable,
    );
  }

  String get displayName {
    switch (this) {
      case TrendDirection.increasing:
        return 'Increasing';
      case TrendDirection.decreasing:
        return 'Decreasing';
      case TrendDirection.stable:
        return 'Stable';
      case TrendDirection.fluctuating:
        return 'Fluctuating';
    }
  }

  IconData get icon {
    switch (this) {
      case TrendDirection.increasing:
        return Icons.trending_up;
      case TrendDirection.decreasing:
        return Icons.trending_down;
      case TrendDirection.stable:
        return Icons.trending_flat;
      case TrendDirection.fluctuating:
        return Icons.show_chart;
    }
  }

  Color get color {
    switch (this) {
      case TrendDirection.increasing:
        return Colors.orange;
      case TrendDirection.decreasing:
        return Colors.blue;
      case TrendDirection.stable:
        return Colors.green;
      case TrendDirection.fluctuating:
        return Colors.purple;
    }
  }
}

class AquariumAnalytics extends Equatable {
  final String aquariumId;
  final DateTime startDate;
  final DateTime endDate;
  final HealthScoreTrend healthScoreTrend;
  final List<ParameterTrend> parameterTrends;
  final List<MaintenanceEvent> maintenanceEvents;
  final List<Alert> activeAlerts;
  final AquariumInsights insights;

  const AquariumAnalytics({
    required this.aquariumId,
    required this.startDate,
    required this.endDate,
    required this.healthScoreTrend,
    required this.parameterTrends,
    required this.maintenanceEvents,
    required this.activeAlerts,
    required this.insights,
  });

  factory AquariumAnalytics.fromJson(Map<String, dynamic> json) {
    return AquariumAnalytics(
      aquariumId: json['aquariumId'],
      startDate: DateTime.parse(json['startDate']),
      endDate: DateTime.parse(json['endDate']),
      healthScoreTrend: HealthScoreTrend.fromJson(json['healthScoreTrend']),
      parameterTrends: (json['parameterTrends'] as List<dynamic>)
          .map((pt) => ParameterTrend.fromJson(pt))
          .toList(),
      maintenanceEvents: (json['maintenanceEvents'] as List<dynamic>)
          .map((me) => MaintenanceEvent.fromJson(me))
          .toList(),
      activeAlerts: (json['activeAlerts'] as List<dynamic>)
          .map((a) => Alert.fromJson(a))
          .toList(),
      insights: AquariumInsights.fromJson(json['insights']),
    );
  }

  @override
  List<Object> get props => [
        aquariumId,
        startDate,
        endDate,
        healthScoreTrend,
        parameterTrends,
        maintenanceEvents,
        activeAlerts,
        insights,
      ];
}

class HealthScoreTrend extends Equatable {
  final List<HealthScoreDataPoint> dataPoints;
  final double currentScore;
  final double averageScore;
  final double lowestScore;
  final double highestScore;
  final TrendDirection trend;

  const HealthScoreTrend({
    required this.dataPoints,
    required this.currentScore,
    required this.averageScore,
    required this.lowestScore,
    required this.highestScore,
    required this.trend,
  });

  factory HealthScoreTrend.fromJson(Map<String, dynamic> json) {
    return HealthScoreTrend(
      dataPoints: (json['dataPoints'] as List<dynamic>)
          .map((dp) => HealthScoreDataPoint.fromJson(dp))
          .toList(),
      currentScore: json['currentScore'].toDouble(),
      averageScore: json['averageScore'].toDouble(),
      lowestScore: json['lowestScore'].toDouble(),
      highestScore: json['highestScore'].toDouble(),
      trend: TrendDirection.fromString(json['trend']),
    );
  }

  @override
  List<Object> get props => [
        dataPoints,
        currentScore,
        averageScore,
        lowestScore,
        highestScore,
        trend,
      ];
}

class HealthScoreDataPoint extends Equatable {
  final DateTime timestamp;
  final double score;
  final List<String> factors;

  const HealthScoreDataPoint({
    required this.timestamp,
    required this.score,
    this.factors = const [],
  });

  factory HealthScoreDataPoint.fromJson(Map<String, dynamic> json) {
    return HealthScoreDataPoint(
      timestamp: DateTime.parse(json['timestamp']),
      score: json['score'].toDouble(),
      factors: List<String>.from(json['factors'] ?? []),
    );
  }

  @override
  List<Object> get props => [timestamp, score, factors];
}

class MaintenanceEvent extends Equatable {
  final String id;
  final String type;
  final DateTime date;
  final String description;
  final bool completed;

  const MaintenanceEvent({
    required this.id,
    required this.type,
    required this.date,
    required this.description,
    required this.completed,
  });

  factory MaintenanceEvent.fromJson(Map<String, dynamic> json) {
    return MaintenanceEvent(
      id: json['id'],
      type: json['type'],
      date: DateTime.parse(json['date']),
      description: json['description'],
      completed: json['completed'] ?? false,
    );
  }

  IconData get icon {
    switch (type.toLowerCase()) {
      case 'water_change':
        return Icons.water_drop;
      case 'filter_clean':
        return Icons.filter_alt;
      case 'equipment_check':
        return Icons.settings;
      case 'feeding':
        return Icons.restaurant;
      default:
        return Icons.check_circle;
    }
  }

  Color get color {
    switch (type.toLowerCase()) {
      case 'water_change':
        return Colors.blue;
      case 'filter_clean':
        return Colors.purple;
      case 'equipment_check':
        return Colors.orange;
      case 'feeding':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  List<Object> get props => [id, type, date, description, completed];
}

class Alert extends Equatable {
  final String id;
  final AlertSeverity severity;
  final String title;
  final String message;
  final DateTime createdAt;
  final String? parameterName;
  final double? currentValue;
  final double? threshold;

  const Alert({
    required this.id,
    required this.severity,
    required this.title,
    required this.message,
    required this.createdAt,
    this.parameterName,
    this.currentValue,
    this.threshold,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    return Alert(
      id: json['id'],
      severity: AlertSeverity.fromString(json['severity']),
      title: json['title'],
      message: json['message'],
      createdAt: DateTime.parse(json['createdAt']),
      parameterName: json['parameterName'],
      currentValue: json['currentValue']?.toDouble(),
      threshold: json['threshold']?.toDouble(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        severity,
        title,
        message,
        createdAt,
        parameterName,
        currentValue,
        threshold,
      ];
}

enum AlertSeverity {
  critical('critical'),
  warning('warning'),
  info('info');

  final String value;
  const AlertSeverity(this.value);

  static AlertSeverity fromString(String value) {
    return AlertSeverity.values.firstWhere(
      (severity) => severity.value == value,
      orElse: () => AlertSeverity.info,
    );
  }

  Color get color {
    switch (this) {
      case AlertSeverity.critical:
        return Colors.red;
      case AlertSeverity.warning:
        return Colors.orange;
      case AlertSeverity.info:
        return Colors.blue;
    }
  }

  IconData get icon {
    switch (this) {
      case AlertSeverity.critical:
        return Icons.error;
      case AlertSeverity.warning:
        return Icons.warning;
      case AlertSeverity.info:
        return Icons.info;
    }
  }
}

class AquariumInsights extends Equatable {
  final List<Insight> insights;
  final List<Recommendation> recommendations;
  final PredictiveAnalysis? predictiveAnalysis;

  const AquariumInsights({
    required this.insights,
    required this.recommendations,
    this.predictiveAnalysis,
  });

  factory AquariumInsights.fromJson(Map<String, dynamic> json) {
    return AquariumInsights(
      insights: (json['insights'] as List<dynamic>)
          .map((i) => Insight.fromJson(i))
          .toList(),
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((r) => Recommendation.fromJson(r))
          .toList(),
      predictiveAnalysis: json['predictiveAnalysis'] != null
          ? PredictiveAnalysis.fromJson(json['predictiveAnalysis'])
          : null,
    );
  }

  @override
  List<Object?> get props => [insights, recommendations, predictiveAnalysis];
}

class Insight extends Equatable {
  final String id;
  final String title;
  final String description;
  final InsightType type;
  final String? parameterName;
  final Map<String, dynamic>? data;

  const Insight({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.parameterName,
    this.data,
  });

  factory Insight.fromJson(Map<String, dynamic> json) {
    return Insight(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      type: InsightType.fromString(json['type']),
      parameterName: json['parameterName'],
      data: json['data'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        type,
        parameterName,
        data,
      ];
}

enum InsightType {
  positive('positive'),
  negative('negative'),
  neutral('neutral');

  final String value;
  const InsightType(this.value);

  static InsightType fromString(String value) {
    return InsightType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => InsightType.neutral,
    );
  }

  Color get color {
    switch (this) {
      case InsightType.positive:
        return Colors.green;
      case InsightType.negative:
        return Colors.red;
      case InsightType.neutral:
        return Colors.blue;
    }
  }

  IconData get icon {
    switch (this) {
      case InsightType.positive:
        return Icons.thumb_up;
      case InsightType.negative:
        return Icons.thumb_down;
      case InsightType.neutral:
        return Icons.info;
    }
  }
}

class Recommendation extends Equatable {
  final String id;
  final String title;
  final String description;
  final RecommendationPriority priority;
  final String actionType;
  final Map<String, dynamic>? actionData;

  const Recommendation({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.actionType,
    this.actionData,
  });

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      priority: RecommendationPriority.fromString(json['priority']),
      actionType: json['actionType'],
      actionData: json['actionData'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        priority,
        actionType,
        actionData,
      ];
}

enum RecommendationPriority {
  high('high'),
  medium('medium'),
  low('low');

  final String value;
  const RecommendationPriority(this.value);

  static RecommendationPriority fromString(String value) {
    return RecommendationPriority.values.firstWhere(
      (priority) => priority.value == value,
      orElse: () => RecommendationPriority.low,
    );
  }

  Color get color {
    switch (this) {
      case RecommendationPriority.high:
        return Colors.red;
      case RecommendationPriority.medium:
        return Colors.orange;
      case RecommendationPriority.low:
        return Colors.blue;
    }
  }
}

class PredictiveAnalysis extends Equatable {
  final Map<String, ParameterPrediction> parameterPredictions;
  final HealthScorePrediction healthScorePrediction;
  final List<PotentialIssue> potentialIssues;

  const PredictiveAnalysis({
    required this.parameterPredictions,
    required this.healthScorePrediction,
    required this.potentialIssues,
  });

  factory PredictiveAnalysis.fromJson(Map<String, dynamic> json) {
    final predictions = <String, ParameterPrediction>{};
    json['parameterPredictions'].forEach((key, value) {
      predictions[key] = ParameterPrediction.fromJson(value);
    });

    return PredictiveAnalysis(
      parameterPredictions: predictions,
      healthScorePrediction: HealthScorePrediction.fromJson(json['healthScorePrediction']),
      potentialIssues: (json['potentialIssues'] as List<dynamic>)
          .map((pi) => PotentialIssue.fromJson(pi))
          .toList(),
    );
  }

  @override
  List<Object> get props => [
        parameterPredictions,
        healthScorePrediction,
        potentialIssues,
      ];
}

class ParameterPrediction extends Equatable {
  final String parameterName;
  final double currentValue;
  final double predictedValue;
  final DateTime predictionDate;
  final double confidence;

  const ParameterPrediction({
    required this.parameterName,
    required this.currentValue,
    required this.predictedValue,
    required this.predictionDate,
    required this.confidence,
  });

  factory ParameterPrediction.fromJson(Map<String, dynamic> json) {
    return ParameterPrediction(
      parameterName: json['parameterName'],
      currentValue: json['currentValue'].toDouble(),
      predictedValue: json['predictedValue'].toDouble(),
      predictionDate: DateTime.parse(json['predictionDate']),
      confidence: json['confidence'].toDouble(),
    );
  }

  @override
  List<Object> get props => [
        parameterName,
        currentValue,
        predictedValue,
        predictionDate,
        confidence,
      ];
}

class HealthScorePrediction extends Equatable {
  final double currentScore;
  final double predictedScore;
  final DateTime predictionDate;
  final double confidence;
  final TrendDirection trend;

  const HealthScorePrediction({
    required this.currentScore,
    required this.predictedScore,
    required this.predictionDate,
    required this.confidence,
    required this.trend,
  });

  factory HealthScorePrediction.fromJson(Map<String, dynamic> json) {
    return HealthScorePrediction(
      currentScore: json['currentScore'].toDouble(),
      predictedScore: json['predictedScore'].toDouble(),
      predictionDate: DateTime.parse(json['predictionDate']),
      confidence: json['confidence'].toDouble(),
      trend: TrendDirection.fromString(json['trend']),
    );
  }

  @override
  List<Object> get props => [
        currentScore,
        predictedScore,
        predictionDate,
        confidence,
        trend,
      ];
}

class PotentialIssue extends Equatable {
  final String id;
  final String title;
  final String description;
  final double probability;
  final DateTime estimatedDate;
  final String preventionAdvice;

  const PotentialIssue({
    required this.id,
    required this.title,
    required this.description,
    required this.probability,
    required this.estimatedDate,
    required this.preventionAdvice,
  });

  factory PotentialIssue.fromJson(Map<String, dynamic> json) {
    return PotentialIssue(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      probability: json['probability'].toDouble(),
      estimatedDate: DateTime.parse(json['estimatedDate']),
      preventionAdvice: json['preventionAdvice'],
    );
  }

  @override
  List<Object> get props => [
        id,
        title,
        description,
        probability,
        estimatedDate,
        preventionAdvice,
      ];
}

// Add missing import
import 'package:flutter/material.dart';