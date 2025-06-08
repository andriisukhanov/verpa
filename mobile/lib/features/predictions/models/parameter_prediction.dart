import 'package:flutter/material.dart';
import '../../aquarium/models/water_parameters.dart';

enum PredictionTrend {
  increasing('increasing', 'Increasing', Icons.trending_up, Color(0xFFE91E63)),
  stable('stable', 'Stable', Icons.trending_flat, Color(0xFF4CAF50)),
  decreasing('decreasing', 'Decreasing', Icons.trending_down, Color(0xFF2196F3)),
  concerning('concerning', 'Concerning', Icons.warning, Color(0xFFFF9800)),
  critical('critical', 'Critical', Icons.error, Color(0xFFF44336));

  final String value;
  final String displayName;
  final IconData icon;
  final Color color;

  const PredictionTrend(this.value, this.displayName, this.icon, this.color);
}

enum PredictionConfidence {
  low('low', 'Low', 0.0, 0.6),
  medium('medium', 'Medium', 0.6, 0.8),
  high('high', 'High', 0.8, 1.0);

  final String value;
  final String displayName;
  final double minValue;
  final double maxValue;

  const PredictionConfidence(this.value, this.displayName, this.minValue, this.maxValue);

  static PredictionConfidence fromValue(double value) {
    if (value < 0.6) return low;
    if (value < 0.8) return medium;
    return high;
  }

  Color get color {
    switch (this) {
      case low:
        return Colors.orange;
      case medium:
        return Colors.blue;
      case high:
        return Colors.green;
    }
  }
}

class ParameterPrediction {
  final String id;
  final String aquariumId;
  final WaterParameter parameter;
  final DateTime predictionDate;
  final double currentValue;
  final double predictedValue;
  final double predictedMin;
  final double predictedMax;
  final PredictionTrend trend;
  final double confidence;
  final DateTime targetDate;
  final List<String> factors;
  final List<Recommendation> recommendations;
  final Map<String, dynamic> metadata;

  ParameterPrediction({
    required this.id,
    required this.aquariumId,
    required this.parameter,
    required this.predictionDate,
    required this.currentValue,
    required this.predictedValue,
    required this.predictedMin,
    required this.predictedMax,
    required this.trend,
    required this.confidence,
    required this.targetDate,
    this.factors = const [],
    this.recommendations = const [],
    this.metadata = const {},
  });

  PredictionConfidence get confidenceLevel => PredictionConfidence.fromValue(confidence);

  double get changePercentage {
    if (currentValue == 0) return 0;
    return ((predictedValue - currentValue) / currentValue) * 100;
  }

  bool get isSignificantChange => changePercentage.abs() > 10;

  bool get isWithinRange {
    final range = parameter.optimalRange;
    if (range == null) return true;
    return predictedValue >= range.min && predictedValue <= range.max;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'parameter': parameter.key,
    'predictionDate': predictionDate.toIso8601String(),
    'currentValue': currentValue,
    'predictedValue': predictedValue,
    'predictedMin': predictedMin,
    'predictedMax': predictedMax,
    'trend': trend.value,
    'confidence': confidence,
    'targetDate': targetDate.toIso8601String(),
    'factors': factors,
    'recommendations': recommendations.map((r) => r.toJson()).toList(),
    'metadata': metadata,
  };

  factory ParameterPrediction.fromJson(Map<String, dynamic> json) {
    return ParameterPrediction(
      id: json['id'],
      aquariumId: json['aquariumId'],
      parameter: WaterParameterPresets.all.firstWhere(
        (p) => p.key == json['parameter'],
        orElse: () => WaterParameterPresets.ph,
      ),
      predictionDate: DateTime.parse(json['predictionDate']),
      currentValue: json['currentValue'].toDouble(),
      predictedValue: json['predictedValue'].toDouble(),
      predictedMin: json['predictedMin'].toDouble(),
      predictedMax: json['predictedMax'].toDouble(),
      trend: PredictionTrend.values.firstWhere(
        (t) => t.value == json['trend'],
        orElse: () => PredictionTrend.stable,
      ),
      confidence: json['confidence'].toDouble(),
      targetDate: DateTime.parse(json['targetDate']),
      factors: List<String>.from(json['factors'] ?? []),
      recommendations: (json['recommendations'] as List? ?? [])
          .map((r) => Recommendation.fromJson(r))
          .toList(),
      metadata: json['metadata'] ?? {},
    );
  }
}

class Recommendation {
  final String id;
  final String title;
  final String description;
  final RecommendationPriority priority;
  final List<String> actions;
  final Map<String, dynamic> metadata;

  Recommendation({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    this.actions = const [],
    this.metadata = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'priority': priority.value,
    'actions': actions,
    'metadata': metadata,
  };

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      priority: RecommendationPriority.values.firstWhere(
        (p) => p.value == json['priority'],
        orElse: () => RecommendationPriority.low,
      ),
      actions: List<String>.from(json['actions'] ?? []),
      metadata: json['metadata'] ?? {},
    );
  }
}

enum RecommendationPriority {
  low('low', 'Low', Color(0xFF4CAF50)),
  medium('medium', 'Medium', Color(0xFFFF9800)),
  high('high', 'High', Color(0xFFF44336));

  final String value;
  final String displayName;
  final Color color;

  const RecommendationPriority(this.value, this.displayName, this.color);
}

class PredictionInsight {
  final String id;
  final String title;
  final String description;
  final InsightType type;
  final List<String> affectedParameters;
  final DateTime createdAt;

  PredictionInsight({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.affectedParameters,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'type': type.value,
    'affectedParameters': affectedParameters,
    'createdAt': createdAt.toIso8601String(),
  };

  factory PredictionInsight.fromJson(Map<String, dynamic> json) {
    return PredictionInsight(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      type: InsightType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => InsightType.info,
      ),
      affectedParameters: List<String>.from(json['affectedParameters'] ?? []),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

enum InsightType {
  info('info', 'Information', Icons.info, Color(0xFF2196F3)),
  warning('warning', 'Warning', Icons.warning, Color(0xFFFF9800)),
  alert('alert', 'Alert', Icons.error, Color(0xFFF44336)),
  success('success', 'Success', Icons.check_circle, Color(0xFF4CAF50));

  final String value;
  final String displayName;
  final IconData icon;
  final Color color;

  const InsightType(this.value, this.displayName, this.icon, this.color);
}

class PredictionHistory {
  final String id;
  final String aquariumId;
  final String parameterId;
  final List<HistoricalPrediction> predictions;
  final double accuracy;
  final DateTime lastUpdated;

  PredictionHistory({
    required this.id,
    required this.aquariumId,
    required this.parameterId,
    required this.predictions,
    required this.accuracy,
    required this.lastUpdated,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'parameterId': parameterId,
    'predictions': predictions.map((p) => p.toJson()).toList(),
    'accuracy': accuracy,
    'lastUpdated': lastUpdated.toIso8601String(),
  };

  factory PredictionHistory.fromJson(Map<String, dynamic> json) {
    return PredictionHistory(
      id: json['id'],
      aquariumId: json['aquariumId'],
      parameterId: json['parameterId'],
      predictions: (json['predictions'] as List? ?? [])
          .map((p) => HistoricalPrediction.fromJson(p))
          .toList(),
      accuracy: json['accuracy'].toDouble(),
      lastUpdated: DateTime.parse(json['lastUpdated']),
    );
  }
}

class HistoricalPrediction {
  final DateTime predictionDate;
  final double predictedValue;
  final double actualValue;
  final double confidence;
  final double error;

  HistoricalPrediction({
    required this.predictionDate,
    required this.predictedValue,
    required this.actualValue,
    required this.confidence,
  }) : error = (predictedValue - actualValue).abs();

  double get errorPercentage {
    if (actualValue == 0) return 0;
    return (error / actualValue) * 100;
  }

  bool get isAccurate => errorPercentage < 10;

  Map<String, dynamic> toJson() => {
    'predictionDate': predictionDate.toIso8601String(),
    'predictedValue': predictedValue,
    'actualValue': actualValue,
    'confidence': confidence,
    'error': error,
  };

  factory HistoricalPrediction.fromJson(Map<String, dynamic> json) {
    return HistoricalPrediction(
      predictionDate: DateTime.parse(json['predictionDate']),
      predictedValue: json['predictedValue'].toDouble(),
      actualValue: json['actualValue'].toDouble(),
      confidence: json['confidence'].toDouble(),
    );
  }
}