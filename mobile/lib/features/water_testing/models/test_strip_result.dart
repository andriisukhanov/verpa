import 'package:flutter/material.dart';

enum TestStripType {
  basic5in1('basic_5in1', '5-in-1 Basic', ['ph', 'nitrite', 'nitrate', 'kh', 'gh']),
  advanced7in1('advanced_7in1', '7-in-1 Advanced', ['ph', 'nitrite', 'nitrate', 'kh', 'gh', 'chlorine', 'ammonia']),
  marine('marine', 'Marine Test', ['ph', 'ammonia', 'nitrite', 'nitrate', 'salinity', 'calcium', 'alkalinity']),
  ammonia('ammonia', 'Ammonia Only', ['ammonia']),
  custom('custom', 'Custom Strip', []);

  final String value;
  final String displayName;
  final List<String> parameters;

  const TestStripType(this.value, this.displayName, this.parameters);
}

class TestStripResult {
  final String id;
  final String aquariumId;
  final TestStripType stripType;
  final String imagePath;
  final DateTime testedAt;
  final Map<String, ParameterReading> readings;
  final double confidence;
  final ColorCalibration? calibration;
  final List<String> warnings;
  final Map<String, dynamic> metadata;

  TestStripResult({
    required this.id,
    required this.aquariumId,
    required this.stripType,
    required this.imagePath,
    required this.testedAt,
    required this.readings,
    required this.confidence,
    this.calibration,
    this.warnings = const [],
    this.metadata = const {},
  });

  bool get isReliable => confidence >= 0.8 && warnings.isEmpty;

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'stripType': stripType.value,
    'imagePath': imagePath,
    'testedAt': testedAt.toIso8601String(),
    'readings': readings.map((key, value) => MapEntry(key, value.toJson())),
    'confidence': confidence,
    'calibration': calibration?.toJson(),
    'warnings': warnings,
    'metadata': metadata,
  };

  factory TestStripResult.fromJson(Map<String, dynamic> json) {
    return TestStripResult(
      id: json['id'],
      aquariumId: json['aquariumId'],
      stripType: TestStripType.values.firstWhere(
        (t) => t.value == json['stripType'],
        orElse: () => TestStripType.basic5in1,
      ),
      imagePath: json['imagePath'],
      testedAt: DateTime.parse(json['testedAt']),
      readings: (json['readings'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, ParameterReading.fromJson(value)),
      ),
      confidence: json['confidence'].toDouble(),
      calibration: json['calibration'] != null
          ? ColorCalibration.fromJson(json['calibration'])
          : null,
      warnings: List<String>.from(json['warnings'] ?? []),
      metadata: json['metadata'] ?? {},
    );
  }
}

class ParameterReading {
  final String parameter;
  final double value;
  final String unit;
  final Color detectedColor;
  final List<ColorMatch> colorMatches;
  final double confidence;
  final bool isInRange;

  ParameterReading({
    required this.parameter,
    required this.value,
    required this.unit,
    required this.detectedColor,
    required this.colorMatches,
    required this.confidence,
    required this.isInRange,
  });

  Map<String, dynamic> toJson() => {
    'parameter': parameter,
    'value': value,
    'unit': unit,
    'detectedColor': detectedColor.value,
    'colorMatches': colorMatches.map((m) => m.toJson()).toList(),
    'confidence': confidence,
    'isInRange': isInRange,
  };

  factory ParameterReading.fromJson(Map<String, dynamic> json) {
    return ParameterReading(
      parameter: json['parameter'],
      value: json['value'].toDouble(),
      unit: json['unit'],
      detectedColor: Color(json['detectedColor']),
      colorMatches: (json['colorMatches'] as List? ?? [])
          .map((m) => ColorMatch.fromJson(m))
          .toList(),
      confidence: json['confidence'].toDouble(),
      isInRange: json['isInRange'],
    );
  }
}

class ColorMatch {
  final double value;
  final Color referenceColor;
  final double similarity;

  ColorMatch({
    required this.value,
    required this.referenceColor,
    required this.similarity,
  });

  Map<String, dynamic> toJson() => {
    'value': value,
    'referenceColor': referenceColor.value,
    'similarity': similarity,
  };

  factory ColorMatch.fromJson(Map<String, dynamic> json) {
    return ColorMatch(
      value: json['value'].toDouble(),
      referenceColor: Color(json['referenceColor']),
      similarity: json['similarity'].toDouble(),
    );
  }
}

class ColorCalibration {
  final Color whiteBalance;
  final double brightness;
  final double contrast;
  final double saturation;
  final bool isAutoCalibrated;

  ColorCalibration({
    required this.whiteBalance,
    this.brightness = 1.0,
    this.contrast = 1.0,
    this.saturation = 1.0,
    this.isAutoCalibrated = true,
  });

  Map<String, dynamic> toJson() => {
    'whiteBalance': whiteBalance.value,
    'brightness': brightness,
    'contrast': contrast,
    'saturation': saturation,
    'isAutoCalibrated': isAutoCalibrated,
  };

  factory ColorCalibration.fromJson(Map<String, dynamic> json) {
    return ColorCalibration(
      whiteBalance: Color(json['whiteBalance']),
      brightness: json['brightness']?.toDouble() ?? 1.0,
      contrast: json['contrast']?.toDouble() ?? 1.0,
      saturation: json['saturation']?.toDouble() ?? 1.0,
      isAutoCalibrated: json['isAutoCalibrated'] ?? true,
    );
  }
}

// Reference color charts for different test strips
class TestStripColorChart {
  static const Map<String, List<ColorReference>> charts = {
    'ph': [
      ColorReference(6.0, Color(0xFFFFD700)), // Yellow
      ColorReference(6.4, Color(0xFFFFA500)), // Orange
      ColorReference(6.8, Color(0xFFFF8C00)), // Dark Orange
      ColorReference(7.2, Color(0xFF90EE90)), // Light Green
      ColorReference(7.6, Color(0xFF228B22)), // Forest Green
      ColorReference(8.0, Color(0xFF006400)), // Dark Green
      ColorReference(8.4, Color(0xFF0000CD)), // Medium Blue
    ],
    'nitrite': [
      ColorReference(0.0, Color(0xFFFFFFFF)), // White
      ColorReference(0.15, Color(0xFFFFE4E1)), // Misty Rose
      ColorReference(0.3, Color(0xFFFFC0CB)), // Pink
      ColorReference(1.0, Color(0xFFFF69B4)), // Hot Pink
      ColorReference(3.0, Color(0xFFFF1493)), // Deep Pink
      ColorReference(10.0, Color(0xFFDC143C)), // Crimson
    ],
    'nitrate': [
      ColorReference(0, Color(0xFFFFFFFF)), // White
      ColorReference(20, Color(0xFFFFF0F5)), // Lavender Blush
      ColorReference(40, Color(0xFFFFB6C1)), // Light Pink
      ColorReference(80, Color(0xFFFF69B4)), // Hot Pink
      ColorReference(160, Color(0xFFFF1493)), // Deep Pink
      ColorReference(200, Color(0xFF8B0000)), // Dark Red
    ],
    'ammonia': [
      ColorReference(0.0, Color(0xFFFFFF00)), // Yellow
      ColorReference(0.25, Color(0xFFADFF2F)), // Green Yellow
      ColorReference(0.5, Color(0xFF7CFC00)), // Lawn Green
      ColorReference(1.0, Color(0xFF32CD32)), // Lime Green
      ColorReference(3.0, Color(0xFF228B22)), // Forest Green
      ColorReference(6.0, Color(0xFF006400)), // Dark Green
    ],
    'kh': [
      ColorReference(0, Color(0xFFFFB6C1)), // Light Pink
      ColorReference(40, Color(0xFFFF69B4)), // Hot Pink
      ColorReference(80, Color(0xFFFF1493)), // Deep Pink
      ColorReference(120, Color(0xFFDC143C)), // Crimson
      ColorReference(180, Color(0xFF8B0000)), // Dark Red
      ColorReference(240, Color(0xFF800020)), // Burgundy
    ],
    'gh': [
      ColorReference(0, Color(0xFF90EE90)), // Light Green
      ColorReference(30, Color(0xFF32CD32)), // Lime Green
      ColorReference(60, Color(0xFF228B22)), // Forest Green
      ColorReference(120, Color(0xFF006400)), // Dark Green
      ColorReference(180, Color(0xFF004225)), // Very Dark Green
    ],
  };

  static List<ColorReference> getChart(String parameter) {
    return charts[parameter.toLowerCase()] ?? [];
  }
}

class ColorReference {
  final double value;
  final Color color;

  const ColorReference(this.value, this.color);
}

class TestStripRegion {
  final String parameter;
  final Rect boundingBox;
  final Color averageColor;
  final double variance;

  TestStripRegion({
    required this.parameter,
    required this.boundingBox,
    required this.averageColor,
    required this.variance,
  });
}

class TestStripAnalysisResult {
  final List<TestStripRegion> regions;
  final double overallConfidence;
  final List<String> detectionIssues;
  final ColorCalibration calibration;

  TestStripAnalysisResult({
    required this.regions,
    required this.overallConfidence,
    required this.detectionIssues,
    required this.calibration,
  });
}