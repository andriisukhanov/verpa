import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../../../lib/features/aquarium/services/aquarium_service.dart';
import '../../../lib/features/aquarium/models/aquarium_model.dart';
import '../../../lib/core/api/api_client.dart';
import '../../../lib/core/storage/storage_service.dart';

@GenerateMocks([ApiClient, StorageService, http.MultipartRequest])
import 'aquarium_service_test.mocks.dart';

void main() {
  late AquariumService aquariumService;
  late MockApiClient mockApiClient;
  late MockStorageService mockStorageService;

  setUp(() {
    mockApiClient = MockApiClient();
    mockStorageService = MockStorageService();
    aquariumService = AquariumService();
    // Inject mocks
    aquariumService.apiClient = mockApiClient;
    aquariumService.storageService = mockStorageService;
  });

  group('AquariumService', () {
    group('getAquariums', () {
      test('should return list of aquariums on success', () async {
        // Arrange
        final mockResponse = [
          {
            'id': '1',
            'name': 'Test Aquarium',
            'type': 'freshwater',
            'volume': 100.0,
            'volumeUnit': 'liters',
            'createdAt': DateTime.now().toIso8601String(),
            'updatedAt': DateTime.now().toIso8601String(),
          }
        ];

        when(mockApiClient.get('/aquariums')).thenAnswer(
          (_) async => {'data': mockResponse},
        );

        // Act
        final result = await aquariumService.getAquariums();

        // Assert
        expect(result, hasLength(1));
        expect(result[0].name, 'Test Aquarium');
        expect(result[0].type, WaterType.freshwater);
        verify(mockApiClient.get('/aquariums')).called(1);
      });

      test('should throw exception on API error', () async {
        // Arrange
        when(mockApiClient.get('/aquariums')).thenThrow(
          Exception('Network error'),
        );

        // Act & Assert
        expect(
          () => aquariumService.getAquariums(),
          throwsException,
        );
      });
    });

    group('createAquarium', () {
      test('should create aquarium successfully', () async {
        // Arrange
        final newAquarium = Aquarium(
          id: '',
          name: 'New Tank',
          type: WaterType.freshwater,
          volume: 200,
          volumeUnit: VolumeUnit.liters,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        final mockResponse = {
          'id': '123',
          'name': 'New Tank',
          'type': 'freshwater',
          'volume': 200.0,
          'volumeUnit': 'liters',
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        };

        when(mockApiClient.post('/aquariums', body: anyNamed('body')))
            .thenAnswer((_) async => {'data': mockResponse});

        // Act
        final result = await aquariumService.createAquarium(newAquarium);

        // Assert
        expect(result.id, '123');
        expect(result.name, 'New Tank');
        verify(mockApiClient.post('/aquariums', body: anyNamed('body')))
            .called(1);
      });

      test('should handle image upload when creating aquarium', () async {
        // Arrange
        final newAquarium = Aquarium(
          id: '',
          name: 'New Tank',
          type: WaterType.freshwater,
          volume: 200,
          volumeUnit: VolumeUnit.liters,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        final mockImagePath = '/path/to/image.jpg';
        final mockImageUrl = 'https://storage.example.com/image.jpg';

        when(mockApiClient.uploadFile(
          any,
          any,
          field: anyNamed('field'),
          method: anyNamed('method'),
          data: anyNamed('data'),
        )).thenAnswer((_) async => {'imageUrl': mockImageUrl});

        // Act
        await aquariumService.createAquarium(newAquarium, imagePath: mockImagePath);

        // Assert
        verify(mockApiClient.uploadFile(
          any,
          any,
          field: 'image',
          method: 'POST',
          data: anyNamed('data'),
        )).called(1);
      });
    });

    group('updateAquarium', () {
      test('should update aquarium successfully', () async {
        // Arrange
        final aquarium = Aquarium(
          id: '123',
          name: 'Updated Tank',
          type: WaterType.marine,
          volume: 300,
          volumeUnit: VolumeUnit.gallons,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(mockApiClient.put('/aquariums/123', body: anyNamed('body')))
            .thenAnswer((_) async => {'data': aquarium.toJson()});

        // Act
        final result = await aquariumService.updateAquarium(aquarium);

        // Assert
        expect(result.name, 'Updated Tank');
        expect(result.type, WaterType.marine);
        verify(mockApiClient.put('/aquariums/123', body: anyNamed('body')))
            .called(1);
      });
    });

    group('deleteAquarium', () {
      test('should delete aquarium successfully', () async {
        // Arrange
        when(mockApiClient.delete('/aquariums/123'))
            .thenAnswer((_) async => {});

        // Act
        await aquariumService.deleteAquarium('123');

        // Assert
        verify(mockApiClient.delete('/aquariums/123')).called(1);
      });
    });

    group('recordParameters', () {
      test('should record water parameters successfully', () async {
        // Arrange
        final parameters = WaterParameters(
          temperature: 25.5,
          ph: 7.2,
          ammonia: 0.0,
          nitrite: 0.0,
          nitrate: 10.0,
          recordedAt: DateTime.now(),
        );

        when(mockApiClient.post(
          '/aquariums/123/parameters',
          body: anyNamed('body'),
        )).thenAnswer((_) async => {'data': parameters.toJson()});

        // Act
        await aquariumService.recordParameters('123', parameters);

        // Assert
        verify(mockApiClient.post(
          '/aquariums/123/parameters',
          body: anyNamed('body'),
        )).called(1);
      });

      test('should cache parameters locally', () async {
        // Arrange
        final parameters = WaterParameters(
          temperature: 25.5,
          ph: 7.2,
          recordedAt: DateTime.now(),
        );

        when(mockApiClient.post(any, body: anyNamed('body')))
            .thenAnswer((_) async => {'data': parameters.toJson()});
        when(mockStorageService.setString(any, any))
            .thenAnswer((_) async => true);

        // Act
        await aquariumService.recordParameters('123', parameters);

        // Assert
        verify(mockStorageService.setString(
          'aquarium_123_latest_parameters',
          any,
        )).called(1);
      });
    });

    group('getParameterHistory', () {
      test('should fetch parameter history', () async {
        // Arrange
        final mockHistory = [
          {
            'temperature': 25.0,
            'ph': 7.0,
            'recordedAt': DateTime.now().subtract(Duration(days: 1)).toIso8601String(),
          },
          {
            'temperature': 26.0,
            'ph': 7.2,
            'recordedAt': DateTime.now().toIso8601String(),
          },
        ];

        when(mockApiClient.get('/aquariums/123/parameters/history'))
            .thenAnswer((_) async => {'data': mockHistory});

        // Act
        final result = await aquariumService.getParameterHistory('123');

        // Assert
        expect(result, hasLength(2));
        expect(result[0].temperature, 25.0);
        expect(result[1].temperature, 26.0);
      });
    });

    group('addInhabitant', () {
      test('should add inhabitant successfully', () async {
        // Arrange
        final inhabitant = Inhabitant(
          id: '',
          species: 'Neon Tetra',
          quantity: 10,
          type: InhabitantType.fish,
          addedDate: DateTime.now(),
        );

        final mockResponse = {
          'id': 'inhabitant123',
          'species': 'Neon Tetra',
          'quantity': 10,
          'type': 'fish',
          'addedDate': DateTime.now().toIso8601String(),
        };

        when(mockApiClient.post(
          '/aquariums/123/inhabitants',
          body: anyNamed('body'),
        )).thenAnswer((_) async => {'data': mockResponse});

        // Act
        final result = await aquariumService.addInhabitant('123', inhabitant);

        // Assert
        expect(result.id, 'inhabitant123');
        expect(result.species, 'Neon Tetra');
      });
    });

    group('addEquipment', () {
      test('should add equipment successfully', () async {
        // Arrange
        final equipment = Equipment(
          id: '',
          name: 'Fluval FX6',
          type: EquipmentType.filter,
          brand: 'Fluval',
          model: 'FX6',
          installedDate: DateTime.now(),
        );

        final mockResponse = {
          'id': 'equipment123',
          'name': 'Fluval FX6',
          'type': 'filter',
          'brand': 'Fluval',
          'model': 'FX6',
          'installedDate': DateTime.now().toIso8601String(),
        };

        when(mockApiClient.post(
          '/aquariums/123/equipment',
          body: anyNamed('body'),
        )).thenAnswer((_) async => {'data': mockResponse});

        // Act
        final result = await aquariumService.addEquipment('123', equipment);

        // Assert
        expect(result.id, 'equipment123');
        expect(result.name, 'Fluval FX6');
      });
    });

    group('getAquariumHealth', () {
      test('should calculate aquarium health score', () async {
        // Arrange
        final aquarium = Aquarium(
          id: '123',
          name: 'Test Tank',
          type: WaterType.freshwater,
          volume: 100,
          volumeUnit: VolumeUnit.liters,
          parameters: WaterParameters(
            temperature: 25.0,
            ph: 7.0,
            ammonia: 0.0,
            nitrite: 0.0,
            nitrate: 10.0,
            recordedAt: DateTime.now(),
          ),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(mockApiClient.get('/aquariums/123'))
            .thenAnswer((_) async => {'data': aquarium.toJson()});

        // Act
        final health = await aquariumService.getAquariumHealth('123');

        // Assert
        expect(health.score, greaterThanOrEqualTo(0));
        expect(health.score, lessThanOrEqualTo(100));
        expect(health.status, isNotEmpty);
      });
    });
  });
}