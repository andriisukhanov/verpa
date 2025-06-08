import 'dart:convert';
import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

import '../models/parameter_prediction.dart';
import '../../aquarium/models/water_parameters.dart';

class PredictionService {
  static const String _predictionsKey = 'predictions';
  static const String _historyKey = 'prediction_history';
  static const String _insightsKey = 'prediction_insights';
  static const String _modelAssetPath = 'assets/models/water_prediction.tflite';
  
  static Interpreter? _interpreter;
  static bool _isModelLoaded = false;

  // Initialize TensorFlow Lite model
  static Future<void> initializeModel() async {
    try {
      _interpreter = await Interpreter.fromAsset(_modelAssetPath);
      _isModelLoaded = true;
    } catch (e) {
      print('Failed to load ML model: $e');
      _isModelLoaded = false;
    }
  }

  // Get predictions for all parameters
  static Future<List<ParameterPrediction>> getPredictions(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final predictionsJson = prefs.getString('$_predictionsKey-$aquariumId');
    
    if (predictionsJson != null) {
      final List<dynamic> predictionsList = json.decode(predictionsJson);
      return predictionsList
          .map((p) => ParameterPrediction.fromJson(p))
          .toList();
    }
    
    return [];
  }

  // Generate predictions for a specific parameter
  static Future<ParameterPrediction> generatePrediction({
    required String aquariumId,
    required WaterParameter parameter,
    required List<WaterParameterReading> historicalData,
    int daysAhead = 7,
  }) async {
    if (historicalData.length < 3) {
      throw Exception('Insufficient historical data for predictions');
    }

    // Sort data by date
    historicalData.sort((a, b) => a.recordedAt.compareTo(b.recordedAt));

    // Get current value
    final currentValue = historicalData.last.value;

    // Generate prediction using ML model or fallback algorithm
    final prediction = await _runPrediction(
      parameter: parameter,
      historicalData: historicalData,
      daysAhead: daysAhead,
    );

    // Analyze trend
    final trend = _analyzeTrend(historicalData, prediction.predictedValue);

    // Generate factors affecting the prediction
    final factors = _generateFactors(parameter, historicalData, trend);

    // Generate recommendations
    final recommendations = _generateRecommendations(
      parameter: parameter,
      currentValue: currentValue,
      predictedValue: prediction.predictedValue,
      trend: trend,
    );

    // Create prediction object
    final parameterPrediction = ParameterPrediction(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      parameter: parameter,
      predictionDate: DateTime.now(),
      currentValue: currentValue,
      predictedValue: prediction.predictedValue,
      predictedMin: prediction.minValue,
      predictedMax: prediction.maxValue,
      trend: trend,
      confidence: prediction.confidence,
      targetDate: DateTime.now().add(Duration(days: daysAhead)),
      factors: factors,
      recommendations: recommendations,
      metadata: {
        'dataPoints': historicalData.length,
        'algorithm': _isModelLoaded ? 'ml_model' : 'statistical',
        'modelVersion': '1.0.0',
      },
    );

    // Save prediction
    await _savePrediction(aquariumId, parameterPrediction);

    return parameterPrediction;
  }

  // Run prediction algorithm
  static Future<PredictionResult> _runPrediction({
    required WaterParameter parameter,
    required List<WaterParameterReading> historicalData,
    required int daysAhead,
  }) async {
    if (_isModelLoaded && _interpreter != null) {
      // Use ML model for prediction
      return _runMLPrediction(parameter, historicalData, daysAhead);
    } else {
      // Fallback to statistical prediction
      return _runStatisticalPrediction(parameter, historicalData, daysAhead);
    }
  }

  // ML-based prediction
  static Future<PredictionResult> _runMLPrediction(
    WaterParameter parameter,
    List<WaterParameterReading> historicalData,
    int daysAhead,
  ) async {
    try {
      // Prepare input data for the model
      final inputData = _prepareMLInput(historicalData);
      
      // Create output buffer
      final output = List.filled(3, 0.0).reshape([1, 3]);
      
      // Run inference
      _interpreter!.run(inputData, output);
      
      // Extract results
      final predictedValue = output[0][0];
      final minValue = output[0][1];
      final maxValue = output[0][2];
      
      // Calculate confidence based on prediction range
      final confidence = 1.0 - ((maxValue - minValue) / (maxValue + minValue));
      
      return PredictionResult(
        predictedValue: predictedValue,
        minValue: minValue,
        maxValue: maxValue,
        confidence: confidence.clamp(0.0, 1.0),
      );
    } catch (e) {
      print('ML prediction failed: $e');
      // Fallback to statistical prediction
      return _runStatisticalPrediction(parameter, historicalData, daysAhead);
    }
  }

  // Statistical prediction fallback
  static Future<PredictionResult> _runStatisticalPrediction(
    WaterParameter parameter,
    List<WaterParameterReading> historicalData,
    int daysAhead,
  ) async {
    // Calculate basic statistics
    final values = historicalData.map((r) => r.value).toList();
    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance = values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
    final stdDev = sqrt(variance);

    // Calculate trend using linear regression
    final n = values.length;
    final xValues = List.generate(n, (i) => i.toDouble());
    final sumX = xValues.reduce((a, b) => a + b);
    final sumY = values.reduce((a, b) => a + b);
    final sumXY = List.generate(n, (i) => xValues[i] * values[i]).reduce((a, b) => a + b);
    final sumX2 = xValues.map((x) => x * x).reduce((a, b) => a + b);

    final slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    final intercept = (sumY - slope * sumX) / n;

    // Predict future value
    final futureX = n + daysAhead.toDouble();
    final predictedValue = slope * futureX + intercept;

    // Calculate confidence interval
    final confidenceMultiplier = 1.96; // 95% confidence interval
    final predictionError = stdDev * sqrt(1 + 1/n + pow(futureX - sumX/n, 2) / (sumX2 - sumX*sumX/n));
    final minValue = predictedValue - confidenceMultiplier * predictionError;
    final maxValue = predictedValue + confidenceMultiplier * predictionError;

    // Calculate confidence score
    final trendStrength = slope.abs() / stdDev;
    final dataConsistency = 1 - (stdDev / mean);
    final confidence = ((trendStrength + dataConsistency) / 2).clamp(0.0, 1.0);

    return PredictionResult(
      predictedValue: predictedValue,
      minValue: minValue,
      maxValue: maxValue,
      confidence: confidence,
    );
  }

  // Prepare input data for ML model
  static List<List<double>> _prepareMLInput(List<WaterParameterReading> data) {
    // Take last 10 readings or pad with zeros
    final inputSize = 10;
    final input = <double>[];

    for (int i = 0; i < inputSize; i++) {
      if (i < data.length) {
        input.add(data[data.length - inputSize + i].value);
      } else {
        input.add(0.0);
      }
    }

    return [input];
  }

  // Analyze trend based on historical data
  static PredictionTrend _analyzeTrend(
    List<WaterParameterReading> historicalData,
    double predictedValue,
  ) {
    if (historicalData.length < 2) return PredictionTrend.stable;

    final currentValue = historicalData.last.value;
    final previousValue = historicalData[historicalData.length - 2].value;
    final changePercentage = ((predictedValue - currentValue) / currentValue) * 100;

    // Check if parameter is within critical range
    final parameter = historicalData.last.parameter;
    if (parameter.optimalRange != null) {
      final range = parameter.optimalRange!;
      if (predictedValue < range.min || predictedValue > range.max) {
        if ((predictedValue - range.max).abs() > (range.max - range.min) * 0.2 ||
            (predictedValue - range.min).abs() > (range.max - range.min) * 0.2) {
          return PredictionTrend.critical;
        }
        return PredictionTrend.concerning;
      }
    }

    // Analyze trend direction
    if (changePercentage > 5) {
      return PredictionTrend.increasing;
    } else if (changePercentage < -5) {
      return PredictionTrend.decreasing;
    } else {
      return PredictionTrend.stable;
    }
  }

  // Generate factors affecting the prediction
  static List<String> _generateFactors(
    WaterParameter parameter,
    List<WaterParameterReading> historicalData,
    PredictionTrend trend,
  ) {
    final factors = <String>[];

    // Recent changes
    if (historicalData.length >= 2) {
      final recentChange = historicalData.last.value - historicalData[historicalData.length - 2].value;
      if (recentChange.abs() > 0) {
        factors.add('Recent ${recentChange > 0 ? "increase" : "decrease"} detected');
      }
    }

    // Volatility
    final values = historicalData.map((r) => r.value).toList();
    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance = values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
    final volatility = sqrt(variance) / mean;
    
    if (volatility > 0.1) {
      factors.add('High volatility in recent measurements');
    }

    // Parameter-specific factors
    switch (parameter.key) {
      case 'ph':
        if (trend == PredictionTrend.decreasing) {
          factors.add('Possible acidification trend');
        } else if (trend == PredictionTrend.increasing) {
          factors.add('Possible alkalinization trend');
        }
        break;
      case 'ammonia':
        if (trend == PredictionTrend.increasing) {
          factors.add('Bioload may be increasing');
          factors.add('Check filtration efficiency');
        }
        break;
      case 'nitrite':
        if (trend == PredictionTrend.increasing) {
          factors.add('Nitrogen cycle may be disrupted');
        }
        break;
      case 'temperature':
        factors.add('Seasonal temperature variations');
        if (trend == PredictionTrend.increasing) {
          factors.add('Check heater settings');
        }
        break;
    }

    // Time-based factors
    final daysSinceLastReading = DateTime.now().difference(historicalData.last.recordedAt).inDays;
    if (daysSinceLastReading > 7) {
      factors.add('Long gap since last measurement');
    }

    return factors;
  }

  // Generate recommendations based on predictions
  static List<Recommendation> _generateRecommendations({
    required WaterParameter parameter,
    required double currentValue,
    required double predictedValue,
    required PredictionTrend trend,
  }) {
    final recommendations = <Recommendation>[];

    // Check if predicted value is out of optimal range
    if (parameter.optimalRange != null) {
      final range = parameter.optimalRange!;
      
      if (predictedValue < range.min) {
        recommendations.add(Recommendation(
          id: const Uuid().v4(),
          title: 'Prevent ${parameter.name} Drop',
          description: '${parameter.name} is predicted to fall below optimal range',
          priority: RecommendationPriority.high,
          actions: _getParameterIncreaseActions(parameter),
        ));
      } else if (predictedValue > range.max) {
        recommendations.add(Recommendation(
          id: const Uuid().v4(),
          title: 'Prevent ${parameter.name} Spike',
          description: '${parameter.name} is predicted to exceed optimal range',
          priority: RecommendationPriority.high,
          actions: _getParameterDecreaseActions(parameter),
        ));
      }
    }

    // Trend-specific recommendations
    switch (trend) {
      case PredictionTrend.concerning:
        recommendations.add(Recommendation(
          id: const Uuid().v4(),
          title: 'Monitor Closely',
          description: 'Parameter showing concerning trend',
          priority: RecommendationPriority.medium,
          actions: [
            'Increase testing frequency',
            'Document any changes in the aquarium',
            'Review recent maintenance activities',
          ],
        ));
        break;
      case PredictionTrend.critical:
        recommendations.add(Recommendation(
          id: const Uuid().v4(),
          title: 'Immediate Action Required',
          description: 'Parameter predicted to reach critical levels',
          priority: RecommendationPriority.high,
          actions: [
            'Test parameter immediately',
            'Prepare corrective measures',
            'Consider emergency water change',
          ],
        ));
        break;
      default:
        break;
    }

    // General maintenance recommendations
    if (recommendations.isEmpty && trend == PredictionTrend.stable) {
      recommendations.add(Recommendation(
        id: const Uuid().v4(),
        title: 'Maintain Current Routine',
        description: 'Parameters are predicted to remain stable',
        priority: RecommendationPriority.low,
        actions: [
          'Continue regular testing schedule',
          'Maintain current maintenance routine',
        ],
      ));
    }

    return recommendations;
  }

  // Get parameter-specific increase actions
  static List<String> _getParameterIncreaseActions(WaterParameter parameter) {
    switch (parameter.key) {
      case 'ph':
        return [
          'Add pH buffer or baking soda',
          'Check CO2 levels',
          'Increase aeration',
        ];
      case 'kh':
        return [
          'Add alkalinity buffer',
          'Use crushed coral in filter',
          'Perform water change with harder water',
        ];
      case 'gh':
        return [
          'Add GH booster',
          'Use remineralization salts',
          'Add limestone or shells',
        ];
      case 'calcium':
        return [
          'Dose calcium supplement',
          'Check calcium reactor if present',
          'Use calcium-rich salt mix',
        ];
      default:
        return ['Consult parameter-specific guidelines'];
    }
  }

  // Get parameter-specific decrease actions
  static List<String> _getParameterDecreaseActions(WaterParameter parameter) {
    switch (parameter.key) {
      case 'ph':
        return [
          'Add pH reducer',
          'Increase CO2 injection',
          'Add driftwood or peat',
        ];
      case 'ammonia':
        return [
          'Perform immediate water change',
          'Check filter media',
          'Reduce feeding',
          'Add beneficial bacteria',
        ];
      case 'nitrite':
        return [
          'Perform water change',
          'Add nitrifying bacteria',
          'Check bioload',
          'Reduce feeding temporarily',
        ];
      case 'nitrate':
        return [
          'Perform water change',
          'Add live plants',
          'Clean substrate',
          'Review feeding schedule',
        ];
      case 'phosphate':
        return [
          'Use phosphate remover',
          'Increase water changes',
          'Review feeding amounts',
          'Clean filter media',
        ];
      default:
        return ['Perform water change', 'Consult parameter-specific guidelines'];
    }
  }

  // Save prediction
  static Future<void> _savePrediction(
    String aquariumId,
    ParameterPrediction prediction,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final predictions = await getPredictions(aquariumId);
    
    // Remove old prediction for same parameter if exists
    predictions.removeWhere((p) => p.parameter.key == prediction.parameter.key);
    
    // Add new prediction
    predictions.add(prediction);
    
    // Save to storage
    await prefs.setString(
      '$_predictionsKey-$aquariumId',
      json.encode(predictions.map((p) => p.toJson()).toList()),
    );
    
    // Update history
    await _updatePredictionHistory(aquariumId, prediction);
  }

  // Update prediction history
  static Future<void> _updatePredictionHistory(
    String aquariumId,
    ParameterPrediction prediction,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final historyKey = '$_historyKey-$aquariumId-${prediction.parameter.key}';
    
    // For now, just save the current prediction
    // In a real app, we would track accuracy over time
    final history = PredictionHistory(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      parameterId: prediction.parameter.key,
      predictions: [],
      accuracy: 0.85, // Placeholder accuracy
      lastUpdated: DateTime.now(),
    );
    
    await prefs.setString(historyKey, json.encode(history.toJson()));
  }

  // Get prediction insights
  static Future<List<PredictionInsight>> getInsights(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final insightsJson = prefs.getString('$_insightsKey-$aquariumId');
    
    if (insightsJson != null) {
      final List<dynamic> insightsList = json.decode(insightsJson);
      return insightsList
          .map((i) => PredictionInsight.fromJson(i))
          .toList();
    }
    
    // Generate insights based on current predictions
    return _generateInsights(aquariumId);
  }

  // Generate insights from predictions
  static Future<List<PredictionInsight>> _generateInsights(String aquariumId) async {
    final predictions = await getPredictions(aquariumId);
    final insights = <PredictionInsight>[];

    // Check for correlated parameters
    final concerningParams = predictions.where((p) => 
      p.trend == PredictionTrend.concerning || 
      p.trend == PredictionTrend.critical
    ).toList();

    if (concerningParams.length >= 2) {
      insights.add(PredictionInsight(
        id: const Uuid().v4(),
        title: 'Multiple Parameters Need Attention',
        description: 'Several water parameters are showing concerning trends. This may indicate a system-wide issue.',
        type: InsightType.warning,
        affectedParameters: concerningParams.map((p) => p.parameter.key).toList(),
        createdAt: DateTime.now(),
      ));
    }

    // Check for nitrogen cycle issues
    final ammoniaPredict = predictions.firstWhere(
      (p) => p.parameter.key == 'ammonia',
      orElse: () => predictions.first,
    );
    final nitritePredict = predictions.firstWhere(
      (p) => p.parameter.key == 'nitrite',
      orElse: () => predictions.first,
    );

    if (ammoniaPredict.trend == PredictionTrend.increasing || 
        nitritePredict.trend == PredictionTrend.increasing) {
      insights.add(PredictionInsight(
        id: const Uuid().v4(),
        title: 'Potential Nitrogen Cycle Issue',
        description: 'Rising ammonia or nitrite levels may indicate problems with biological filtration.',
        type: InsightType.alert,
        affectedParameters: ['ammonia', 'nitrite', 'nitrate'],
        createdAt: DateTime.now(),
      ));
    }

    // Check for stable parameters
    final stableParams = predictions.where((p) => p.trend == PredictionTrend.stable).toList();
    if (stableParams.length == predictions.length) {
      insights.add(PredictionInsight(
        id: const Uuid().v4(),
        title: 'All Parameters Stable',
        description: 'Your aquarium parameters are predicted to remain stable. Great job maintaining water quality!',
        type: InsightType.success,
        affectedParameters: stableParams.map((p) => p.parameter.key).toList(),
        createdAt: DateTime.now(),
      ));
    }

    // Save insights
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_insightsKey-$aquariumId',
      json.encode(insights.map((i) => i.toJson()).toList()),
    );

    return insights;
  }

  // Clear all predictions for an aquarium
  static Future<void> clearPredictions(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_predictionsKey-$aquariumId');
    await prefs.remove('$_insightsKey-$aquariumId');
  }
}

class PredictionResult {
  final double predictedValue;
  final double minValue;
  final double maxValue;
  final double confidence;

  PredictionResult({
    required this.predictedValue,
    required this.minValue,
    required this.maxValue,
    required this.confidence,
  });
}

class WaterParameterReading {
  final WaterParameter parameter;
  final double value;
  final DateTime recordedAt;

  WaterParameterReading({
    required this.parameter,
    required this.value,
    required this.recordedAt,
  });
}