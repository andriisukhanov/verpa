import 'package:equatable/equatable.dart';

class DiseaseDetectionResult extends Equatable {
  final String id;
  final String aquariumId;
  final String imageUrl;
  final DateTime analyzedAt;
  final AnalysisStatus status;
  final double confidence;
  final List<DetectedDisease> detectedDiseases;
  final List<HealthObservation> observations;
  final OverallHealthAssessment overallHealth;
  final List<TreatmentRecommendation> recommendations;
  final String? errorMessage;

  const DiseaseDetectionResult({
    required this.id,
    required this.aquariumId,
    required this.imageUrl,
    required this.analyzedAt,
    required this.status,
    required this.confidence,
    required this.detectedDiseases,
    required this.observations,
    required this.overallHealth,
    required this.recommendations,
    this.errorMessage,
  });

  bool get hasDisease => detectedDiseases.isNotEmpty;
  
  DiseaseDetectionResult copyWith({
    String? id,
    String? aquariumId,
    String? imageUrl,
    DateTime? analyzedAt,
    AnalysisStatus? status,
    double? confidence,
    List<DetectedDisease>? detectedDiseases,
    List<HealthObservation>? observations,
    OverallHealthAssessment? overallHealth,
    List<TreatmentRecommendation>? recommendations,
    String? errorMessage,
  }) {
    return DiseaseDetectionResult(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      imageUrl: imageUrl ?? this.imageUrl,
      analyzedAt: analyzedAt ?? this.analyzedAt,
      status: status ?? this.status,
      confidence: confidence ?? this.confidence,
      detectedDiseases: detectedDiseases ?? this.detectedDiseases,
      observations: observations ?? this.observations,
      overallHealth: overallHealth ?? this.overallHealth,
      recommendations: recommendations ?? this.recommendations,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'imageUrl': imageUrl,
      'analyzedAt': analyzedAt.toIso8601String(),
      'status': status.name,
      'confidence': confidence,
      'detectedDiseases': detectedDiseases.map((d) => d.toJson()).toList(),
      'observations': observations.map((o) => o.toJson()).toList(),
      'overallHealth': overallHealth.toJson(),
      'recommendations': recommendations.map((r) => r.toJson()).toList(),
      'errorMessage': errorMessage,
    };
  }

  factory DiseaseDetectionResult.fromJson(Map<String, dynamic> json) {
    return DiseaseDetectionResult(
      id: json['id'],
      aquariumId: json['aquariumId'],
      imageUrl: json['imageUrl'],
      analyzedAt: DateTime.parse(json['analyzedAt']),
      status: AnalysisStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => AnalysisStatus.failed,
      ),
      confidence: (json['confidence'] ?? 0.0).toDouble(),
      detectedDiseases: (json['detectedDiseases'] as List)
          .map((d) => DetectedDisease.fromJson(d))
          .toList(),
      observations: (json['observations'] as List)
          .map((o) => HealthObservation.fromJson(o))
          .toList(),
      overallHealth: OverallHealthAssessment.fromJson(json['overallHealth']),
      recommendations: (json['recommendations'] as List)
          .map((r) => TreatmentRecommendation.fromJson(r))
          .toList(),
      errorMessage: json['errorMessage'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        aquariumId,
        imageUrl,
        analyzedAt,
        status,
        confidence,
        detectedDiseases,
        observations,
        overallHealth,
        recommendations,
        errorMessage,
      ];
}

enum AnalysisStatus {
  pending('pending'),
  analyzing('analyzing'),
  completed('completed'),
  failed('failed');

  final String name;
  const AnalysisStatus(this.name);
}

class DetectedDisease extends Equatable {
  final String id;
  final String name;
  final String scientificName;
  final double confidence;
  final DiseaseSeverity severity;
  final List<String> symptoms;
  final List<String> affectedAreas;
  final String description;
  final List<String> causes;
  final bool isContagious;
  final String? imageUrl;

  const DetectedDisease({
    required this.id,
    required this.name,
    required this.scientificName,
    required this.confidence,
    required this.severity,
    required this.symptoms,
    required this.affectedAreas,
    required this.description,
    required this.causes,
    required this.isContagious,
    this.imageUrl,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'scientificName': scientificName,
      'confidence': confidence,
      'severity': severity.name,
      'symptoms': symptoms,
      'affectedAreas': affectedAreas,
      'description': description,
      'causes': causes,
      'isContagious': isContagious,
      'imageUrl': imageUrl,
    };
  }

  factory DetectedDisease.fromJson(Map<String, dynamic> json) {
    return DetectedDisease(
      id: json['id'],
      name: json['name'],
      scientificName: json['scientificName'],
      confidence: (json['confidence'] ?? 0.0).toDouble(),
      severity: DiseaseSeverity.values.firstWhere(
        (s) => s.name == json['severity'],
        orElse: () => DiseaseSeverity.mild,
      ),
      symptoms: List<String>.from(json['symptoms'] ?? []),
      affectedAreas: List<String>.from(json['affectedAreas'] ?? []),
      description: json['description'],
      causes: List<String>.from(json['causes'] ?? []),
      isContagious: json['isContagious'] ?? false,
      imageUrl: json['imageUrl'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        scientificName,
        confidence,
        severity,
        symptoms,
        affectedAreas,
        description,
        causes,
        isContagious,
        imageUrl,
      ];
}

enum DiseaseSeverity {
  mild('mild', 'Mild'),
  moderate('moderate', 'Moderate'),
  severe('severe', 'Severe'),
  critical('critical', 'Critical');

  final String name;
  final String displayName;
  const DiseaseSeverity(this.name, this.displayName);
}

class HealthObservation extends Equatable {
  final String category;
  final String observation;
  final ObservationType type;
  final String? affectedPart;

  const HealthObservation({
    required this.category,
    required this.observation,
    required this.type,
    this.affectedPart,
  });

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'observation': observation,
      'type': type.name,
      'affectedPart': affectedPart,
    };
  }

  factory HealthObservation.fromJson(Map<String, dynamic> json) {
    return HealthObservation(
      category: json['category'],
      observation: json['observation'],
      type: ObservationType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => ObservationType.neutral,
      ),
      affectedPart: json['affectedPart'],
    );
  }

  @override
  List<Object?> get props => [category, observation, type, affectedPart];
}

enum ObservationType {
  positive('positive'),
  negative('negative'),
  neutral('neutral'),
  warning('warning');

  final String name;
  const ObservationType(this.name);
}

class OverallHealthAssessment extends Equatable {
  final HealthStatus status;
  final double score;
  final String summary;
  final List<String> concerns;
  final List<String> positives;

  const OverallHealthAssessment({
    required this.status,
    required this.score,
    required this.summary,
    required this.concerns,
    required this.positives,
  });

  Map<String, dynamic> toJson() {
    return {
      'status': status.name,
      'score': score,
      'summary': summary,
      'concerns': concerns,
      'positives': positives,
    };
  }

  factory OverallHealthAssessment.fromJson(Map<String, dynamic> json) {
    return OverallHealthAssessment(
      status: HealthStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => HealthStatus.unknown,
      ),
      score: (json['score'] ?? 0.0).toDouble(),
      summary: json['summary'],
      concerns: List<String>.from(json['concerns'] ?? []),
      positives: List<String>.from(json['positives'] ?? []),
    );
  }

  @override
  List<Object> get props => [status, score, summary, concerns, positives];
}

enum HealthStatus {
  excellent('excellent', 'Excellent'),
  good('good', 'Good'),
  fair('fair', 'Fair'),
  poor('poor', 'Poor'),
  critical('critical', 'Critical'),
  unknown('unknown', 'Unknown');

  final String name;
  final String displayName;
  const HealthStatus(this.name, this.displayName);
}

class TreatmentRecommendation extends Equatable {
  final String id;
  final String title;
  final TreatmentPriority priority;
  final TreatmentType type;
  final String description;
  final List<String> steps;
  final String? medication;
  final String? dosage;
  final int? durationDays;
  final List<String> precautions;
  final double estimatedCost;
  final String? productLink;

  const TreatmentRecommendation({
    required this.id,
    required this.title,
    required this.priority,
    required this.type,
    required this.description,
    required this.steps,
    this.medication,
    this.dosage,
    this.durationDays,
    required this.precautions,
    required this.estimatedCost,
    this.productLink,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'priority': priority.name,
      'type': type.name,
      'description': description,
      'steps': steps,
      'medication': medication,
      'dosage': dosage,
      'durationDays': durationDays,
      'precautions': precautions,
      'estimatedCost': estimatedCost,
      'productLink': productLink,
    };
  }

  factory TreatmentRecommendation.fromJson(Map<String, dynamic> json) {
    return TreatmentRecommendation(
      id: json['id'],
      title: json['title'],
      priority: TreatmentPriority.values.firstWhere(
        (p) => p.name == json['priority'],
        orElse: () => TreatmentPriority.low,
      ),
      type: TreatmentType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => TreatmentType.general,
      ),
      description: json['description'],
      steps: List<String>.from(json['steps'] ?? []),
      medication: json['medication'],
      dosage: json['dosage'],
      durationDays: json['durationDays'],
      precautions: List<String>.from(json['precautions'] ?? []),
      estimatedCost: (json['estimatedCost'] ?? 0.0).toDouble(),
      productLink: json['productLink'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        priority,
        type,
        description,
        steps,
        medication,
        dosage,
        durationDays,
        precautions,
        estimatedCost,
        productLink,
      ];
}

enum TreatmentPriority {
  urgent('urgent', 'Urgent'),
  high('high', 'High'),
  medium('medium', 'Medium'),
  low('low', 'Low');

  final String name;
  final String displayName;
  const TreatmentPriority(this.name, this.displayName);
}

enum TreatmentType {
  medication('medication', 'Medication'),
  waterChange('water_change', 'Water Change'),
  quarantine('quarantine', 'Quarantine'),
  dietary('dietary', 'Dietary'),
  environmental('environmental', 'Environmental'),
  general('general', 'General Care');

  final String name;
  final String displayName;
  const TreatmentType(this.name, this.displayName);
}