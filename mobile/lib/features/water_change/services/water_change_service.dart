import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';
import 'dart:convert';
import 'dart:math' as math;

import '../models/water_change.dart';

class WaterChangeService {
  static final Logger _logger = Logger();
  static const String _storageKey = 'water_changes';
  
  // Get all water changes for an aquarium
  static Future<List<WaterChange>> getWaterChanges(String aquariumId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final changesJson = prefs.getString(_storageKey);
      
      if (changesJson == null) return [];
      
      final List<dynamic> changesList = json.decode(changesJson);
      return changesList
          .map((json) => WaterChange.fromJson(json))
          .where((change) => change.aquariumId == aquariumId)
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));
    } catch (e) {
      _logger.e('Failed to get water changes: $e');
      return [];
    }
  }
  
  // Save a water change
  static Future<void> saveWaterChange(WaterChange waterChange) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final changesJson = prefs.getString(_storageKey);
      
      List<dynamic> changesList = [];
      if (changesJson != null) {
        changesList = json.decode(changesJson);
      }
      
      // Remove existing change with same ID if updating
      changesList.removeWhere((c) => c['id'] == waterChange.id);
      
      // Add new/updated change
      changesList.add(waterChange.toJson());
      
      // Save to storage
      await prefs.setString(_storageKey, json.encode(changesList));
      
      _logger.i('Saved water change: ${waterChange.id}');
    } catch (e) {
      _logger.e('Failed to save water change: $e');
      throw Exception('Failed to save water change');
    }
  }
  
  // Delete a water change
  static Future<void> deleteWaterChange(String changeId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final changesJson = prefs.getString(_storageKey);
      
      if (changesJson == null) return;
      
      List<dynamic> changesList = json.decode(changesJson);
      changesList.removeWhere((c) => c['id'] == changeId);
      
      await prefs.setString(_storageKey, json.encode(changesList));
      
      _logger.i('Deleted water change: $changeId');
    } catch (e) {
      _logger.e('Failed to delete water change: $e');
      throw Exception('Failed to delete water change');
    }
  }
  
  // Get water change statistics
  static Future<WaterChangeStats> getStats(String aquariumId) async {
    final changes = await getWaterChanges(aquariumId);
    return WaterChangeStats.fromChanges(changes);
  }
  
  // Get last water change
  static Future<WaterChange?> getLastWaterChange(String aquariumId) async {
    final changes = await getWaterChanges(aquariumId);
    return changes.isEmpty ? null : changes.first;
  }
  
  // Check if water change is due
  static Future<bool> isWaterChangeDue(String aquariumId, int intervalDays) async {
    final lastChange = await getLastWaterChange(aquariumId);
    
    if (lastChange == null) return true;
    
    final daysSince = DateTime.now().difference(lastChange.date).inDays;
    return daysSince >= intervalDays;
  }
  
  // Get water changes for date range
  static Future<List<WaterChange>> getWaterChangesForDateRange(
    String aquariumId,
    DateTime startDate,
    DateTime endDate,
  ) async {
    final changes = await getWaterChanges(aquariumId);
    
    return changes.where((change) {
      return change.date.isAfter(startDate.subtract(const Duration(days: 1))) &&
             change.date.isBefore(endDate.add(const Duration(days: 1)));
    }).toList();
  }
  
  // Calculate recommended water change
  static Map<String, dynamic> calculateRecommendedChange({
    required double aquariumVolume,
    required String volumeUnit,
    required Map<String, double> currentParameters,
  }) {
    // Base recommendation: 10-25% weekly
    double recommendedPercentage = 15.0;
    String reason = 'Regular maintenance';
    
    // Adjust based on parameters
    final nitrate = currentParameters['nitrate'] ?? 0;
    final phosphate = currentParameters['phosphate'] ?? 0;
    
    if (nitrate > 40) {
      recommendedPercentage = 30.0;
      reason = 'High nitrate levels';
    } else if (nitrate > 20) {
      recommendedPercentage = 20.0;
      reason = 'Elevated nitrate levels';
    }
    
    if (phosphate > 1.0) {
      recommendedPercentage = math.max(recommendedPercentage, 25.0);
      reason = 'High phosphate levels';
    }
    
    final recommendedVolume = aquariumVolume * (recommendedPercentage / 100);
    
    return {
      'percentage': recommendedPercentage,
      'volume': recommendedVolume,
      'unit': volumeUnit,
      'reason': reason,
    };
  }
}