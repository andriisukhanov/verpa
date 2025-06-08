import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:verpa/core/api/api_client.dart';
import 'package:verpa/core/storage/storage_service.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/services/aquarium_service.dart';

// Mock classes
class MockApiClient extends Mock implements ApiClient {}
class MockStorageService extends Mock implements StorageService {}
class MockResponse extends Mock implements Response {}

// Fake classes
class FakeFormData extends Fake implements FormData {}
class FakeOptions extends Fake implements Options {}

void main() {
  late AquariumService service;
  late MockApiClient mockApiClient;
  late MockStorageService mockStorageService;

  // Test data
  final testAquarium = Aquarium(
    id: 'aquarium1',
    name: 'Test Tank',
    type: AquariumType.freshwater,
    volume: 100,
    volumeUnit: VolumeUnit.liters,
    dimensions: const Dimensions(
      length: 100,
      width: 40,
      height: 50,
    ),
    waterType: WaterType.freshwater,
    description: 'Test aquarium',
    location: 'Living Room',
    equipment: [],
    inhabitants: [],
    waterParameters: [],
    healthScore: 85,
    isActive: true,
    createdAt: DateTime(2024, 1, 1),
    updatedAt: DateTime(2024, 1, 1),
  );

  final testEquipment = Equipment(
    id: 'eq1',
    name: 'Test Filter',
    type: EquipmentType.filter,
    brand: 'TestBrand',
    model: 'TestModel',
    purchaseDate: DateTime.now(),
    isActive: true,
  );

  final testInhabitant = Inhabitant(
    id: 'inh1',
    species: 'Test Fish',
    commonName: 'Testy',
    category: InhabitantCategory.fish,
    quantity: 1,
    addedDate: DateTime.now(),
    healthStatus: 'Healthy',
  );

  final testParameters = WaterParameters(
    temperature: 78.0,
    ph: 7.2,
    ammonia: 0.0,
    nitrite: 0.0,
    nitrate: 10.0,
    recordedAt: DateTime.now(),
  );

  setUpAll(() {
    registerFallbackValue(FakeFormData());
    registerFallbackValue(FakeOptions());
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockStorageService = MockStorageService();
    service = AquariumService(
      apiClient: mockApiClient,
      storageService: mockStorageService,
    );
  });

  group('AquariumService', () {
    group('getMyAquariums', () {
      test('successfully fetches and caches aquariums', () async {
        // Arrange
        when(() => mockApiClient.get('/aquariums/my-aquariums'))
            .thenAnswer((_) async => Response(
                  data: {
                    'aquariums': [testAquarium.toJson()],
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.cacheData(
              any(),
              any(),
              ttl: any(named: 'ttl'),
            )).thenAnswer((_) async {});

        // Act
        final result = await service.getMyAquariums();

        // Assert
        expect(result.length, 1);
        expect(result.first.id, testAquarium.id);
        verify(() => mockStorageService.cacheData(
              'my_aquariums',
              any(),
              ttl: const Duration(hours: 1),
            )).called(1);
      });

      test('returns cached data when network fails', () async {
        // Arrange
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              requestOptions: RequestOptions(),
              type: DioExceptionType.connectionTimeout,
            ));
        when(() => mockStorageService.getCachedData('my_aquariums'))
            .thenAnswer((_) async => {
                  'aquariums': [testAquarium.toJson()],
                });

        // Act
        final result = await service.getMyAquariums();

        // Assert
        expect(result.length, 1);
        expect(result.first.id, testAquarium.id);
      });

      test('throws exception when network fails and no cache', () async {
        // Arrange
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              requestOptions: RequestOptions(),
              type: DioExceptionType.connectionTimeout,
            ));
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);

        // Act & Assert
        expect(
          () => service.getMyAquariums(),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('getAquarium', () {
      test('returns cached aquarium if available', () async {
        // Arrange
        when(() => mockStorageService.getCachedData('aquarium_${testAquarium.id}'))
            .thenAnswer((_) async => testAquarium.toJson());

        // Act
        final result = await service.getAquarium(testAquarium.id);

        // Assert
        expect(result.id, testAquarium.id);
        verifyNever(() => mockApiClient.get(any()));
      });

      test('fetches and caches aquarium when not in cache', () async {
        // Arrange
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);
        when(() => mockApiClient.get('/aquariums/${testAquarium.id}'))
            .thenAnswer((_) async => Response(
                  data: {
                    'aquarium': testAquarium.toJson(),
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.cacheData(
              any(),
              any(),
              ttl: any(named: 'ttl'),
            )).thenAnswer((_) async {});

        // Act
        final result = await service.getAquarium(testAquarium.id);

        // Assert
        expect(result.id, testAquarium.id);
        verify(() => mockStorageService.cacheData(
              'aquarium_${testAquarium.id}',
              any(),
              ttl: const Duration(hours: 1),
            )).called(1);
      });

      test('handles 404 error correctly', () async {
        // Arrange
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              response: Response(
                statusCode: 404,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.getAquarium('nonexistent'),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Aquarium not found'))),
        );
      });
    });

    group('createAquarium', () {
      test('successfully creates aquarium and clears cache', () async {
        // Arrange
        final createData = {
          'name': testAquarium.name,
          'type': testAquarium.type.value,
          'volume': testAquarium.volume,
          'volumeUnit': testAquarium.volumeUnit,
          'dimensions': testAquarium.dimensions.toJson(),
          'waterType': testAquarium.waterType.value,
          'description': testAquarium.description,
          'location': testAquarium.location,
          'imageUrl': null,
        };

        when(() => mockApiClient.post('/aquariums', data: createData))
            .thenAnswer((_) async => Response(
                  data: {
                    'aquarium': testAquarium.toJson(),
                  },
                  statusCode: 201,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.clearCache()).thenAnswer((_) async {});

        // Act
        final result = await service.createAquarium(
          name: testAquarium.name,
          type: testAquarium.type,
          volume: testAquarium.volume,
          volumeUnit: testAquarium.volumeUnit.toString(),
          dimensions: testAquarium.dimensions,
          waterType: testAquarium.waterType,
          description: testAquarium.description,
          location: testAquarium.location,
        );

        // Assert
        expect(result.id, testAquarium.id);
        verify(() => mockStorageService.clearCache()).called(1);
      });

      test('handles duplicate name error', () async {
        // Arrange
        when(() => mockApiClient.post(any(), data: any(named: 'data')))
            .thenThrow(DioException(
              response: Response(
                statusCode: 409,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.createAquarium(
            name: 'Duplicate',
            type: AquariumType.freshwater,
            volume: 100,
            volumeUnit: 'liters',
            dimensions: const Dimensions(length: 100, width: 40, height: 50),
            waterType: WaterType.freshwater,
          ),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Aquarium with this name already exists'))),
        );
      });
    });

    group('updateAquarium', () {
      test('successfully updates aquarium and updates cache', () async {
        // Arrange
        final updates = {'name': 'Updated Tank'};
        final updatedAquarium = testAquarium.copyWith(name: 'Updated Tank');

        when(() => mockApiClient.put('/aquariums/${testAquarium.id}', data: updates))
            .thenAnswer((_) async => Response(
                  data: {
                    'aquarium': updatedAquarium.toJson(),
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.cacheData(
              any(),
              any(),
              ttl: any(named: 'ttl'),
            )).thenAnswer((_) async {});
        when(() => mockStorageService.clearCache()).thenAnswer((_) async {});

        // Act
        final result = await service.updateAquarium(testAquarium.id, updates);

        // Assert
        expect(result.name, 'Updated Tank');
        verify(() => mockStorageService.cacheData(
              'aquarium_${testAquarium.id}',
              any(),
              ttl: const Duration(hours: 1),
            )).called(1);
        verify(() => mockStorageService.clearCache()).called(1);
      });
    });

    group('deleteAquarium', () {
      test('successfully deletes aquarium and clears cache', () async {
        // Arrange
        when(() => mockApiClient.delete('/aquariums/${testAquarium.id}'))
            .thenAnswer((_) async => Response(
                  statusCode: 204,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.clearCache()).thenAnswer((_) async {});

        // Act
        await service.deleteAquarium(testAquarium.id);

        // Assert
        verify(() => mockApiClient.delete('/aquariums/${testAquarium.id}')).called(1);
        verify(() => mockStorageService.clearCache()).called(1);
      });

      test('handles unauthorized deletion', () async {
        // Arrange
        when(() => mockApiClient.delete(any()))
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
          () => service.deleteAquarium(testAquarium.id),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Access denied'))),
        );
      });
    });

    group('addEquipment', () {
      test('successfully adds equipment and updates cache', () async {
        // Arrange
        final updatedAquarium = testAquarium.copyWith(
          equipment: [...testAquarium.equipment, testEquipment],
        );

        when(() => mockApiClient.post(
              '/aquariums/${testAquarium.id}/equipment',
              data: testEquipment.toJson(),
            )).thenAnswer((_) async => Response(
                  data: {
                    'aquarium': updatedAquarium.toJson(),
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.cacheData(
              any(),
              any(),
              ttl: any(named: 'ttl'),
            )).thenAnswer((_) async {});

        // Act
        final result = await service.addEquipment(testAquarium.id, testEquipment);

        // Assert
        expect(result.equipment.length, 1);
        expect(result.equipment.first.id, testEquipment.id);
      });
    });

    group('addInhabitant', () {
      test('successfully adds inhabitant and updates cache', () async {
        // Arrange
        final updatedAquarium = testAquarium.copyWith(
          inhabitants: [...testAquarium.inhabitants, testInhabitant],
        );

        when(() => mockApiClient.post(
              '/aquariums/${testAquarium.id}/inhabitants',
              data: testInhabitant.toJson(),
            )).thenAnswer((_) async => Response(
                  data: {
                    'aquarium': updatedAquarium.toJson(),
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.cacheData(
              any(),
              any(),
              ttl: any(named: 'ttl'),
            )).thenAnswer((_) async {});

        // Act
        final result = await service.addInhabitant(testAquarium.id, testInhabitant);

        // Assert
        expect(result.inhabitants.length, 1);
        expect(result.inhabitants.first.id, testInhabitant.id);
      });
    });

    group('recordParameters', () {
      test('successfully records parameters and clears cache', () async {
        // Arrange
        when(() => mockApiClient.post(
              '/aquariums/${testAquarium.id}/parameters',
              data: testParameters.toJson(),
            )).thenAnswer((_) async => Response(
                  data: {
                    'parameters': testParameters.toJson(),
                  },
                  statusCode: 201,
                  requestOptions: RequestOptions(),
                ));
        when(() => mockStorageService.clearCache()).thenAnswer((_) async {});

        // Act
        final result = await service.recordParameters(testAquarium.id, testParameters);

        // Assert
        expect(result.temperature, testParameters.temperature);
        expect(result.ph, testParameters.ph);
        verify(() => mockStorageService.clearCache()).called(1);
      });

      test('handles validation error for invalid parameters', () async {
        // Arrange
        when(() => mockApiClient.post(any(), data: any(named: 'data')))
            .thenThrow(DioException(
              response: Response(
                data: {'message': 'Invalid parameter values'},
                statusCode: 400,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.recordParameters(testAquarium.id, testParameters),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Invalid parameter values'))),
        );
      });
    });

    group('getParameterHistory', () {
      test('successfully fetches parameter history with filters', () async {
        // Arrange
        final startDate = DateTime(2024, 1, 1);
        final endDate = DateTime(2024, 1, 31);
        final parameters = [testParameters];

        when(() => mockApiClient.get(
              '/aquariums/${testAquarium.id}/parameters',
              queryParameters: {
                'limit': 50,
                'startDate': startDate.toIso8601String(),
                'endDate': endDate.toIso8601String(),
              },
            )).thenAnswer((_) async => Response(
                  data: {
                    'parameters': parameters.map((p) => p.toJson()).toList(),
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getParameterHistory(
          testAquarium.id,
          startDate: startDate,
          endDate: endDate,
        );

        // Assert
        expect(result.length, 1);
        expect(result.first.temperature, testParameters.temperature);
      });

      test('handles empty parameter history', () async {
        // Arrange
        when(() => mockApiClient.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response(
                  data: {
                    'parameters': [],
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.getParameterHistory(testAquarium.id);

        // Assert
        expect(result, isEmpty);
      });
    });

    group('uploadImage', () {
      test('successfully uploads image file', () async {
        // Arrange
        const filePath = '/path/to/image.jpg';
        const imageUrl = 'https://example.com/image.jpg';

        when(() => mockApiClient.post(
              '/media/upload',
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => Response(
                  data: {
                    'url': imageUrl,
                  },
                  statusCode: 200,
                  requestOptions: RequestOptions(),
                ));

        // Act
        final result = await service.uploadImage(filePath);

        // Assert
        expect(result, imageUrl);
      });

      test('handles file upload error', () async {
        // Arrange
        when(() => mockApiClient.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenThrow(DioException(
              response: Response(
                statusCode: 413,
                data: {'message': 'File too large'},
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));

        // Act & Assert
        expect(
          () => service.uploadImage('/path/to/large-image.jpg'),
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('File too large'))),
        );
      });

      test('handles invalid file type', () async {
        // Act & Assert
        expect(
          () => service.uploadImage(123), // Invalid type
          throwsA(predicate((e) =>
              e is Exception && e.toString().contains('Invalid file type'))),
        );
      });
    });

    group('Error handling', () {
      test('handles network timeout correctly', () async {
        // Arrange
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              requestOptions: RequestOptions(),
              type: DioExceptionType.connectionTimeout,
            ));
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);

        // Act & Assert
        expect(
          () => service.getMyAquariums(),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Connection timeout'))),
        );
      });

      test('handles server error correctly', () async {
        // Arrange
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              response: Response(
                statusCode: 500,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);

        // Act & Assert
        expect(
          () => service.getMyAquariums(),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Server error'))),
        );
      });

      test('handles unauthorized error correctly', () async {
        // Arrange
        when(() => mockApiClient.get(any()))
            .thenThrow(DioException(
              response: Response(
                statusCode: 401,
                requestOptions: RequestOptions(),
              ),
              requestOptions: RequestOptions(),
              type: DioExceptionType.badResponse,
            ));
        when(() => mockStorageService.getCachedData(any()))
            .thenAnswer((_) async => null);

        // Act & Assert
        expect(
          () => service.getMyAquariums(),
          throwsA(predicate((e) =>
              e is Exception &&
              e.toString().contains('Unauthorized'))),
        );
      });
    });
  });
}