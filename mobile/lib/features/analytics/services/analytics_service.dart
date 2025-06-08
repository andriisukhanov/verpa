import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../../core/utils/api_client.dart';
import '../models/analytics_model.dart';

class AnalyticsService {
  final ApiClient _apiClient;
  final Logger _logger = Logger();

  AnalyticsService({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  Future<AquariumAnalytics> getAquariumAnalytics({
    required String aquariumId,
    DateTime? startDate,
    DateTime? endDate,
    String? period,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }
      
      if (period != null) {
        queryParams['period'] = period;
      }

      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId',
        queryParameters: queryParams,
      );

      return AquariumAnalytics.fromJson(response.data);
    } on DioException catch (e) {
      _logger.e('Failed to get aquarium analytics', error: e);
      throw _handleError(e);
    }
  }

  Future<List<ParameterTrend>> getParameterTrends({
    required String aquariumId,
    required List<String> parameterIds,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'parameterIds': parameterIds.join(','),
      };
      
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId/parameters',
        queryParameters: queryParams,
      );

      return (response.data as List<dynamic>)
          .map((trend) => ParameterTrend.fromJson(trend))
          .toList();
    } on DioException catch (e) {
      _logger.e('Failed to get parameter trends', error: e);
      throw _handleError(e);
    }
  }

  Future<HealthScoreTrend> getHealthScoreTrend({
    required String aquariumId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId/health-score',
        queryParameters: queryParams,
      );

      return HealthScoreTrend.fromJson(response.data);
    } on DioException catch (e) {
      _logger.e('Failed to get health score trend', error: e);
      throw _handleError(e);
    }
  }

  Future<Map<String, double>> getParameterCorrelations({
    required String aquariumId,
    required String parameterId,
  }) async {
    try {
      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId/correlations/$parameterId',
      );

      return Map<String, double>.from(response.data);
    } on DioException catch (e) {
      _logger.e('Failed to get parameter correlations', error: e);
      throw _handleError(e);
    }
  }

  Future<PredictiveAnalysis> getPredictiveAnalysis({
    required String aquariumId,
    int daysAhead = 7,
  }) async {
    try {
      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId/predictions',
        queryParameters: {
          'daysAhead': daysAhead,
        },
      );

      return PredictiveAnalysis.fromJson(response.data);
    } on DioException catch (e) {
      _logger.e('Failed to get predictive analysis', error: e);
      throw _handleError(e);
    }
  }

  Future<List<MaintenanceEvent>> getMaintenanceHistory({
    required String aquariumId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _apiClient.get(
        '/analytics/aquarium/$aquariumId/maintenance',
        queryParameters: queryParams,
      );

      return (response.data as List<dynamic>)
          .map((event) => MaintenanceEvent.fromJson(event))
          .toList();
    } on DioException catch (e) {
      _logger.e('Failed to get maintenance history', error: e);
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException e) {
    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final message = e.response!.data['message'] ?? 'An error occurred';
      
      switch (statusCode) {
        case 400:
          return Exception('Invalid request: $message');
        case 401:
          return Exception('Unauthorized');
        case 403:
          return Exception('Access denied');
        case 404:
          return Exception('Analytics data not found');
        case 500:
          return Exception('Server error: $message');
        default:
          return Exception(message);
      }
    } else if (e.type == DioExceptionType.connectionTimeout ||
               e.type == DioExceptionType.sendTimeout ||
               e.type == DioExceptionType.receiveTimeout) {
      return Exception('Connection timeout');
    } else if (e.type == DioExceptionType.connectionError) {
      return Exception('No internet connection');
    }
    
    return Exception('An unexpected error occurred');
  }
}