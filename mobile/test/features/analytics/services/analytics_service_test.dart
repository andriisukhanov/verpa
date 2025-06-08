import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:verpa/core/api/api_client.dart';
import 'package:verpa/features/analytics/models/analytics_model.dart';
import 'package:verpa/features/analytics/services/analytics_service.dart';

// Mock classes
class MockApiClient extends Mock implements ApiClient {}

void main() {
  late AnalyticsService service;
  late MockApiClient mockApiClient;

  // Test data
  const testAquariumId = 'aquarium123';
  final testStartDate = DateTime(2024, 1, 1);
  final testEndDate = DateTime(2024, 1, 31);

  final testAquariumAnalytics = AquariumAnalytics(
    aquariumId: testAquariumId,
    period: 'month',
    healthScore: HealthScore(
      current: 85.5,
      average: 82.3,
      trend: 3.2,
      history: [
        HealthScorePoint(date: DateTime(2024, 1, 1), score: 80.0),
        HealthScorePoint(date: DateTime(2024, 1, 15), score: 83.5),
        HealthScorePoint(date: DateTime(2024, 1, 31), score: 85.5),
      ],
    ),
    parameterSummary: ParameterSummary(
      temperature: ParameterStats(
        average: 78.2,
        min: 76.5,
        max: 79.8,
        standardDeviation: 1.2,
      ),
      ph: ParameterStats(
        average: 7.2,
        min: 7.0,
        max: 7.4,
        standardDeviation: 0.15,
      ),
      ammonia: ParameterStats(
        average: 0.01,
        min: 0.0,
        max: 0.05,
        standardDeviation: 0.02,
      ),
      nitrite: ParameterStats(
        average: 0.0,
        min: 0.0,
        max: 0.0,
        standardDeviation: 0.0,
      ),
      nitrate: ParameterStats(
        average: 15.0,
        min: 10.0,
        max: 20.0,
        standardDeviation: 3.5,
      ),
    ),
    maintenanceStats: MaintenanceStats(
      totalTasks: 25,
      completedTasks: 23,
      overdueTasks: 1,
      upcomingTasks: 3,
      completionRate: 92.0,
    ),
    alerts: AlertsSummary(
      total: 5,
      critical: 1,
      warning: 3,
      info: 1,
    ),
  );

  final testParameterTrends = [
    ParameterTrend(
      parameterId: 'temperature',
      name: 'Temperature',
      unit: '°F',
      data: [
        TrendPoint(date: DateTime(2024, 1, 1), value: 78.0),
        TrendPoint(date: DateTime(2024, 1, 2), value: 78.5),
        TrendPoint(date: DateTime(2024, 1, 3), value: 78.2),
      ],
      average: 78.2,
      trend: 0.1,
    ),
    ParameterTrend(
      parameterId: 'ph',
      name: 'pH',
      unit: '',
      data: [
        TrendPoint(date: DateTime(2024, 1, 1), value: 7.2),
        TrendPoint(date: DateTime(2024, 1, 2), value: 7.1),
        TrendPoint(date: DateTime(2024, 1, 3), value: 7.3),
      ],
      average: 7.2,
      trend: 0.05,
    ),
  ];

  final testHealthScoreTrend = HealthScoreTrend(
    aquariumId: testAquariumId,
    data: [
      HealthScorePoint(date: DateTime(2024, 1, 1), score: 80.0),
      HealthScorePoint(date: DateTime(2024, 1, 15), score: 83.5),
      HealthScorePoint(date: DateTime(2024, 1, 31), score: 85.5),
    ],
    average: 83.0,
    trend: 5.5,
    prediction: HealthScorePrediction(
      nextWeek: 87.0,
      confidence: 0.85,
    ),
  );

  final testPredictiveAnalysis = PredictiveAnalysis(
    aquariumId: testAquariumId,
    predictions: [
      ParameterPrediction(
        parameterId: 'temperature',
        name: 'Temperature',
        unit: '°F',
        predictions: [
          PredictionPoint(
            date: DateTime(2024, 2, 1),
            value: 78.5,
            confidence: 0.9,
          ),
          PredictionPoint(
            date: DateTime(2024, 2, 2),
            value: 78.3,
            confidence: 0.85,
          ),
        ],
        trend: 'stable',
        recommendation: 'Temperature is expected to remain stable',
      ),
    ],
    alerts: [
      PredictedAlert(
        type: 'warning',
        parameter: 'nitrate',
        message: 'Nitrate levels may rise above 20 ppm in 3 days',
        probability: 0.75,
        date: DateTime(2024, 2, 3),
      ),
    ],
    recommendations: [
      'Consider a water change in 3-4 days',
      'Monitor nitrate levels closely',
    ],
  );

  final testMaintenanceEvents = [
    MaintenanceEvent(
      id: 'event1',
      aquariumId: testAquariumId,
      type: 'water_change',
      title: 'Water Change',
      description: '25% water change',
      date: DateTime(2024, 1, 15),
      completed: true,
      notes: 'Changed 25 gallons',
    ),
    MaintenanceEvent(
      id: 'event2',
      aquariumId: testAquariumId,
      type: 'filter_clean',
      title: 'Filter Cleaning',
      description: 'Clean canister filter',
      date: DateTime(2024, 1, 20),
      completed: true,
      notes: 'Replaced filter media',
    ),
  ];

  setUp(() {
    mockApiClient = MockApiClient();
    service = AnalyticsService(apiClient: mockApiClient);
  });

  group('AnalyticsService', () {
    group('getAquariumAnalytics', () {
      test('successfully fetches aquarium analytics', () async {
        // Arrange
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId',
              queryParameters: {
                'startDate': testStartDate.toIso8601String(),
                'endDate': testEndDate.toIso8601String(),
                'period': 'month',
              },
            )).thenAnswer((_) async => Response(
                  data: testAquariumAnalytics.toJson(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getAquariumAnalytics(
          aquariumId: testAquariumId,
          startDate: testStartDate,
          endDate: testEndDate,
          period: 'month',
        );

        // Assert
        expect(result.aquariumId, testAquariumId);
        expect(result.healthScore.current, 85.5);
        expect(result.parameterSummary.temperature.average, 78.2);
        expect(result.maintenanceStats.completionRate, 92.0);
      });

      test('fetches analytics without date filters', () async {
        // Arrange
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId',
              queryParameters: {},
            )).thenAnswer((_) async => Response(
                  data: testAquariumAnalytics.toJson(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getAquariumAnalytics(
          aquariumId: testAquariumId,
        );

        // Assert
        expect(result.aquariumId, testAquariumId);
      });

      test('handles 404 error correctly', () async {
        // Arrange
        when(() => mockApiClient.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              response: Response(
                statusCode: 404,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Analytics data not found'))),
        );
      });
    });

    group('getParameterTrends', () {
      test('successfully fetches parameter trends', () async {
        // Arrange
        const parameterIds = ['temperature', 'ph'];
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId/parameters',
              queryParameters: {
                'parameterIds': parameterIds.join(','),
                'startDate': testStartDate.toIso8601String(),
                'endDate': testEndDate.toIso8601String(),
              },
            )).thenAnswer((_) async => Response(
                  data: testParameterTrends.map((t) => t.toJson()).toList(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getParameterTrends(
          aquariumId: testAquariumId,
          parameterIds: parameterIds,
          startDate: testStartDate,
          endDate: testEndDate,
        );

        // Assert
        expect(result.length, 2);
        expect(result[0].parameterId, 'temperature');
        expect(result[0].average, 78.2);
        expect(result[1].parameterId, 'ph');
        expect(result[1].average, 7.2);
      });

      test('handles empty parameter trends', () async {
        // Arrange
        when(() => mockApiClient.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response(
                  data: [],
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getParameterTrends(
          aquariumId: testAquariumId,
          parameterIds: ['temperature'],
        );

        // Assert
        expect(result, isEmpty);
      });
    });

    group('getHealthScoreTrend', () {
      test('successfully fetches health score trend', () async {
        // Arrange
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId/health-score',
              queryParameters: {
                'startDate': testStartDate.toIso8601String(),
                'endDate': testEndDate.toIso8601String(),
              },
            )).thenAnswer((_) async => Response(
                  data: testHealthScoreTrend.toJson(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getHealthScoreTrend(
          aquariumId: testAquariumId,
          startDate: testStartDate,
          endDate: testEndDate,
        );

        // Assert
        expect(result.aquariumId, testAquariumId);
        expect(result.average, 83.0);
        expect(result.trend, 5.5);
        expect(result.prediction?.nextWeek, 87.0);
      });
    });

    group('getParameterCorrelations', () {
      test('successfully fetches parameter correlations', () async {
        // Arrange
        const parameterId = 'temperature';
        final correlations = {
          'ph': 0.75,
          'ammonia': -0.45,
          'nitrite': -0.30,
          'nitrate': 0.20,
        };

        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId/correlations/$parameterId',
            )).thenAnswer((_) async => Response(
                  data: correlations,
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getParameterCorrelations(
          aquariumId: testAquariumId,
          parameterId: parameterId,
        );

        // Assert
        expect(result['ph'], 0.75);
        expect(result['ammonia'], -0.45);
        expect(result.length, 4);
      });
    });

    group('getPredictiveAnalysis', () {
      test('successfully fetches predictive analysis', () async {
        // Arrange
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId/predictions',
              queryParameters: {
                'daysAhead': 7,
              },
            )).thenAnswer((_) async => Response(
                  data: testPredictiveAnalysis.toJson(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getPredictiveAnalysis(
          aquariumId: testAquariumId,
          daysAhead: 7,
        );

        // Assert
        expect(result.aquariumId, testAquariumId);
        expect(result.predictions.length, 1);
        expect(result.alerts.length, 1);
        expect(result.recommendations.length, 2);
      });

      test('uses default days ahead when not specified', () async {
        // Arrange
        when(() => mockApiClient.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response(
                  data: testPredictiveAnalysis.toJson(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        await service.getPredictiveAnalysis(aquariumId: testAquariumId);

        // Assert
        verify(() => mockApiClient.get(
              any(),
              queryParameters: {'daysAhead': 7},
            )).called(1);
      });
    });

    group('getMaintenanceHistory', () {
      test('successfully fetches maintenance history', () async {
        // Arrange
        when(() => mockApiClient.get(
              '/analytics/aquarium/$testAquariumId/maintenance',
              queryParameters: {
                'startDate': testStartDate.toIso8601String(),
                'endDate': testEndDate.toIso8601String(),
              },
            )).thenAnswer((_) async => Response(
                  data: testMaintenanceEvents.map((e) => e.toJson()).toList(),
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getMaintenanceHistory(
          aquariumId: testAquariumId,
          startDate: testStartDate,
          endDate: testEndDate,
        );

        // Assert
        expect(result.length, 2);
        expect(result[0].type, 'water_change');
        expect(result[1].type, 'filter_clean');
      });
    });

    group('Error handling', () {
      test('handles connection timeout', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              requestOptions: RequestOptions(),
              type: DioExceptionType.connectionTimeout,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Connection timeout'))),
        );
      });

      test('handles no internet connection', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              requestOptions: RequestOptions(),
              type: DioExceptionType.connectionError,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('No internet connection'))),
        );
      });

      test('handles unauthorized error', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              response: Response(
                statusCode: 401,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Unauthorized'))),
        );
      });

      test('handles server error with message', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              response: Response(
                statusCode: 500,
                data: {'message': 'Database connection failed'},
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Server error: Database connection failed'))),
        );
      });

      test('handles invalid request error', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              response: Response(
                statusCode: 400,
                data: {'message': 'Invalid date range'},
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Invalid request: Invalid date range'))),
        );
      });

      test('handles access denied error', () async {
        // Arrange
        when(() => mockApiClient.get(any(), queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
              response: Response(
                statusCode: 403,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquariumAnalytics(aquariumId: testAquariumId),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Access denied'))),
        );
      });
    });
  });
}