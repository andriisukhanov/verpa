import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

import '../models/aquarium_model.dart';
import '../services/aquarium_service.dart';
import '../../notifications/services/aquarium_notification_service.dart';
import '../../../shared/services/notification_service.dart';
import 'aquarium_event.dart';
import 'aquarium_state.dart';

class AquariumBloc extends Bloc<AquariumEvent, AquariumState> {
  final AquariumService aquariumService;
  final Logger _logger = Logger();
  final _uuid = const Uuid();

  AquariumBloc({
    required this.aquariumService,
  }) : super(AquariumInitial()) {
    on<AquariumsLoadRequested>(_onAquariumsLoadRequested);
    on<AquariumLoadRequested>(_onAquariumLoadRequested);
    on<AquariumCreateRequested>(_onAquariumCreateRequested);
    on<AquariumUpdateRequested>(_onAquariumUpdateRequested);
    on<AquariumDeleteRequested>(_onAquariumDeleteRequested);
    on<AquariumEquipmentAddRequested>(_onAquariumEquipmentAddRequested);
    on<AquariumEquipmentUpdateRequested>(_onAquariumEquipmentUpdateRequested);
    on<AquariumEquipmentRemoveRequested>(_onAquariumEquipmentRemoveRequested);
    on<AquariumInhabitantAddRequested>(_onAquariumInhabitantAddRequested);
    on<AquariumInhabitantUpdateRequested>(_onAquariumInhabitantUpdateRequested);
    on<AquariumInhabitantRemoveRequested>(_onAquariumInhabitantRemoveRequested);
    on<AquariumParametersRecordRequested>(_onAquariumParametersRecordRequested);
    on<AquariumParametersHistoryRequested>(_onAquariumParametersHistoryRequested);
    on<AquariumSelected>(_onAquariumSelected);
    on<AquariumSelectionCleared>(_onAquariumSelectionCleared);
    on<AquariumRefreshRequested>(_onAquariumRefreshRequested);
  }

  Future<void> _onAquariumsLoadRequested(
    AquariumsLoadRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumsLoading());

      final aquariums = await aquariumService.getMyAquariums();

      if (aquariums.isEmpty) {
        emit(const AquariumEmpty());
      } else {
        emit(AquariumsLoaded(
          aquariums: aquariums,
          lastUpdated: DateTime.now(),
        ));
      }
    } catch (e) {
      _logger.e('Failed to load aquariums: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumLoadRequested(
    AquariumLoadRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumLoading());

      final aquarium = await aquariumService.getAquarium(event.aquariumId);
      
      emit(AquariumLoaded(aquarium: aquarium));
    } catch (e) {
      _logger.e('Failed to load aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumCreateRequested(
    AquariumCreateRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumCreating());

      // Upload image if provided
      String? imageUrl;
      if (event.imagePath != null) {
        try {
          imageUrl = await aquariumService.uploadImage(event.imagePath!);
        } catch (e) {
          _logger.w('Failed to upload image: $e');
          // Continue without image
        }
      }

      final aquarium = await aquariumService.createAquarium(
        name: event.name,
        type: event.type,
        volume: event.volume,
        volumeUnit: event.volumeUnit,
        dimensions: event.dimensions,
        waterType: event.waterType,
        description: event.description,
        location: event.location,
        imageUrl: imageUrl,
      );

      emit(AquariumCreated(aquarium: aquarium));

      // Schedule notifications for the new aquarium
      await AquariumNotificationService.scheduleAquariumNotifications(aquarium);

      // Reload aquariums list
      add(AquariumsLoadRequested());
    } catch (e) {
      _logger.e('Failed to create aquarium: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumUpdateRequested(
    AquariumUpdateRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.updateAquarium(
        event.aquariumId,
        event.updates,
      );

      emit(AquariumUpdated(aquarium: aquarium));

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to update aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumDeleteRequested(
    AquariumDeleteRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumDeleting(aquariumId: event.aquariumId));

      // Cancel all notifications for this aquarium
      await AquariumNotificationService.cancelAquariumNotifications(event.aquariumId);

      await aquariumService.deleteAquarium(event.aquariumId);

      emit(AquariumDeleted(aquariumId: event.aquariumId));

      // Reload aquariums list
      add(AquariumsLoadRequested());
    } catch (e) {
      _logger.e('Failed to delete aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumEquipmentAddRequested(
    AquariumEquipmentAddRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.addEquipment(
        event.aquariumId,
        event.equipment,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Equipment added successfully!',
      ));

      // Schedule maintenance reminder if equipment has next maintenance date
      if (event.equipment.isActive && event.equipment.nextMaintenanceDate != null) {
        await AquariumNotificationService.scheduleMaintenanceReminder(
          equipment: event.equipment,
          aquariumName: aquarium.name,
        );
      }

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to add equipment to aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumEquipmentUpdateRequested(
    AquariumEquipmentUpdateRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.updateEquipment(
        event.aquariumId,
        event.equipment,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Equipment updated successfully!',
      ));

      // Cancel old maintenance reminder and schedule new one if needed
      await NotificationService.cancelNotification(
        _maintenanceBaseId + event.equipment.id.hashCode % 1000,
      );
      
      if (event.equipment.isActive && event.equipment.nextMaintenanceDate != null) {
        await AquariumNotificationService.scheduleMaintenanceReminder(
          equipment: event.equipment,
          aquariumName: aquarium.name,
        );
      }

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to update equipment in aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumEquipmentRemoveRequested(
    AquariumEquipmentRemoveRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.removeEquipment(
        event.aquariumId,
        event.equipmentId,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Equipment removed successfully!',
      ));

      // Cancel maintenance reminder for removed equipment
      await NotificationService.cancelNotification(
        _maintenanceBaseId + event.equipmentId.hashCode % 1000,
      );

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to remove equipment from aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumInhabitantAddRequested(
    AquariumInhabitantAddRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.addInhabitant(
        event.aquariumId,
        event.inhabitant,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Inhabitant added successfully!',
      ));

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to add inhabitant to aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumParametersRecordRequested(
    AquariumParametersRecordRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumParameterRecording(aquariumId: event.aquariumId));

      final parameters = await aquariumService.recordParameters(
        event.aquariumId,
        event.parameters,
      );

      emit(AquariumParameterRecorded(
        aquariumId: event.aquariumId,
        parameters: parameters,
      ));

      // Update last parameter test date for notifications
      await AquariumNotificationService.updateLastParameterTest(event.aquariumId);

      // Reload aquarium to get updated health score
      add(AquariumLoadRequested(aquariumId: event.aquariumId));
    } catch (e) {
      _logger.e('Failed to record parameters for aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumParametersHistoryRequested(
    AquariumParametersHistoryRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumLoading());

      final parameters = await aquariumService.getParameterHistory(
        event.aquariumId,
        startDate: event.startDate,
        endDate: event.endDate,
        limit: event.limit,
      );

      emit(AquariumParameterHistoryLoaded(
        aquariumId: event.aquariumId,
        parameters: parameters,
      ));
    } catch (e) {
      _logger.e('Failed to load parameter history for aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumSelected(
    AquariumSelected event,
    Emitter<AquariumState> emit,
  ) async {
    if (state is AquariumsLoaded) {
      final currentState = state as AquariumsLoaded;
      emit(currentState.copyWith(selectedAquarium: event.aquarium));
    } else {
      emit(AquariumLoaded(aquarium: event.aquarium));
    }
  }

  Future<void> _onAquariumSelectionCleared(
    AquariumSelectionCleared event,
    Emitter<AquariumState> emit,
  ) async {
    if (state is AquariumsLoaded) {
      final currentState = state as AquariumsLoaded;
      emit(currentState.copyWith(selectedAquarium: null));
    }
  }

  Future<void> _onAquariumInhabitantUpdateRequested(
    AquariumInhabitantUpdateRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.updateInhabitant(
        event.aquariumId,
        event.inhabitant,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Inhabitant updated successfully!',
      ));

      // Check if health status changed to critical
      if (event.inhabitant.healthStatus == HealthStatus.critical) {
        await AquariumNotificationService.sendHealthAlert(
          aquariumId: event.aquariumId,
          aquariumName: aquarium.name,
          alertTitle: 'Critical Health Alert',
          alertMessage: '${event.inhabitant.name} needs immediate attention',
          severity: AlertSeverity.critical,
        );
      }

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to update inhabitant in aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumInhabitantRemoveRequested(
    AquariumInhabitantRemoveRequested event,
    Emitter<AquariumState> emit,
  ) async {
    try {
      emit(AquariumUpdating(aquariumId: event.aquariumId));

      final aquarium = await aquariumService.removeInhabitant(
        event.aquariumId,
        event.inhabitantId,
      );

      emit(AquariumUpdated(
        aquarium: aquarium,
        message: 'Inhabitant removed successfully!',
      ));

      // Update the list if it's loaded
      if (state is AquariumsLoaded) {
        final currentState = state as AquariumsLoaded;
        final updatedList = currentState.aquariums.map((a) {
          return a.id == aquarium.id ? aquarium : a;
        }).toList();

        emit(currentState.copyWith(
          aquariums: updatedList,
          selectedAquarium: currentState.selectedAquarium?.id == aquarium.id
              ? aquarium
              : currentState.selectedAquarium,
        ));
      }
    } catch (e) {
      _logger.e('Failed to remove inhabitant from aquarium ${event.aquariumId}: $e');
      emit(AquariumError(
        message: e.toString().replaceAll('Exception: ', ''),
        error: e,
      ));
    }
  }

  Future<void> _onAquariumRefreshRequested(
    AquariumRefreshRequested event,
    Emitter<AquariumState> emit,
  ) async {
    // Force reload from API
    add(AquariumsLoadRequested());
  }

  static const int _maintenanceBaseId = 1000;
}