import 'dart:io';
import 'dart:typed_data';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../models/test_strip_result.dart';

class TestStripAnalyzer {
  static const String _modelPath = 'assets/models/test_strip_detector.tflite';
  static const String _resultsKey = 'test_strip_results';
  static Interpreter? _interpreter;
  static bool _isModelLoaded = false;

  // Initialize ML model
  static Future<void> initializeModel() async {
    try {
      _interpreter = await Interpreter.fromAsset(_modelPath);
      _isModelLoaded = true;
    } catch (e) {
      print('Failed to load test strip detection model: $e');
      _isModelLoaded = false;
    }
  }

  // Main analysis function
  static Future<TestStripResult> analyzeTestStrip({
    required String imagePath,
    required String aquariumId,
    required TestStripType stripType,
  }) async {
    try {
      // Load and preprocess image
      final imageFile = File(imagePath);
      final imageBytes = await imageFile.readAsBytes();
      final image = img.decodeImage(imageBytes);
      
      if (image == null) {
        throw Exception('Failed to decode image');
      }

      // Detect test strip regions
      final regions = await _detectTestStripRegions(image, stripType);
      
      // Calibrate colors
      final calibration = _calibrateColors(image);
      
      // Analyze each parameter
      final readings = <String, ParameterReading>{};
      final warnings = <String>[];
      double totalConfidence = 0;

      for (int i = 0; i < regions.length && i < stripType.parameters.length; i++) {
        final parameter = stripType.parameters[i];
        final region = regions[i];
        
        // Extract color from region
        final averageColor = _extractAverageColor(image, region.boundingBox);
        
        // Match color to reference chart
        final colorMatches = _matchColorToChart(
          averageColor,
          parameter,
          calibration,
        );
        
        if (colorMatches.isEmpty) {
          warnings.add('Could not match color for $parameter');
          continue;
        }
        
        // Get best match
        final bestMatch = colorMatches.reduce((a, b) => 
          a.similarity > b.similarity ? a : b
        );
        
        // Check if value is in normal range
        final isInRange = _isParameterInRange(parameter, bestMatch.value);
        
        readings[parameter] = ParameterReading(
          parameter: parameter,
          value: bestMatch.value,
          unit: _getParameterUnit(parameter),
          detectedColor: averageColor,
          colorMatches: colorMatches,
          confidence: bestMatch.similarity,
          isInRange: isInRange,
        );
        
        totalConfidence += bestMatch.similarity;
        
        if (!isInRange) {
          warnings.add('$parameter is out of normal range');
        }
      }

      // Calculate overall confidence
      final overallConfidence = readings.isNotEmpty
          ? totalConfidence / readings.length
          : 0.0;

      // Check for analysis issues
      if (overallConfidence < 0.7) {
        warnings.add('Low confidence in results. Try better lighting.');
      }

      // Create result
      final result = TestStripResult(
        id: const Uuid().v4(),
        aquariumId: aquariumId,
        stripType: stripType,
        imagePath: imagePath,
        testedAt: DateTime.now(),
        readings: readings,
        confidence: overallConfidence,
        calibration: calibration,
        warnings: warnings,
        metadata: {
          'imageWidth': image.width,
          'imageHeight': image.height,
          'regionsDetected': regions.length,
          'modelUsed': _isModelLoaded,
        },
      );

      // Save result
      await _saveResult(result);

      return result;
    } catch (e) {
      throw Exception('Failed to analyze test strip: $e');
    }
  }

  // Detect test strip regions using ML or fallback method
  static Future<List<TestStripRegion>> _detectTestStripRegions(
    img.Image image,
    TestStripType stripType,
  ) async {
    if (_isModelLoaded && _interpreter != null) {
      return _detectRegionsWithML(image, stripType);
    } else {
      return _detectRegionsWithCV(image, stripType);
    }
  }

  // ML-based region detection
  static Future<List<TestStripRegion>> _detectRegionsWithML(
    img.Image image,
    TestStripType stripType,
  ) async {
    try {
      // Resize image for model input
      final inputSize = 224;
      final resized = img.copyResize(image, width: inputSize, height: inputSize);
      
      // Convert to model input format
      final input = _imageToInput(resized);
      
      // Run inference
      final output = List.filled(stripType.parameters.length * 4, 0.0)
          .reshape([1, stripType.parameters.length, 4]);
      
      _interpreter!.run(input, output);
      
      // Convert output to regions
      final regions = <TestStripRegion>[];
      final scaleX = image.width / inputSize;
      final scaleY = image.height / inputSize;
      
      for (int i = 0; i < stripType.parameters.length; i++) {
        final bbox = output[0][i];
        final rect = Rect.fromLTWH(
          bbox[0] * scaleX,
          bbox[1] * scaleY,
          bbox[2] * scaleX,
          bbox[3] * scaleY,
        );
        
        final avgColor = _extractAverageColor(image, rect);
        final variance = _calculateColorVariance(image, rect, avgColor);
        
        regions.add(TestStripRegion(
          parameter: stripType.parameters[i],
          boundingBox: rect,
          averageColor: avgColor,
          variance: variance,
        ));
      }
      
      return regions;
    } catch (e) {
      print('ML detection failed, falling back to CV: $e');
      return _detectRegionsWithCV(image, stripType);
    }
  }

  // Computer vision fallback for region detection
  static List<TestStripRegion> _detectRegionsWithCV(
    img.Image image,
    TestStripType stripType,
  ) {
    // Find test strip boundaries
    final stripBounds = _findTestStripBounds(image);
    
    if (stripBounds == null) {
      throw Exception('Could not detect test strip in image');
    }
    
    // Divide strip into equal regions
    final regionHeight = stripBounds.height / stripType.parameters.length;
    final regions = <TestStripRegion>[];
    
    for (int i = 0; i < stripType.parameters.length; i++) {
      final rect = Rect.fromLTWH(
        stripBounds.left + stripBounds.width * 0.2, // Inset 20% from edges
        stripBounds.top + i * regionHeight + regionHeight * 0.1,
        stripBounds.width * 0.6,
        regionHeight * 0.8,
      );
      
      final avgColor = _extractAverageColor(image, rect);
      final variance = _calculateColorVariance(image, rect, avgColor);
      
      regions.add(TestStripRegion(
        parameter: stripType.parameters[i],
        boundingBox: rect,
        averageColor: avgColor,
        variance: variance,
      ));
    }
    
    return regions;
  }

  // Find test strip boundaries using edge detection
  static Rect? _findTestStripBounds(img.Image image) {
    // Convert to grayscale
    final gray = img.grayscale(image);
    
    // Apply edge detection
    final edges = img.sobel(gray);
    
    // Find contours
    int minX = image.width, minY = image.height;
    int maxX = 0, maxY = 0;
    bool foundStrip = false;
    
    // Simple contour detection
    for (int y = 0; y < edges.height; y++) {
      for (int x = 0; x < edges.width; x++) {
        final pixel = edges.getPixel(x, y);
        final brightness = img.getLuminance(pixel);
        
        if (brightness > 128) {
          foundStrip = true;
          minX = math.min(minX, x);
          minY = math.min(minY, y);
          maxX = math.max(maxX, x);
          maxY = math.max(maxY, y);
        }
      }
    }
    
    if (!foundStrip) return null;
    
    // Add padding
    final padding = 10;
    return Rect.fromLTRB(
      (minX - padding).clamp(0, image.width - 1).toDouble(),
      (minY - padding).clamp(0, image.height - 1).toDouble(),
      (maxX + padding).clamp(0, image.width - 1).toDouble(),
      (maxY + padding).clamp(0, image.height - 1).toDouble(),
    );
  }

  // Extract average color from region
  static Color _extractAverageColor(img.Image image, Rect rect) {
    int r = 0, g = 0, b = 0;
    int count = 0;
    
    final startX = rect.left.toInt().clamp(0, image.width - 1);
    final endX = rect.right.toInt().clamp(0, image.width - 1);
    final startY = rect.top.toInt().clamp(0, image.height - 1);
    final endY = rect.bottom.toInt().clamp(0, image.height - 1);
    
    for (int y = startY; y < endY; y++) {
      for (int x = startX; x < endX; x++) {
        final pixel = image.getPixel(x, y);
        r += img.getRed(pixel);
        g += img.getGreen(pixel);
        b += img.getBlue(pixel);
        count++;
      }
    }
    
    if (count == 0) {
      return Colors.grey;
    }
    
    return Color.fromRGBO(
      (r / count).round(),
      (g / count).round(),
      (b / count).round(),
      1.0,
    );
  }

  // Calculate color variance in region
  static double _calculateColorVariance(
    img.Image image,
    Rect rect,
    Color avgColor,
  ) {
    double variance = 0;
    int count = 0;
    
    final startX = rect.left.toInt().clamp(0, image.width - 1);
    final endX = rect.right.toInt().clamp(0, image.width - 1);
    final startY = rect.top.toInt().clamp(0, image.height - 1);
    final endY = rect.bottom.toInt().clamp(0, image.height - 1);
    
    for (int y = startY; y < endY; y++) {
      for (int x = startX; x < endX; x++) {
        final pixel = image.getPixel(x, y);
        final r = img.getRed(pixel);
        final g = img.getGreen(pixel);
        final b = img.getBlue(pixel);
        
        final dr = r - avgColor.red;
        final dg = g - avgColor.green;
        final db = b - avgColor.blue;
        
        variance += dr * dr + dg * dg + db * db;
        count++;
      }
    }
    
    return count > 0 ? variance / count : 0;
  }

  // Auto-calibrate colors based on white balance
  static ColorCalibration _calibrateColors(img.Image image) {
    // Find brightest area (likely white reference)
    int maxBrightness = 0;
    Color whiteReference = Colors.white;
    
    for (int y = 0; y < image.height; y += 10) {
      for (int x = 0; x < image.width; x += 10) {
        final pixel = image.getPixel(x, y);
        final brightness = img.getLuminance(pixel);
        
        if (brightness > maxBrightness) {
          maxBrightness = brightness;
          whiteReference = Color.fromRGBO(
            img.getRed(pixel),
            img.getGreen(pixel),
            img.getBlue(pixel),
            1.0,
          );
        }
      }
    }
    
    // Calculate correction factors
    final avgChannel = (whiteReference.red + whiteReference.green + whiteReference.blue) / 3;
    final rCorrection = avgChannel / whiteReference.red;
    final gCorrection = avgChannel / whiteReference.green;
    final bCorrection = avgChannel / whiteReference.blue;
    
    return ColorCalibration(
      whiteBalance: Color.fromRGBO(
        (255 * rCorrection).round().clamp(0, 255),
        (255 * gCorrection).round().clamp(0, 255),
        (255 * bCorrection).round().clamp(0, 255),
        1.0,
      ),
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      isAutoCalibrated: true,
    );
  }

  // Match detected color to reference chart
  static List<ColorMatch> _matchColorToChart(
    Color detectedColor,
    String parameter,
    ColorCalibration calibration,
  ) {
    final chart = TestStripColorChart.getChart(parameter);
    if (chart.isEmpty) return [];
    
    // Apply calibration to detected color
    final calibratedColor = _applyCalibration(detectedColor, calibration);
    
    // Calculate similarity to each reference color
    final matches = <ColorMatch>[];
    
    for (final reference in chart) {
      final similarity = _calculateColorSimilarity(calibratedColor, reference.color);
      
      matches.add(ColorMatch(
        value: reference.value,
        referenceColor: reference.color,
        similarity: similarity,
      ));
    }
    
    // Sort by similarity
    matches.sort((a, b) => b.similarity.compareTo(a.similarity));
    
    // Return top 3 matches
    return matches.take(3).toList();
  }

  // Apply color calibration
  static Color _applyCalibration(Color color, ColorCalibration calibration) {
    // Apply white balance
    final r = (color.red * calibration.whiteBalance.red / 255).round();
    final g = (color.green * calibration.whiteBalance.green / 255).round();
    final b = (color.blue * calibration.whiteBalance.blue / 255).round();
    
    // Apply brightness
    final br = (r * calibration.brightness).round();
    final bg = (g * calibration.brightness).round();
    final bb = (b * calibration.brightness).round();
    
    return Color.fromRGBO(
      br.clamp(0, 255),
      bg.clamp(0, 255),
      bb.clamp(0, 255),
      1.0,
    );
  }

  // Calculate color similarity (0-1)
  static double _calculateColorSimilarity(Color c1, Color c2) {
    // Use CIE76 color difference formula
    final lab1 = _rgbToLab(c1);
    final lab2 = _rgbToLab(c2);
    
    final deltaL = lab1[0] - lab2[0];
    final deltaA = lab1[1] - lab2[1];
    final deltaB = lab1[2] - lab2[2];
    
    final deltaE = math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
    
    // Convert to similarity (0-1)
    // Delta E of 0 = perfect match, 100 = completely different
    return math.max(0, 1 - deltaE / 100);
  }

  // Convert RGB to LAB color space
  static List<double> _rgbToLab(Color color) {
    // Convert RGB to XYZ
    double r = color.red / 255.0;
    double g = color.green / 255.0;
    double b = color.blue / 255.0;
    
    r = r > 0.04045 ? math.pow((r + 0.055) / 1.055, 2.4).toDouble() : r / 12.92;
    g = g > 0.04045 ? math.pow((g + 0.055) / 1.055, 2.4).toDouble() : g / 12.92;
    b = b > 0.04045 ? math.pow((b + 0.055) / 1.055, 2.4).toDouble() : b / 12.92;
    
    r *= 100;
    g *= 100;
    b *= 100;
    
    // Observer = 2°, Illuminant = D65
    double x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    double y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    double z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    
    // Convert XYZ to LAB
    x /= 95.047;
    y /= 100.000;
    z /= 108.883;
    
    x = x > 0.008856 ? math.pow(x, 1/3).toDouble() : (7.787 * x) + (16/116);
    y = y > 0.008856 ? math.pow(y, 1/3).toDouble() : (7.787 * y) + (16/116);
    z = z > 0.008856 ? math.pow(z, 1/3).toDouble() : (7.787 * z) + (16/116);
    
    final l = (116 * y) - 16;
    final a = 500 * (x - y);
    final bVal = 200 * (y - z);
    
    return [l, a, bVal];
  }

  // Convert image to model input format
  static List<List<List<List<double>>>> _imageToInput(img.Image image) {
    final input = List.generate(
      1,
      (_) => List.generate(
        image.height,
        (y) => List.generate(
          image.width,
          (x) {
            final pixel = image.getPixel(x, y);
            return [
              img.getRed(pixel) / 255.0,
              img.getGreen(pixel) / 255.0,
              img.getBlue(pixel) / 255.0,
            ];
          },
        ),
      ),
    );
    
    return input;
  }

  // Check if parameter is in normal range
  static bool _isParameterInRange(String parameter, double value) {
    switch (parameter.toLowerCase()) {
      case 'ph':
        return value >= 6.8 && value <= 7.4;
      case 'ammonia':
        return value == 0;
      case 'nitrite':
        return value == 0;
      case 'nitrate':
        return value < 40;
      case 'kh':
        return value >= 40 && value <= 180;
      case 'gh':
        return value >= 60 && value <= 180;
      case 'chlorine':
        return value == 0;
      default:
        return true;
    }
  }

  // Get parameter unit
  static String _getParameterUnit(String parameter) {
    switch (parameter.toLowerCase()) {
      case 'ph':
        return '';
      case 'ammonia':
      case 'nitrite':
      case 'nitrate':
        return 'ppm';
      case 'kh':
      case 'gh':
        return 'dKH';
      case 'chlorine':
        return 'ppm';
      case 'salinity':
        return 'ppt';
      case 'calcium':
        return 'ppm';
      case 'alkalinity':
        return 'dKH';
      default:
        return '';
    }
  }

  // Save test result
  static Future<void> _saveResult(TestStripResult result) async {
    final prefs = await SharedPreferences.getInstance();
    final key = '$_resultsKey-${result.aquariumId}';
    
    // Get existing results
    final existingJson = prefs.getString(key);
    final results = existingJson != null
        ? (json.decode(existingJson) as List)
            .map((r) => TestStripResult.fromJson(r))
            .toList()
        : <TestStripResult>[];
    
    // Add new result
    results.add(result);
    
    // Keep only last 50 results
    if (results.length > 50) {
      results.removeRange(0, results.length - 50);
    }
    
    // Save
    await prefs.setString(
      key,
      json.encode(results.map((r) => r.toJson()).toList()),
    );
  }

  // Get test history
  static Future<List<TestStripResult>> getTestHistory(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final key = '$_resultsKey-$aquariumId';
    final resultsJson = prefs.getString(key);
    
    if (resultsJson != null) {
      return (json.decode(resultsJson) as List)
          .map((r) => TestStripResult.fromJson(r))
          .toList()
          .reversed
          .toList();
    }
    
    return [];
  }

  // Clear test history
  static Future<void> clearTestHistory(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_resultsKey-$aquariumId');
  }
}