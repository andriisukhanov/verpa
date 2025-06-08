import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';

part 'aquarium_model.g.dart';

@HiveType(typeId: 1)
class Aquarium extends Equatable {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String name;
  
  @HiveField(2)
  final String userId;
  
  @HiveField(3)
  final AquariumType type;
  
  @HiveField(4)
  final double volume;
  
  @HiveField(5)
  final String volumeUnit;
  
  @HiveField(6)
  final AquariumDimensions dimensions;
  
  @HiveField(7)
  final String? description;
  
  @HiveField(8)
  final String? location;
  
  @HiveField(9)
  final String? imageUrl;
  
  @HiveField(10)
  final DateTime createdAt;
  
  @HiveField(11)
  final DateTime updatedAt;
  
  @HiveField(12)
  final WaterType waterType;
  
  @HiveField(13)
  final List<Equipment> equipment;
  
  @HiveField(14)
  final List<Inhabitant> inhabitants;
  
  @HiveField(15)
  final WaterParameters? currentParameters;
  
  @HiveField(16)
  final double healthScore;
  
  @HiveField(17)
  final List<String> alerts;

  const Aquarium({
    required this.id,
    required this.name,
    required this.userId,
    required this.type,
    required this.volume,
    required this.volumeUnit,
    required this.dimensions,
    this.description,
    this.location,
    this.imageUrl,
    required this.createdAt,
    required this.updatedAt,
    required this.waterType,
    this.equipment = const [],
    this.inhabitants = const [],
    this.currentParameters,
    this.healthScore = 100.0,
    this.alerts = const [],
  });

  factory Aquarium.fromJson(Map<String, dynamic> json) {
    return Aquarium(
      id: json['id'] ?? json['_id'],
      name: json['name'],
      userId: json['userId'],
      type: AquariumType.fromString(json['type']),
      volume: (json['volume'] as num).toDouble(),
      volumeUnit: json['volumeUnit'] ?? 'gallons',
      dimensions: AquariumDimensions.fromJson(json['dimensions']),
      description: json['description'],
      location: json['location'],
      imageUrl: json['imageUrl'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      waterType: WaterType.fromString(json['waterType']),
      equipment: (json['equipment'] as List<dynamic>?)
          ?.map((e) => Equipment.fromJson(e))
          .toList() ?? [],
      inhabitants: (json['inhabitants'] as List<dynamic>?)
          ?.map((i) => Inhabitant.fromJson(i))
          .toList() ?? [],
      currentParameters: json['currentParameters'] != null
          ? WaterParameters.fromJson(json['currentParameters'])
          : null,
      healthScore: (json['healthScore'] ?? 100.0).toDouble(),
      alerts: List<String>.from(json['alerts'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'userId': userId,
      'type': type.value,
      'volume': volume,
      'volumeUnit': volumeUnit,
      'dimensions': dimensions.toJson(),
      'description': description,
      'location': location,
      'imageUrl': imageUrl,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'waterType': waterType.value,
      'equipment': equipment.map((e) => e.toJson()).toList(),
      'inhabitants': inhabitants.map((i) => i.toJson()).toList(),
      'currentParameters': currentParameters?.toJson(),
      'healthScore': healthScore,
      'alerts': alerts,
    };
  }

  Aquarium copyWith({
    String? id,
    String? name,
    String? userId,
    AquariumType? type,
    double? volume,
    String? volumeUnit,
    AquariumDimensions? dimensions,
    String? description,
    String? location,
    String? imageUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
    WaterType? waterType,
    List<Equipment>? equipment,
    List<Inhabitant>? inhabitants,
    WaterParameters? currentParameters,
    double? healthScore,
    List<String>? alerts,
  }) {
    return Aquarium(
      id: id ?? this.id,
      name: name ?? this.name,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      volume: volume ?? this.volume,
      volumeUnit: volumeUnit ?? this.volumeUnit,
      dimensions: dimensions ?? this.dimensions,
      description: description ?? this.description,
      location: location ?? this.location,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      waterType: waterType ?? this.waterType,
      equipment: equipment ?? this.equipment,
      inhabitants: inhabitants ?? this.inhabitants,
      currentParameters: currentParameters ?? this.currentParameters,
      healthScore: healthScore ?? this.healthScore,
      alerts: alerts ?? this.alerts,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        userId,
        type,
        volume,
        volumeUnit,
        dimensions,
        description,
        location,
        imageUrl,
        createdAt,
        updatedAt,
        waterType,
        equipment,
        inhabitants,
        currentParameters,
        healthScore,
        alerts,
      ];
}

@HiveType(typeId: 2)
enum AquariumType {
  @HiveField(0)
  freshwater('freshwater'),
  @HiveField(1)
  saltwater('saltwater'),
  @HiveField(2)
  brackish('brackish'),
  @HiveField(3)
  reef('reef'),
  @HiveField(4)
  planted('planted');

  final String value;
  const AquariumType(this.value);

  static AquariumType fromString(String value) {
    return AquariumType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => AquariumType.freshwater,
    );
  }

  String get displayName {
    switch (this) {
      case AquariumType.freshwater:
        return 'Freshwater';
      case AquariumType.saltwater:
        return 'Saltwater';
      case AquariumType.brackish:
        return 'Brackish';
      case AquariumType.reef:
        return 'Reef';
      case AquariumType.planted:
        return 'Planted';
    }
  }
}

@HiveType(typeId: 3)
enum WaterType {
  @HiveField(0)
  freshwater('freshwater'),
  @HiveField(1)
  saltwater('saltwater'),
  @HiveField(2)
  brackish('brackish');

  final String value;
  const WaterType(this.value);

  static WaterType fromString(String value) {
    return WaterType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => WaterType.freshwater,
    );
  }
}

@HiveType(typeId: 10)
enum EquipmentType {
  @HiveField(0)
  filter('filter'),
  @HiveField(1)
  heater('heater'),
  @HiveField(2)
  light('light'),
  @HiveField(3)
  pump('pump'),
  @HiveField(4)
  skimmer('skimmer'),
  @HiveField(5)
  uvSterilizer('uv_sterilizer'),
  @HiveField(6)
  co2System('co2_system'),
  @HiveField(7)
  airPump('air_pump'),
  @HiveField(8)
  wavemaker('wavemaker'),
  @HiveField(9)
  chiller('chiller'),
  @HiveField(10)
  doser('doser'),
  @HiveField(11)
  other('other');

  final String value;
  const EquipmentType(this.value);

  static EquipmentType fromString(String value) {
    return EquipmentType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => EquipmentType.other,
    );
  }

  String get displayName {
    switch (this) {
      case EquipmentType.filter:
        return 'Filter';
      case EquipmentType.heater:
        return 'Heater';
      case EquipmentType.light:
        return 'Light';
      case EquipmentType.pump:
        return 'Pump';
      case EquipmentType.skimmer:
        return 'Protein Skimmer';
      case EquipmentType.uvSterilizer:
        return 'UV Sterilizer';
      case EquipmentType.co2System:
        return 'CO2 System';
      case EquipmentType.airPump:
        return 'Air Pump';
      case EquipmentType.wavemaker:
        return 'Wavemaker';
      case EquipmentType.chiller:
        return 'Chiller';
      case EquipmentType.doser:
        return 'Doser';
      case EquipmentType.other:
        return 'Other';
    }
  }

  IconData get icon {
    switch (this) {
      case EquipmentType.filter:
        return Icons.filter_alt;
      case EquipmentType.heater:
        return Icons.thermostat;
      case EquipmentType.light:
        return Icons.lightbulb;
      case EquipmentType.pump:
        return Icons.water;
      case EquipmentType.skimmer:
        return Icons.cleaning_services;
      case EquipmentType.uvSterilizer:
        return Icons.wb_sunny;
      case EquipmentType.co2System:
        return Icons.bubble_chart;
      case EquipmentType.airPump:
        return Icons.air;
      case EquipmentType.wavemaker:
        return Icons.waves;
      case EquipmentType.chiller:
        return Icons.ac_unit;
      case EquipmentType.doser:
        return Icons.medical_services;
      case EquipmentType.other:
        return Icons.settings;
    }
  }

  Color get color {
    switch (this) {
      case EquipmentType.filter:
        return Colors.blue;
      case EquipmentType.heater:
        return Colors.orange;
      case EquipmentType.light:
        return Colors.yellow.shade700;
      case EquipmentType.pump:
        return Colors.cyan;
      case EquipmentType.skimmer:
        return Colors.purple;
      case EquipmentType.uvSterilizer:
        return Colors.indigo;
      case EquipmentType.co2System:
        return Colors.green;
      case EquipmentType.airPump:
        return Colors.lightBlue;
      case EquipmentType.wavemaker:
        return Colors.teal;
      case EquipmentType.chiller:
        return Colors.blueGrey;
      case EquipmentType.doser:
        return Colors.pink;
      case EquipmentType.other:
        return Colors.grey;
    }
  }
}

@HiveType(typeId: 4)
class AquariumDimensions extends Equatable {
  @HiveField(0)
  final double length;
  
  @HiveField(1)
  final double width;
  
  @HiveField(2)
  final double height;
  
  @HiveField(3)
  final String unit;

  const AquariumDimensions({
    required this.length,
    required this.width,
    required this.height,
    this.unit = 'inches',
  });

  factory AquariumDimensions.fromJson(Map<String, dynamic> json) {
    return AquariumDimensions(
      length: (json['length'] as num).toDouble(),
      width: (json['width'] as num).toDouble(),
      height: (json['height'] as num).toDouble(),
      unit: json['unit'] ?? 'inches',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'length': length,
      'width': width,
      'height': height,
      'unit': unit,
    };
  }

  @override
  List<Object> get props => [length, width, height, unit];
}

@HiveType(typeId: 5)
class Equipment extends Equatable {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String name;
  
  @HiveField(2)
  final EquipmentType type;
  
  @HiveField(3)
  final String? brand;
  
  @HiveField(4)
  final String? model;
  
  @HiveField(5)
  final DateTime? purchaseDate;
  
  @HiveField(6)
  final DateTime? lastMaintenanceDate;
  
  @HiveField(7)
  final DateTime? nextMaintenanceDate;
  
  @HiveField(8)
  final bool isActive;
  
  @HiveField(9)
  final String? notes;

  const Equipment({
    required this.id,
    required this.name,
    required this.type,
    this.brand,
    this.model,
    this.purchaseDate,
    this.lastMaintenanceDate,
    this.nextMaintenanceDate,
    this.isActive = true,
    this.notes,
  });

  factory Equipment.fromJson(Map<String, dynamic> json) {
    return Equipment(
      id: json['id'] ?? json['_id'],
      name: json['name'],
      type: EquipmentType.fromString(json['type']),
      brand: json['brand'],
      model: json['model'],
      purchaseDate: json['purchaseDate'] != null
          ? DateTime.parse(json['purchaseDate'])
          : null,
      lastMaintenanceDate: json['lastMaintenanceDate'] != null
          ? DateTime.parse(json['lastMaintenanceDate'])
          : null,
      nextMaintenanceDate: json['nextMaintenanceDate'] != null
          ? DateTime.parse(json['nextMaintenanceDate'])
          : null,
      isActive: json['isActive'] ?? true,
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.value,
      'brand': brand,
      'model': model,
      'purchaseDate': purchaseDate?.toIso8601String(),
      'lastMaintenanceDate': lastMaintenanceDate?.toIso8601String(),
      'nextMaintenanceDate': nextMaintenanceDate?.toIso8601String(),
      'isActive': isActive,
      'notes': notes,
    };
  }

  Equipment copyWith({
    String? id,
    String? name,
    EquipmentType? type,
    String? brand,
    String? model,
    DateTime? purchaseDate,
    DateTime? lastMaintenanceDate,
    DateTime? nextMaintenanceDate,
    bool? isActive,
    String? notes,
  }) {
    return Equipment(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      brand: brand ?? this.brand,
      model: model ?? this.model,
      purchaseDate: purchaseDate ?? this.purchaseDate,
      lastMaintenanceDate: lastMaintenanceDate ?? this.lastMaintenanceDate,
      nextMaintenanceDate: nextMaintenanceDate ?? this.nextMaintenanceDate,
      isActive: isActive ?? this.isActive,
      notes: notes ?? this.notes,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        type,
        brand,
        model,
        purchaseDate,
        lastMaintenanceDate,
        nextMaintenanceDate,
        isActive,
        notes,
      ];
}

@HiveType(typeId: 6)
class Inhabitant extends Equatable {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String name;
  
  @HiveField(2)
  final String species;
  
  @HiveField(3)
  final String? scientificName;
  
  @HiveField(4)
  final int quantity;
  
  @HiveField(5)
  final DateTime addedDate;
  
  @HiveField(6)
  final String? imageUrl;
  
  @HiveField(7)
  final String? notes;
  
  @HiveField(8)
  final HealthStatus healthStatus;

  const Inhabitant({
    required this.id,
    required this.name,
    required this.species,
    this.scientificName,
    this.quantity = 1,
    required this.addedDate,
    this.imageUrl,
    this.notes,
    this.healthStatus = HealthStatus.healthy,
  });

  factory Inhabitant.fromJson(Map<String, dynamic> json) {
    return Inhabitant(
      id: json['id'] ?? json['_id'],
      name: json['name'],
      species: json['species'],
      scientificName: json['scientificName'],
      quantity: json['quantity'] ?? 1,
      addedDate: DateTime.parse(json['addedDate']),
      imageUrl: json['imageUrl'],
      notes: json['notes'],
      healthStatus: HealthStatus.fromString(json['healthStatus'] ?? 'healthy'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'species': species,
      'scientificName': scientificName,
      'quantity': quantity,
      'addedDate': addedDate.toIso8601String(),
      'imageUrl': imageUrl,
      'notes': notes,
      'healthStatus': healthStatus.value,
    };
  }

  Inhabitant copyWith({
    String? id,
    String? name,
    String? species,
    String? scientificName,
    int? quantity,
    DateTime? addedDate,
    String? imageUrl,
    String? notes,
    HealthStatus? healthStatus,
  }) {
    return Inhabitant(
      id: id ?? this.id,
      name: name ?? this.name,
      species: species ?? this.species,
      scientificName: scientificName ?? this.scientificName,
      quantity: quantity ?? this.quantity,
      addedDate: addedDate ?? this.addedDate,
      imageUrl: imageUrl ?? this.imageUrl,
      notes: notes ?? this.notes,
      healthStatus: healthStatus ?? this.healthStatus,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        species,
        scientificName,
        quantity,
        addedDate,
        imageUrl,
        notes,
        healthStatus,
      ];
}

@HiveType(typeId: 7)
enum HealthStatus {
  @HiveField(0)
  healthy('healthy'),
  @HiveField(1)
  sick('sick'),
  @HiveField(2)
  recovering('recovering'),
  @HiveField(3)
  deceased('deceased');

  final String value;
  const HealthStatus(this.value);

  static HealthStatus fromString(String value) {
    return HealthStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => HealthStatus.healthy,
    );
  }

  String get displayName {
    switch (this) {
      case HealthStatus.healthy:
        return 'Healthy';
      case HealthStatus.sick:
        return 'Sick';
      case HealthStatus.recovering:
        return 'Recovering';
      case HealthStatus.deceased:
        return 'Deceased';
    }
  }

  Color get color {
    switch (this) {
      case HealthStatus.healthy:
        return Colors.green;
      case HealthStatus.sick:
        return Colors.red;
      case HealthStatus.recovering:
        return Colors.orange;
      case HealthStatus.deceased:
        return Colors.grey;
    }
  }

  IconData get icon {
    switch (this) {
      case HealthStatus.healthy:
        return Icons.favorite;
      case HealthStatus.sick:
        return Icons.sick;
      case HealthStatus.recovering:
        return Icons.healing;
      case HealthStatus.deceased:
        return Icons.heart_broken;
    }
  }
}

@HiveType(typeId: 8)
class WaterParameters extends Equatable {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String aquariumId;
  
  @HiveField(2)
  final DateTime recordedAt;
  
  @HiveField(3)
  final double? temperature;
  
  @HiveField(4)
  final double? ph;
  
  @HiveField(5)
  final double? ammonia;
  
  @HiveField(6)
  final double? nitrite;
  
  @HiveField(7)
  final double? nitrate;
  
  @HiveField(8)
  final double? salinity;
  
  @HiveField(9)
  final double? kh;
  
  @HiveField(10)
  final double? gh;
  
  @HiveField(11)
  final double? phosphate;
  
  @HiveField(12)
  final double? calcium;
  
  @HiveField(13)
  final double? magnesium;
  
  @HiveField(14)
  final double? alkalinity;
  
  @HiveField(15)
  final String? notes;

  const WaterParameters({
    required this.id,
    required this.aquariumId,
    required this.recordedAt,
    this.temperature,
    this.ph,
    this.ammonia,
    this.nitrite,
    this.nitrate,
    this.salinity,
    this.kh,
    this.gh,
    this.phosphate,
    this.calcium,
    this.magnesium,
    this.alkalinity,
    this.notes,
  });

  factory WaterParameters.fromJson(Map<String, dynamic> json) {
    return WaterParameters(
      id: json['id'] ?? json['_id'],
      aquariumId: json['aquariumId'],
      recordedAt: DateTime.parse(json['recordedAt']),
      temperature: (json['temperature'] as num?)?.toDouble(),
      ph: (json['ph'] as num?)?.toDouble(),
      ammonia: (json['ammonia'] as num?)?.toDouble(),
      nitrite: (json['nitrite'] as num?)?.toDouble(),
      nitrate: (json['nitrate'] as num?)?.toDouble(),
      salinity: (json['salinity'] as num?)?.toDouble(),
      kh: (json['kh'] as num?)?.toDouble(),
      gh: (json['gh'] as num?)?.toDouble(),
      phosphate: (json['phosphate'] as num?)?.toDouble(),
      calcium: (json['calcium'] as num?)?.toDouble(),
      magnesium: (json['magnesium'] as num?)?.toDouble(),
      alkalinity: (json['alkalinity'] as num?)?.toDouble(),
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'recordedAt': recordedAt.toIso8601String(),
      'temperature': temperature,
      'ph': ph,
      'ammonia': ammonia,
      'nitrite': nitrite,
      'nitrate': nitrate,
      'salinity': salinity,
      'kh': kh,
      'gh': gh,
      'phosphate': phosphate,
      'calcium': calcium,
      'magnesium': magnesium,
      'alkalinity': alkalinity,
      'notes': notes,
    };
  }

  @override
  List<Object?> get props => [
        id,
        aquariumId,
        recordedAt,
        temperature,
        ph,
        ammonia,
        nitrite,
        nitrate,
        salinity,
        kh,
        gh,
        phosphate,
        calcium,
        magnesium,
        alkalinity,
        notes,
      ];
}