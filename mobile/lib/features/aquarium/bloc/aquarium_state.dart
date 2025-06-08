import 'package:equatable/equatable.dart';
import '../models/aquarium_model.dart';

abstract class AquariumState extends Equatable {
  const AquariumState();

  @override
  List<Object?> get props => [];
}

// Initial state
class AquariumInitial extends AquariumState {}

// Loading states
class AquariumLoading extends AquariumState {}

class AquariumsLoading extends AquariumState {}

// Loaded states
class AquariumsLoaded extends AquariumState {
  final List<Aquarium> aquariums;
  final Aquarium? selectedAquarium;
  final DateTime lastUpdated;

  const AquariumsLoaded({
    required this.aquariums,
    this.selectedAquarium,
    required this.lastUpdated,
  });

  @override
  List<Object?> get props => [aquariums, selectedAquarium, lastUpdated];

  AquariumsLoaded copyWith({
    List<Aquarium>? aquariums,
    Aquarium? selectedAquarium,
    DateTime? lastUpdated,
  }) {
    return AquariumsLoaded(
      aquariums: aquariums ?? this.aquariums,
      selectedAquarium: selectedAquarium ?? this.selectedAquarium,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

class AquariumLoaded extends AquariumState {
  final Aquarium aquarium;
  final List<WaterParameters>? parameterHistory;

  const AquariumLoaded({
    required this.aquarium,
    this.parameterHistory,
  });

  @override
  List<Object?> get props => [aquarium, parameterHistory];

  AquariumLoaded copyWith({
    Aquarium? aquarium,
    List<WaterParameters>? parameterHistory,
  }) {
    return AquariumLoaded(
      aquarium: aquarium ?? this.aquarium,
      parameterHistory: parameterHistory ?? this.parameterHistory,
    );
  }
}

// Creating state
class AquariumCreating extends AquariumState {}

// Created state
class AquariumCreated extends AquariumState {
  final Aquarium aquarium;
  final String message;

  const AquariumCreated({
    required this.aquarium,
    this.message = 'Aquarium created successfully!',
  });

  @override
  List<Object> get props => [aquarium, message];
}

// Updating state
class AquariumUpdating extends AquariumState {
  final String aquariumId;

  const AquariumUpdating({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Updated state
class AquariumUpdated extends AquariumState {
  final Aquarium aquarium;
  final String message;

  const AquariumUpdated({
    required this.aquarium,
    this.message = 'Aquarium updated successfully!',
  });

  @override
  List<Object> get props => [aquarium, message];
}

// Deleting state
class AquariumDeleting extends AquariumState {
  final String aquariumId;

  const AquariumDeleting({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Deleted state
class AquariumDeleted extends AquariumState {
  final String aquariumId;
  final String message;

  const AquariumDeleted({
    required this.aquariumId,
    this.message = 'Aquarium deleted successfully!',
  });

  @override
  List<Object> get props => [aquariumId, message];
}

// Parameter recording state
class AquariumParameterRecording extends AquariumState {
  final String aquariumId;

  const AquariumParameterRecording({required this.aquariumId});

  @override
  List<Object> get props => [aquariumId];
}

// Parameter recorded state
class AquariumParameterRecorded extends AquariumState {
  final String aquariumId;
  final WaterParameters parameters;
  final String message;

  const AquariumParameterRecorded({
    required this.aquariumId,
    required this.parameters,
    this.message = 'Parameters recorded successfully!',
  });

  @override
  List<Object> get props => [aquariumId, parameters, message];
}

// Parameter history loaded
class AquariumParameterHistoryLoaded extends AquariumState {
  final String aquariumId;
  final List<WaterParameters> parameters;

  const AquariumParameterHistoryLoaded({
    required this.aquariumId,
    required this.parameters,
  });

  @override
  List<Object> get props => [aquariumId, parameters];
}

// Equipment states
class AquariumEquipmentAdded extends AquariumState {
  final String aquariumId;
  final Equipment equipment;
  final String message;

  const AquariumEquipmentAdded({
    required this.aquariumId,
    required this.equipment,
    this.message = 'Equipment added successfully!',
  });

  @override
  List<Object> get props => [aquariumId, equipment, message];
}

class AquariumEquipmentUpdated extends AquariumState {
  final String aquariumId;
  final Equipment equipment;
  final String message;

  const AquariumEquipmentUpdated({
    required this.aquariumId,
    required this.equipment,
    this.message = 'Equipment updated successfully!',
  });

  @override
  List<Object> get props => [aquariumId, equipment, message];
}

class AquariumEquipmentRemoved extends AquariumState {
  final String aquariumId;
  final String equipmentId;
  final String message;

  const AquariumEquipmentRemoved({
    required this.aquariumId,
    required this.equipmentId,
    this.message = 'Equipment removed successfully!',
  });

  @override
  List<Object> get props => [aquariumId, equipmentId, message];
}

// Inhabitant states
class AquariumInhabitantAdded extends AquariumState {
  final String aquariumId;
  final Inhabitant inhabitant;
  final String message;

  const AquariumInhabitantAdded({
    required this.aquariumId,
    required this.inhabitant,
    this.message = 'Inhabitant added successfully!',
  });

  @override
  List<Object> get props => [aquariumId, inhabitant, message];
}

class AquariumInhabitantUpdated extends AquariumState {
  final String aquariumId;
  final Inhabitant inhabitant;
  final String message;

  const AquariumInhabitantUpdated({
    required this.aquariumId,
    required this.inhabitant,
    this.message = 'Inhabitant updated successfully!',
  });

  @override
  List<Object> get props => [aquariumId, inhabitant, message];
}

class AquariumInhabitantRemoved extends AquariumState {
  final String aquariumId;
  final String inhabitantId;
  final String message;

  const AquariumInhabitantRemoved({
    required this.aquariumId,
    required this.inhabitantId,
    this.message = 'Inhabitant removed successfully!',
  });

  @override
  List<Object> get props => [aquariumId, inhabitantId, message];
}

// Error state
class AquariumError extends AquariumState {
  final String message;
  final String? errorCode;
  final dynamic error;

  const AquariumError({
    required this.message,
    this.errorCode,
    this.error,
  });

  @override
  List<Object?> get props => [message, errorCode, error];
}

// Empty state
class AquariumEmpty extends AquariumState {
  final String message;

  const AquariumEmpty({
    this.message = 'No aquariums found. Create your first aquarium!',
  });

  @override
  List<Object> get props => [message];
}