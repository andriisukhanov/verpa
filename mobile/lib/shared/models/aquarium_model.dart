import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'aquarium_model.g.dart';

@JsonSerializable()
class Aquarium extends Equatable {
  final String id;
  final String name;
  final String type;
  final double volume;
  final String? description;
  final DateTime setupDate;
  final String? imageUrl;
  final List<Equipment> equipment;
  final List<Inhabitant> inhabitants;
  final WaterParameters? currentParameters;
  final String userId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Aquarium({
    required this.id,
    required this.name,
    required this.type,
    required this.volume,
    this.description,
    required this.setupDate,
    this.imageUrl,
    required this.equipment,
    required this.inhabitants,
    this.currentParameters,
    required this.userId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Aquarium.fromJson(Map<String, dynamic> json) => _$AquariumFromJson(json);
  Map<String, dynamic> toJson() => _$AquariumToJson(this);

  Aquarium copyWith({
    String? id,
    String? name,
    String? type,
    double? volume,
    String? description,
    DateTime? setupDate,
    String? imageUrl,
    List<Equipment>? equipment,
    List<Inhabitant>? inhabitants,
    WaterParameters? currentParameters,
    String? userId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Aquarium(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      volume: volume ?? this.volume,
      description: description ?? this.description,
      setupDate: setupDate ?? this.setupDate,
      imageUrl: imageUrl ?? this.imageUrl,
      equipment: equipment ?? this.equipment,
      inhabitants: inhabitants ?? this.inhabitants,
      currentParameters: currentParameters ?? this.currentParameters,
      userId: userId ?? this.userId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        type,
        volume,
        description,
        setupDate,
        imageUrl,
        equipment,
        inhabitants,
        currentParameters,
        userId,
        createdAt,
        updatedAt,
      ];
}

@JsonSerializable()
class Equipment extends Equatable {
  final String id;
  final String name;
  final String type;
  final String? brand;
  final String? model;
  final DateTime? installDate;
  final DateTime? lastMaintenance;
  final Map<String, dynamic>? specifications;

  const Equipment({
    required this.id,
    required this.name,
    required this.type,
    this.brand,
    this.model,
    this.installDate,
    this.lastMaintenance,
    this.specifications,
  });

  factory Equipment.fromJson(Map<String, dynamic> json) => _$EquipmentFromJson(json);
  Map<String, dynamic> toJson() => _$EquipmentToJson(this);

  Equipment copyWith({
    String? id,
    String? name,
    String? type,
    String? brand,
    String? model,
    DateTime? installDate,
    DateTime? lastMaintenance,
    Map<String, dynamic>? specifications,
  }) {
    return Equipment(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      brand: brand ?? this.brand,
      model: model ?? this.model,
      installDate: installDate ?? this.installDate,
      lastMaintenance: lastMaintenance ?? this.lastMaintenance,
      specifications: specifications ?? this.specifications,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        type,
        brand,
        model,
        installDate,
        lastMaintenance,
        specifications,
      ];
}

@JsonSerializable()
class Inhabitant extends Equatable {
  final String id;
  final String name;
  final String species;
  final String? commonName;
  final int quantity;
  final DateTime? addedDate;
  final String? notes;
  final List<String>? imageUrls;

  const Inhabitant({
    required this.id,
    required this.name,
    required this.species,
    this.commonName,
    required this.quantity,
    this.addedDate,
    this.notes,
    this.imageUrls,
  });

  factory Inhabitant.fromJson(Map<String, dynamic> json) => _$InhabitantFromJson(json);
  Map<String, dynamic> toJson() => _$InhabitantToJson(this);

  Inhabitant copyWith({
    String? id,
    String? name,
    String? species,
    String? commonName,
    int? quantity,
    DateTime? addedDate,
    String? notes,
    List<String>? imageUrls,
  }) {
    return Inhabitant(
      id: id ?? this.id,
      name: name ?? this.name,
      species: species ?? this.species,
      commonName: commonName ?? this.commonName,
      quantity: quantity ?? this.quantity,
      addedDate: addedDate ?? this.addedDate,
      notes: notes ?? this.notes,
      imageUrls: imageUrls ?? this.imageUrls,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        species,
        commonName,
        quantity,
        addedDate,
        notes,
        imageUrls,
      ];
}

@JsonSerializable()
class WaterParameters extends Equatable {
  final String id;
  final String aquariumId;
  final double? temperature;
  final double? ph;
  final double? ammonia;
  final double? nitrite;
  final double? nitrate;
  final double? hardness;
  final double? alkalinity;
  final double? salinity;
  final DateTime recordedAt;
  final String? notes;

  const WaterParameters({
    required this.id,
    required this.aquariumId,
    this.temperature,
    this.ph,
    this.ammonia,
    this.nitrite,
    this.nitrate,
    this.hardness,
    this.alkalinity,
    this.salinity,
    required this.recordedAt,
    this.notes,
  });

  factory WaterParameters.fromJson(Map<String, dynamic> json) => _$WaterParametersFromJson(json);
  Map<String, dynamic> toJson() => _$WaterParametersToJson(this);

  // Get overall water quality based on parameters
  WaterQuality get waterQuality {
    int score = 0;
    int parameters = 0;

    if (temperature != null) {
      parameters++;
      if (temperature! >= 22 && temperature! <= 28) score++;
    }

    if (ph != null) {
      parameters++;
      if (ph! >= 6.5 && ph! <= 8.0) score++;
    }

    if (ammonia != null) {
      parameters++;
      if (ammonia! <= 0.25) score++;
    }

    if (nitrite != null) {
      parameters++;
      if (nitrite! <= 0.25) score++;
    }

    if (nitrate != null) {
      parameters++;
      if (nitrate! <= 40) score++;
    }

    if (parameters == 0) return WaterQuality.unknown;

    final ratio = score / parameters;
    if (ratio >= 0.9) return WaterQuality.excellent;
    if (ratio >= 0.7) return WaterQuality.good;
    if (ratio >= 0.5) return WaterQuality.fair;
    if (ratio >= 0.3) return WaterQuality.poor;
    return WaterQuality.critical;
  }

  WaterParameters copyWith({
    String? id,
    String? aquariumId,
    double? temperature,
    double? ph,
    double? ammonia,
    double? nitrite,
    double? nitrate,
    double? hardness,
    double? alkalinity,
    double? salinity,
    DateTime? recordedAt,
    String? notes,
  }) {
    return WaterParameters(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      temperature: temperature ?? this.temperature,
      ph: ph ?? this.ph,
      ammonia: ammonia ?? this.ammonia,
      nitrite: nitrite ?? this.nitrite,
      nitrate: nitrate ?? this.nitrate,
      hardness: hardness ?? this.hardness,
      alkalinity: alkalinity ?? this.alkalinity,
      salinity: salinity ?? this.salinity,
      recordedAt: recordedAt ?? this.recordedAt,
      notes: notes ?? this.notes,
    );
  }

  @override
  List<Object?> get props => [
        id,
        aquariumId,
        temperature,
        ph,
        ammonia,
        nitrite,
        nitrate,
        hardness,
        alkalinity,
        salinity,
        recordedAt,
        notes,
      ];
}

enum WaterQuality {
  excellent,
  good,
  fair,
  poor,
  critical,
  unknown,
}