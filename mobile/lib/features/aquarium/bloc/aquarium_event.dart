import 'package:equatable/equatable.dart';
import '../models/aquarium_model.dart';

abstract class AquariumEvent extends Equatable {
  const AquariumEvent();

  @override
  List<Object?> get props => [];
}

// Load all aquariums
class AquariumsLoadRequested extends AquariumEvent {}

// Load single aquarium
class AquariumLoadRequested extends AquariumEvent {
  final String aquariumId;

  const AquariumLoadRequested({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Load aquarium details
class AquariumDetailRequested extends AquariumEvent {
  final String aquariumId;

  const AquariumDetailRequested({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Create new aquarium
class AquariumCreateRequested extends AquariumEvent {
  final String name;
  final AquariumType type;
  final double volume;
  final String volumeUnit;
  final AquariumDimensions dimensions;
  final WaterType waterType;
  final String? description;
  final String? location;
  final String? imagePath;

  const AquariumCreateRequested({
    required this.name,
    required this.type,
    required this.volume,
    required this.volumeUnit,
    required this.dimensions,
    required this.waterType,
    this.description,
    this.location,
    this.imagePath,
  });

  @override
  List<Object?> get props => [
        name,
        type,
        volume,
        volumeUnit,
        dimensions,
        waterType,
        description,
        location,
        imagePath,
      ];
}

// Update aquarium
class AquariumUpdateRequested extends AquariumEvent {
  final String aquariumId;
  final Map<String, dynamic> updates;

  const AquariumUpdateRequested({
    required this.aquariumId,
    required this.updates,
  });

  @override
  List<Object> get props => [aquariumId, updates];
}

// Delete aquarium
class AquariumDeleteRequested extends AquariumEvent {
  final String aquariumId;

  const AquariumDeleteRequested({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Add equipment
class AquariumEquipmentAddRequested extends AquariumEvent {
  final String aquariumId;
  final Equipment equipment;

  const AquariumEquipmentAddRequested({
    required this.aquariumId,
    required this.equipment,
  });

  @override
  List<Object> get props => [aquariumId, equipment];
}

// Update equipment
class AquariumEquipmentUpdateRequested extends AquariumEvent {
  final String aquariumId;
  final Equipment equipment;

  const AquariumEquipmentUpdateRequested({
    required this.aquariumId,
    required this.equipment,
  });

  @override
  List<Object> get props => [aquariumId, equipment];
}

// Remove equipment
class AquariumEquipmentRemoveRequested extends AquariumEvent {
  final String aquariumId;
  final String equipmentId;

  const AquariumEquipmentRemoveRequested({
    required this.aquariumId,
    required this.equipmentId,
  });

  @override
  List<Object> get props => [aquariumId, equipmentId];
}

// Add inhabitant
class AquariumInhabitantAddRequested extends AquariumEvent {
  final String aquariumId;
  final Inhabitant inhabitant;

  const AquariumInhabitantAddRequested({
    required this.aquariumId,
    required this.inhabitant,
  });

  @override
  List<Object> get props => [aquariumId, inhabitant];
}

// Update inhabitant
class AquariumInhabitantUpdateRequested extends AquariumEvent {
  final String aquariumId;
  final Inhabitant inhabitant;

  const AquariumInhabitantUpdateRequested({
    required this.aquariumId,
    required this.inhabitant,
  });

  @override
  List<Object> get props => [aquariumId, inhabitant];
}

// Remove inhabitant
class AquariumInhabitantRemoveRequested extends AquariumEvent {
  final String aquariumId;
  final String inhabitantId;

  const AquariumInhabitantRemoveRequested({
    required this.aquariumId,
    required this.inhabitantId,
  });

  @override
  List<Object> get props => [aquariumId, inhabitantId];
}

// Record water parameters
class AquariumParametersRecordRequested extends AquariumEvent {
  final String aquariumId;
  final WaterParameters parameters;

  const AquariumParametersRecordRequested({
    required this.aquariumId,
    required this.parameters,
  });

  @override
  List<Object> get props => [aquariumId, parameters];
}

// Load parameter history
class AquariumParametersHistoryRequested extends AquariumEvent {
  final String aquariumId;
  final DateTime? startDate;
  final DateTime? endDate;
  final int limit;

  const AquariumParametersHistoryRequested({
    required this.aquariumId,
    this.startDate,
    this.endDate,
    this.limit = 50,
  });

  @override
  List<Object?> get props => [aquariumId, startDate, endDate, limit];
}

// Select/View aquarium
class AquariumSelected extends AquariumEvent {
  final Aquarium aquarium;

  const AquariumSelected({required this.aquarium});

  @override
  List<Object> get props => [aquarium];
}

// Clear selection
class AquariumSelectionCleared extends AquariumEvent {}

// Refresh data
class AquariumRefreshRequested extends AquariumEvent {}