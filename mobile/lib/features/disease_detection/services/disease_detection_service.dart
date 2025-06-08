import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/disease_detection_result.dart';
import '../models/disease_database.dart';

class DiseaseDetectionService {
  static const String _resultsKey = 'verpa_disease_detection_results';
  static const String _historyKey = 'verpa_disease_detection_history';
  
  static final _uuid = const Uuid();
  static final _imagePicker = ImagePicker();

  // Pick image from camera or gallery
  static Future<File?> pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      
      if (pickedFile != null) {
        return File(pickedFile.path);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to pick image: $e');
    }
  }

  // Analyze image for diseases (Mock AI analysis)
  static Future<DiseaseDetectionResult> analyzeImage({
    required File imageFile,
    required String aquariumId,
  }) async {
    try {
      // Simulate AI processing time
      await Future.delayed(const Duration(seconds: 3));
      
      // For demo purposes, we'll simulate disease detection
      // In production, this would call an AI API
      final result = await _mockAIAnalysis(imageFile, aquariumId);
      
      // Save result
      await _saveResult(result);
      
      return result;
    } catch (e) {
      throw Exception('Failed to analyze image: $e');
    }
  }

  // Mock AI analysis (replace with actual AI API call)
  static Future<DiseaseDetectionResult> _mockAIAnalysis(
    File imageFile,
    String aquariumId,
  ) async {
    final random = math.Random();
    final hasDisease = random.nextDouble() > 0.5; // 50% chance of disease
    
    List<DetectedDisease> detectedDiseases = [];
    List<TreatmentRecommendation> recommendations = [];
    
    if (hasDisease) {
      // Randomly select a disease from database
      final diseases = DiseaseDatabase.diseases.values.toList();
      final selectedDisease = diseases[random.nextInt(diseases.length)];
      
      final confidence = 0.7 + (random.nextDouble() * 0.3); // 70-100% confidence
      
      detectedDiseases.add(DetectedDisease(
        id: selectedDisease.id,
        name: selectedDisease.name,
        scientificName: selectedDisease.scientificName,
        confidence: confidence,
        severity: _randomSeverity(random),
        symptoms: selectedDisease.symptoms.take(3 + random.nextInt(3)).toList(),
        affectedAreas: selectedDisease.affectedAreas,
        description: selectedDisease.description,
        causes: selectedDisease.causes.take(2 + random.nextInt(2)).toList(),
        isContagious: selectedDisease.isContagious,
      ));
      
      // Add treatment recommendations
      for (final treatment in selectedDisease.treatments) {
        recommendations.add(TreatmentRecommendation(
          id: _uuid.v4(),
          title: treatment.title,
          priority: treatment.priority,
          type: treatment.type,
          description: treatment.description,
          steps: treatment.steps,
          medication: treatment.medication,
          dosage: treatment.dosage,
          durationDays: treatment.durationDays,
          precautions: treatment.precautions,
          estimatedCost: 10.0 + (random.nextDouble() * 50.0), // $10-60
        ));
      }
    }
    
    // Generate health observations
    final observations = _generateObservations(hasDisease, random);
    
    // Overall health assessment
    final healthScore = hasDisease 
        ? 20.0 + (random.nextDouble() * 40.0) // 20-60% if diseased
        : 70.0 + (random.nextDouble() * 30.0); // 70-100% if healthy
    
    final overallHealth = OverallHealthAssessment(
      status: _getHealthStatus(healthScore),
      score: healthScore,
      summary: hasDisease 
          ? 'Disease detected. Immediate treatment recommended.'
          : 'Fish appears healthy with no major concerns.',
      concerns: hasDisease 
          ? ['Disease symptoms detected', 'Risk of spreading to other fish']
          : [],
      positives: hasDisease
          ? ['Early detection improves treatment success']
          : ['No disease symptoms detected', 'Good overall appearance'],
    );
    
    return DiseaseDetectionResult(
      id: _uuid.v4(),
      aquariumId: aquariumId,
      imageUrl: imageFile.path,
      analyzedAt: DateTime.now(),
      status: AnalysisStatus.completed,
      confidence: hasDisease ? 0.7 + (random.nextDouble() * 0.3) : 0.9,
      detectedDiseases: detectedDiseases,
      observations: observations,
      overallHealth: overallHealth,
      recommendations: recommendations,
    );
  }

  static DiseaseSeverity _randomSeverity(math.Random random) {
    final severities = DiseaseSeverity.values;
    return severities[random.nextInt(severities.length)];
  }

  static HealthStatus _getHealthStatus(double score) {
    if (score >= 90) return HealthStatus.excellent;
    if (score >= 70) return HealthStatus.good;
    if (score >= 50) return HealthStatus.fair;
    if (score >= 30) return HealthStatus.poor;
    return HealthStatus.critical;
  }

  static List<HealthObservation> _generateObservations(
    bool hasDisease,
    math.Random random,
  ) {
    final observations = <HealthObservation>[];
    
    // Positive observations
    observations.add(const HealthObservation(
      category: 'Activity',
      observation: 'Fish is swimming actively',
      type: ObservationType.positive,
    ));
    
    if (!hasDisease) {
      observations.addAll([
        const HealthObservation(
          category: 'Appearance',
          observation: 'Clear eyes with no cloudiness',
          type: ObservationType.positive,
          affectedPart: 'Eyes',
        ),
        const HealthObservation(
          category: 'Fins',
          observation: 'Fins are intact and spread normally',
          type: ObservationType.positive,
          affectedPart: 'Fins',
        ),
        const HealthObservation(
          category: 'Scales',
          observation: 'Scales appear normal and well-aligned',
          type: ObservationType.positive,
          affectedPart: 'Body',
        ),
      ]);
    } else {
      // Negative observations for disease
      observations.addAll([
        const HealthObservation(
          category: 'Behavior',
          observation: 'Unusual swimming pattern detected',
          type: ObservationType.negative,
        ),
        const HealthObservation(
          category: 'Appearance',
          observation: 'Abnormal markings or discoloration visible',
          type: ObservationType.negative,
          affectedPart: 'Body',
        ),
      ]);
      
      if (random.nextBool()) {
        observations.add(const HealthObservation(
          category: 'Breathing',
          observation: 'Rapid gill movement observed',
          type: ObservationType.warning,
          affectedPart: 'Gills',
        ));
      }
    }
    
    return observations;
  }

  // Save analysis result
  static Future<void> _saveResult(DiseaseDetectionResult result) async {
    final prefs = await SharedPreferences.getInstance();
    
    // Get existing results
    final results = await getResults(result.aquariumId);
    results.add(result);
    
    // Keep only last 50 results per aquarium
    if (results.length > 50) {
      results.removeRange(0, results.length - 50);
    }
    
    // Save
    final allResultsData = prefs.getString(_resultsKey);
    final Map<String, List<dynamic>> allResults = allResultsData != null
        ? Map<String, List<dynamic>>.from(jsonDecode(allResultsData))
        : {};
    
    allResults[result.aquariumId] = results.map((r) => r.toJson()).toList();
    await prefs.setString(_resultsKey, jsonEncode(allResults));
  }

  // Get analysis results for aquarium
  static Future<List<DiseaseDetectionResult>> getResults(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_resultsKey);
    
    if (data == null) return [];
    
    final Map<String, dynamic> allResults = jsonDecode(data);
    final List<dynamic> aquariumResults = allResults[aquariumId] ?? [];
    
    return aquariumResults
        .map((json) => DiseaseDetectionResult.fromJson(json))
        .toList()
      ..sort((a, b) => b.analyzedAt.compareTo(a.analyzedAt));
  }

  // Get latest result for aquarium
  static Future<DiseaseDetectionResult?> getLatestResult(String aquariumId) async {
    final results = await getResults(aquariumId);
    return results.isNotEmpty ? results.first : null;
  }

  // Get all results across all aquariums
  static Future<List<DiseaseDetectionResult>> getAllResults() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_resultsKey);
    
    if (data == null) return [];
    
    final Map<String, dynamic> allResults = jsonDecode(data);
    final List<DiseaseDetectionResult> results = [];
    
    for (final aquariumResults in allResults.values) {
      results.addAll(
        (aquariumResults as List).map((json) => 
          DiseaseDetectionResult.fromJson(json)
        ),
      );
    }
    
    return results..sort((a, b) => b.analyzedAt.compareTo(a.analyzedAt));
  }

  // Delete result
  static Future<void> deleteResult(String resultId, String aquariumId) async {
    final results = await getResults(aquariumId);
    results.removeWhere((r) => r.id == resultId);
    
    final prefs = await SharedPreferences.getInstance();
    final allResultsData = prefs.getString(_resultsKey);
    final Map<String, List<dynamic>> allResults = allResultsData != null
        ? Map<String, List<dynamic>>.from(jsonDecode(allResultsData))
        : {};
    
    if (results.isEmpty) {
      allResults.remove(aquariumId);
    } else {
      allResults[aquariumId] = results.map((r) => r.toJson()).toList();
    }
    
    await prefs.setString(_resultsKey, jsonEncode(allResults));
  }

  // Get disease statistics
  static Future<Map<String, dynamic>> getDiseaseStatistics() async {
    final allResults = await getAllResults();
    
    int totalScans = allResults.length;
    int diseasedScans = allResults.where((r) => r.hasDisease).length;
    int healthyScans = totalScans - diseasedScans;
    
    Map<String, int> diseaseCount = {};
    Map<DiseaseSeverity, int> severityCount = {};
    
    for (final result in allResults) {
      for (final disease in result.detectedDiseases) {
        diseaseCount[disease.name] = (diseaseCount[disease.name] ?? 0) + 1;
        severityCount[disease.severity] = (severityCount[disease.severity] ?? 0) + 1;
      }
    }
    
    return {
      'totalScans': totalScans,
      'diseasedScans': diseasedScans,
      'healthyScans': healthyScans,
      'detectionRate': totalScans > 0 ? diseasedScans / totalScans : 0.0,
      'diseaseCount': diseaseCount,
      'severityCount': severityCount,
      'lastScanDate': allResults.isNotEmpty ? allResults.first.analyzedAt : null,
    };
  }

  // Get treatment history
  static Future<List<Map<String, dynamic>>> getTreatmentHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_historyKey);
    
    if (data == null) return [];
    
    return List<Map<String, dynamic>>.from(jsonDecode(data));
  }

  // Save treatment started
  static Future<void> saveTreatmentStarted({
    required String resultId,
    required String treatmentId,
    required String aquariumId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final history = await getTreatmentHistory();
    
    history.add({
      'id': _uuid.v4(),
      'resultId': resultId,
      'treatmentId': treatmentId,
      'aquariumId': aquariumId,
      'startedAt': DateTime.now().toIso8601String(),
      'status': 'ongoing',
    });
    
    await prefs.setString(_historyKey, jsonEncode(history));
  }
}