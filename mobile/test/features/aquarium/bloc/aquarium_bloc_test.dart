import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:verpa/features/aquarium/bloc/aquarium_bloc.dart';
import 'package:verpa/features/aquarium/bloc/aquarium_event.dart';
import 'package:verpa/features/aquarium/bloc/aquarium_state.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/services/aquarium_service.dart';
import 'package:verpa/features/notifications/services/aquarium_notification_service.dart';
import 'package:verpa/shared/services/notification_service.dart';

// Mock classes
class MockAquariumService extends Mock implements AquariumService {}
class MockNotificationService extends Mock implements NotificationService {}
class MockAquariumNotificationService extends Mock implements AquariumNotificationService {}

// Fake classes for registerFallbackValue
class FakeAquarium extends Fake implements Aquarium {}
class FakeEquipment extends Fake implements Equipment {}
class FakeInhabitant extends Fake implements Inhabitant {}
class FakeWaterParameters extends Fake implements WaterParameters {}

void main() {
  late AquariumBloc bloc;
  late MockAquariumService mockAquariumService;

  // Sample test data
  final testAquarium = Aquarium(
    id: 'aquarium1',
    name: 'Test Tank',
    type: AquariumType.freshwater,
    volume: 100,
    volumeUnit: VolumeUnit.liters,
    dimensions: const Dimensions(length: 100, width: 40, height: 50),
    waterType: WaterType.freshwater,
    description: 'Test aquarium',
    location: 'Living room',
    imageUrl: 'https://example.com/image.jpg',
    equipment: [],
    inhabitants: [],
    waterParameters: [],
    healthScore: 85,
    lastMaintenance: DateTime.now().subtract(const Duration(days: 7)),
    maintenanceDue: false,
    isActive: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  final testEquipment = Equipment(
    id: 'equipment1',
    name: 'Filter',
    type: EquipmentType.filter,
    brand: 'Fluval',
    model: 'FX6',
    power: 20,
    isActive: true,
    installedDate: DateTime.now().subtract(const Duration(days: 30)),
    nextMaintenanceDate: DateTime.now().add(const Duration(days: 30)),
  );

  final testInhabitant = Inhabitant(
    id: 'inhabitant1',
    name: 'Neon Tetra School',
    species: 'Paracheirodon innesi',
    scientificName: 'Paracheirodon innesi',
    type: InhabitantType.fish,
    quantity: 10,
    addedDate: DateTime.now().subtract(const Duration(days: 14)),
    healthStatus: HealthStatus.healthy,
    notes: 'Schooling fish',
  );

  final testParameters = WaterParameters(
    temperature: 25.5,
    ph: 7.2,
    ammonia: 0.0,
    nitrite: 0.0,
    nitrate: 10.0,
    phosphate: 0.5,
    gh: 8,
    kh: 6,
    recordedAt: DateTime.now(),
  );

  setUpAll(() {
    registerFallbackValue(FakeAquarium());
    registerFallbackValue(FakeEquipment());
    registerFallbackValue(FakeInhabitant());
    registerFallbackValue(FakeWaterParameters());
  });

  setUp(() {
    mockAquariumService = MockAquariumService();
    bloc = AquariumBloc(aquariumService: mockAquariumService);
  });

  tearDown(() {
    bloc.close();
  });

  group('AquariumBloc', () {
    test('initial state is AquariumInitial', () {
      expect(bloc.state, isA<AquariumInitial>());
    });

    group('AquariumsLoadRequested', () {
      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumsLoading, AquariumsLoaded] when aquariums are loaded successfully',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => [testAquarium]);
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumsLoadRequested()),
        expect: () => [
          AquariumsLoading(),
          isA<AquariumsLoaded>()
              .having((state) => state.aquariums.length, 'aquariums length', 1)
              .having((state) => state.aquariums.first.id, 'first aquarium id', 'aquarium1'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumsLoading, AquariumEmpty] when no aquariums exist',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => []);
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumsLoadRequested()),
        expect: () => [
          AquariumsLoading(),
          const AquariumEmpty(),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumsLoading, AquariumError] when loading fails',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenThrow(Exception('Network error'));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumsLoadRequested()),
        expect: () => [
          AquariumsLoading(),
          isA<AquariumError>()
              .having((state) => state.message, 'error message', 'Network error'),
        ],
      );
    });

    group('AquariumLoadRequested', () {
      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumLoading, AquariumLoaded] when aquarium is loaded successfully',
        build: () {
          when(() => mockAquariumService.getAquarium('aquarium1'))
              .thenAnswer((_) async => testAquarium);
          return bloc;
        },
        act: (bloc) => bloc.add(const AquariumLoadRequested(aquariumId: 'aquarium1')),
        expect: () => [
          AquariumLoading(),
          isA<AquariumLoaded>()
              .having((state) => state.aquarium.id, 'aquarium id', 'aquarium1'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumLoading, AquariumError] when loading fails',
        build: () {
          when(() => mockAquariumService.getAquarium('aquarium1'))
              .thenThrow(Exception('Not found'));
          return bloc;
        },
        act: (bloc) => bloc.add(const AquariumLoadRequested(aquariumId: 'aquarium1')),
        expect: () => [
          AquariumLoading(),
          isA<AquariumError>()
              .having((state) => state.message, 'error message', 'Not found'),
        ],
      );
    });

    group('AquariumCreateRequested', () {
      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumCreating, AquariumCreated, AquariumsLoading] when creation succeeds',
        build: () {
          when(() => mockAquariumService.createAquarium(
                name: any(named: 'name'),
                type: any(named: 'type'),
                volume: any(named: 'volume'),
                volumeUnit: any(named: 'volumeUnit'),
                dimensions: any(named: 'dimensions'),
                waterType: any(named: 'waterType'),
                description: any(named: 'description'),
                location: any(named: 'location'),
                imageUrl: any(named: 'imageUrl'),
              )).thenAnswer((_) async => testAquarium);
          
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => [testAquarium]);
          
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumCreateRequested(
          name: 'Test Tank',
          type: AquariumType.freshwater,
          volume: 100,
          volumeUnit: VolumeUnit.liters,
          dimensions: const Dimensions(length: 100, width: 40, height: 50),
          waterType: WaterType.freshwater,
          description: 'Test aquarium',
          location: 'Living room',
        )),
        expect: () => [
          AquariumCreating(),
          isA<AquariumCreated>()
              .having((state) => state.aquarium.name, 'aquarium name', 'Test Tank'),
          AquariumsLoading(),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'handles image upload during creation',
        build: () {
          when(() => mockAquariumService.uploadImage('path/to/image.jpg'))
              .thenAnswer((_) async => 'https://example.com/uploaded.jpg');
          
          when(() => mockAquariumService.createAquarium(
                name: any(named: 'name'),
                type: any(named: 'type'),
                volume: any(named: 'volume'),
                volumeUnit: any(named: 'volumeUnit'),
                dimensions: any(named: 'dimensions'),
                waterType: any(named: 'waterType'),
                description: any(named: 'description'),
                location: any(named: 'location'),
                imageUrl: any(named: 'imageUrl'),
              )).thenAnswer((_) async => testAquarium);
          
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => [testAquarium]);
          
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumCreateRequested(
          name: 'Test Tank',
          type: AquariumType.freshwater,
          volume: 100,
          volumeUnit: VolumeUnit.liters,
          dimensions: const Dimensions(length: 100, width: 40, height: 50),
          waterType: WaterType.freshwater,
          imagePath: 'path/to/image.jpg',
        )),
        verify: (_) {
          verify(() => mockAquariumService.uploadImage('path/to/image.jpg')).called(1);
        },
      );

      blocTest<AquariumBloc, AquariumState>(
        'continues without image if upload fails',
        build: () {
          when(() => mockAquariumService.uploadImage(any()))
              .thenThrow(Exception('Upload failed'));
          
          when(() => mockAquariumService.createAquarium(
                name: any(named: 'name'),
                type: any(named: 'type'),
                volume: any(named: 'volume'),
                volumeUnit: any(named: 'volumeUnit'),
                dimensions: any(named: 'dimensions'),
                waterType: any(named: 'waterType'),
                description: any(named: 'description'),
                location: any(named: 'location'),
                imageUrl: any(named: 'imageUrl'),
              )).thenAnswer((_) async => testAquarium);
          
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => [testAquarium]);
          
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumCreateRequested(
          name: 'Test Tank',
          type: AquariumType.freshwater,
          volume: 100,
          volumeUnit: VolumeUnit.liters,
          dimensions: const Dimensions(length: 100, width: 40, height: 50),
          waterType: WaterType.freshwater,
          imagePath: 'path/to/image.jpg',
        )),
        expect: () => [
          AquariumCreating(),
          isA<AquariumCreated>(),
          AquariumsLoading(),
        ],
      );
    });

    group('AquariumUpdateRequested', () {
      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumUpdating, AquariumUpdated] when update succeeds',
        build: () {
          when(() => mockAquariumService.updateAquarium('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(name: 'Updated Tank'));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumUpdateRequested(
          aquariumId: 'aquarium1',
          updates: {'name': 'Updated Tank'},
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.aquarium.name, 'updated name', 'Updated Tank'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'updates list when in AquariumsLoaded state',
        build: () {
          when(() => mockAquariumService.updateAquarium('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(name: 'Updated Tank'));
          return bloc;
        },
        seed: () => AquariumsLoaded(
          aquariums: [testAquarium],
          lastUpdated: DateTime.now(),
        ),
        act: (bloc) => bloc.add(AquariumUpdateRequested(
          aquariumId: 'aquarium1',
          updates: {'name': 'Updated Tank'},
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>(),
          isA<AquariumsLoaded>()
              .having((state) => state.aquariums.first.name, 'updated name in list', 'Updated Tank'),
        ],
      );
    });

    group('AquariumDeleteRequested', () {
      blocTest<AquariumBloc, AquariumState>(
        'emits [AquariumDeleting, AquariumDeleted, AquariumsLoading] when deletion succeeds',
        build: () {
          when(() => mockAquariumService.deleteAquarium('aquarium1'))
              .thenAnswer((_) async {});
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => []);
          return bloc;
        },
        act: (bloc) => bloc.add(const AquariumDeleteRequested(aquariumId: 'aquarium1')),
        expect: () => [
          const AquariumDeleting(aquariumId: 'aquarium1'),
          const AquariumDeleted(aquariumId: 'aquarium1'),
          AquariumsLoading(),
        ],
      );
    });

    group('Equipment Management', () {
      blocTest<AquariumBloc, AquariumState>(
        'adds equipment successfully',
        build: () {
          when(() => mockAquariumService.addEquipment('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(
                    equipment: [testEquipment],
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumEquipmentAddRequested(
          aquariumId: 'aquarium1',
          equipment: testEquipment,
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.aquarium.equipment.length, 'equipment count', 1)
              .having((state) => state.message, 'success message', 'Equipment added successfully!'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'updates equipment successfully',
        build: () {
          when(() => mockAquariumService.updateEquipment('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(
                    equipment: [testEquipment.copyWith(name: 'Updated Filter')],
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumEquipmentUpdateRequested(
          aquariumId: 'aquarium1',
          equipment: testEquipment.copyWith(name: 'Updated Filter'),
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.message, 'success message', 'Equipment updated successfully!'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'removes equipment successfully',
        build: () {
          when(() => mockAquariumService.removeEquipment('aquarium1', 'equipment1'))
              .thenAnswer((_) async => testAquarium.copyWith(equipment: []));
          return bloc;
        },
        act: (bloc) => bloc.add(const AquariumEquipmentRemoveRequested(
          aquariumId: 'aquarium1',
          equipmentId: 'equipment1',
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.aquarium.equipment.length, 'equipment count', 0)
              .having((state) => state.message, 'success message', 'Equipment removed successfully!'),
        ],
      );
    });

    group('Inhabitant Management', () {
      blocTest<AquariumBloc, AquariumState>(
        'adds inhabitant successfully',
        build: () {
          when(() => mockAquariumService.addInhabitant('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(
                    inhabitants: [testInhabitant],
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumInhabitantAddRequested(
          aquariumId: 'aquarium1',
          inhabitant: testInhabitant,
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.aquarium.inhabitants.length, 'inhabitants count', 1)
              .having((state) => state.message, 'success message', 'Inhabitant added successfully!'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'updates inhabitant and triggers health alert for critical status',
        build: () {
          final criticalInhabitant = testInhabitant.copyWith(
            healthStatus: HealthStatus.critical,
          );
          when(() => mockAquariumService.updateInhabitant('aquarium1', any()))
              .thenAnswer((_) async => testAquarium.copyWith(
                    inhabitants: [criticalInhabitant],
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumInhabitantUpdateRequested(
          aquariumId: 'aquarium1',
          inhabitant: testInhabitant.copyWith(healthStatus: HealthStatus.critical),
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.message, 'success message', 'Inhabitant updated successfully!'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'removes inhabitant successfully',
        build: () {
          when(() => mockAquariumService.removeInhabitant('aquarium1', 'inhabitant1'))
              .thenAnswer((_) async => testAquarium.copyWith(inhabitants: []));
          return bloc;
        },
        act: (bloc) => bloc.add(const AquariumInhabitantRemoveRequested(
          aquariumId: 'aquarium1',
          inhabitantId: 'inhabitant1',
        )),
        expect: () => [
          const AquariumUpdating(aquariumId: 'aquarium1'),
          isA<AquariumUpdated>()
              .having((state) => state.aquarium.inhabitants.length, 'inhabitants count', 0)
              .having((state) => state.message, 'success message', 'Inhabitant removed successfully!'),
        ],
      );
    });

    group('Water Parameters', () {
      blocTest<AquariumBloc, AquariumState>(
        'records water parameters successfully',
        build: () {
          when(() => mockAquariumService.recordParameters('aquarium1', any()))
              .thenAnswer((_) async => testParameters);
          when(() => mockAquariumService.getAquarium('aquarium1'))
              .thenAnswer((_) async => testAquarium);
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumParametersRecordRequested(
          aquariumId: 'aquarium1',
          parameters: testParameters,
        )),
        expect: () => [
          const AquariumParameterRecording(aquariumId: 'aquarium1'),
          isA<AquariumParameterRecorded>()
              .having((state) => state.aquariumId, 'aquarium id', 'aquarium1')
              .having((state) => state.parameters.temperature, 'temperature', 25.5),
          AquariumLoading(),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'loads parameter history successfully',
        build: () {
          when(() => mockAquariumService.getParameterHistory(
                'aquarium1',
                startDate: any(named: 'startDate'),
                endDate: any(named: 'endDate'),
                limit: any(named: 'limit'),
              )).thenAnswer((_) async => [testParameters]);
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumParametersHistoryRequested(
          aquariumId: 'aquarium1',
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          endDate: DateTime.now(),
          limit: 100,
        )),
        expect: () => [
          AquariumLoading(),
          isA<AquariumParameterHistoryLoaded>()
              .having((state) => state.aquariumId, 'aquarium id', 'aquarium1')
              .having((state) => state.parameters.length, 'parameters count', 1),
        ],
      );
    });

    group('Selection Management', () {
      blocTest<AquariumBloc, AquariumState>(
        'selects aquarium when in AquariumsLoaded state',
        build: () => bloc,
        seed: () => AquariumsLoaded(
          aquariums: [testAquarium],
          lastUpdated: DateTime.now(),
        ),
        act: (bloc) => bloc.add(AquariumSelected(aquarium: testAquarium)),
        expect: () => [
          isA<AquariumsLoaded>()
              .having((state) => state.selectedAquarium?.id, 'selected aquarium id', 'aquarium1'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'clears selection when in AquariumsLoaded state',
        build: () => bloc,
        seed: () => AquariumsLoaded(
          aquariums: [testAquarium],
          selectedAquarium: testAquarium,
          lastUpdated: DateTime.now(),
        ),
        act: (bloc) => bloc.add(AquariumSelectionCleared()),
        expect: () => [
          isA<AquariumsLoaded>()
              .having((state) => state.selectedAquarium, 'selected aquarium', null),
        ],
      );
    });

    group('Refresh', () {
      blocTest<AquariumBloc, AquariumState>(
        'refreshes aquarium list',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenAnswer((_) async => [testAquarium]);
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumRefreshRequested()),
        expect: () => [
          AquariumsLoading(),
          isA<AquariumsLoaded>(),
        ],
      );
    });

    group('Error Handling', () {
      blocTest<AquariumBloc, AquariumState>(
        'handles network errors gracefully',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenThrow(Exception('Network connection failed'));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumsLoadRequested()),
        expect: () => [
          AquariumsLoading(),
          isA<AquariumError>()
              .having((state) => state.message, 'error message', 'Network connection failed'),
        ],
      );

      blocTest<AquariumBloc, AquariumState>(
        'handles API errors with proper message extraction',
        build: () {
          when(() => mockAquariumService.getMyAquariums())
              .thenThrow(Exception('Exception: API Error: Invalid request'));
          return bloc;
        },
        act: (bloc) => bloc.add(AquariumsLoadRequested()),
        expect: () => [
          AquariumsLoading(),
          isA<AquariumError>()
              .having((state) => state.message, 'cleaned error message', 'API Error: Invalid request'),
        ],
      );
    });
  });
}