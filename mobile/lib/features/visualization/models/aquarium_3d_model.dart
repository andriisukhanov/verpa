import 'package:flutter/material.dart';
import 'dart:math' as math;

enum AquariumShape {
  rectangular('rectangular', 'Rectangular'),
  bowFront('bow_front', 'Bow Front'),
  corner('corner', 'Corner'),
  hexagonal('hexagonal', 'Hexagonal'),
  cylindrical('cylindrical', 'Cylindrical'),
  custom('custom', 'Custom');

  final String value;
  final String displayName;

  const AquariumShape(this.value, this.displayName);
}

enum DecorationType {
  rock('rock', 'Rock', Icons.landscape),
  driftwood('driftwood', 'Driftwood', Icons.park),
  plant('plant', 'Plant', Icons.grass),
  coral('coral', 'Coral', Icons.water),
  ornament('ornament', 'Ornament', Icons.castle),
  substrate('substrate', 'Substrate', Icons.terrain);

  final String value;
  final String displayName;
  final IconData icon;

  const DecorationType(this.value, this.displayName, this.icon);
}

class Aquarium3DModel {
  final String id;
  final String aquariumId;
  final AquariumShape shape;
  final double length; // cm
  final double width; // cm
  final double height; // cm
  final double waterLevel; // percentage (0-100)
  final Color waterColor;
  final Color glassColor;
  final double glassThickness; // cm
  final List<Decoration3D> decorations;
  final List<Equipment3D> equipment;
  final List<Fish3D> fish;
  final LightingSetup lighting;
  final SubstrateLayer substrate;
  final BackgroundImage? background;

  Aquarium3DModel({
    required this.id,
    required this.aquariumId,
    required this.shape,
    required this.length,
    required this.width,
    required this.height,
    this.waterLevel = 90,
    this.waterColor = const Color(0x4D03A9F4), // Semi-transparent blue
    this.glassColor = const Color(0x1A000000), // Very light tint
    this.glassThickness = 1.0,
    this.decorations = const [],
    this.equipment = const [],
    this.fish = const [],
    required this.lighting,
    required this.substrate,
    this.background,
  });

  double get volume {
    switch (shape) {
      case AquariumShape.rectangular:
      case AquariumShape.bowFront:
        return (length * width * height * waterLevel / 100) / 1000; // Convert to liters
      case AquariumShape.cylindrical:
        final radius = length / 2;
        return (math.pi * radius * radius * height * waterLevel / 100) / 1000;
      case AquariumShape.hexagonal:
        // Approximate as 6 triangles
        final side = length / 2;
        final area = (3 * math.sqrt(3) / 2) * side * side;
        return (area * height * waterLevel / 100) / 1000;
      case AquariumShape.corner:
        // Approximate as quarter circle
        final radius = length;
        return (math.pi * radius * radius * height * waterLevel / 100) / 4000;
      case AquariumShape.custom:
        return (length * width * height * waterLevel / 100) / 1000;
    }
  }

  Aquarium3DModel copyWith({
    String? id,
    String? aquariumId,
    AquariumShape? shape,
    double? length,
    double? width,
    double? height,
    double? waterLevel,
    Color? waterColor,
    Color? glassColor,
    double? glassThickness,
    List<Decoration3D>? decorations,
    List<Equipment3D>? equipment,
    List<Fish3D>? fish,
    LightingSetup? lighting,
    SubstrateLayer? substrate,
    BackgroundImage? background,
  }) {
    return Aquarium3DModel(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      shape: shape ?? this.shape,
      length: length ?? this.length,
      width: width ?? this.width,
      height: height ?? this.height,
      waterLevel: waterLevel ?? this.waterLevel,
      waterColor: waterColor ?? this.waterColor,
      glassColor: glassColor ?? this.glassColor,
      glassThickness: glassThickness ?? this.glassThickness,
      decorations: decorations ?? this.decorations,
      equipment: equipment ?? this.equipment,
      fish: fish ?? this.fish,
      lighting: lighting ?? this.lighting,
      substrate: substrate ?? this.substrate,
      background: background ?? this.background,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'shape': shape.value,
    'length': length,
    'width': width,
    'height': height,
    'waterLevel': waterLevel,
    'waterColor': waterColor.value,
    'glassColor': glassColor.value,
    'glassThickness': glassThickness,
    'decorations': decorations.map((d) => d.toJson()).toList(),
    'equipment': equipment.map((e) => e.toJson()).toList(),
    'fish': fish.map((f) => f.toJson()).toList(),
    'lighting': lighting.toJson(),
    'substrate': substrate.toJson(),
    'background': background?.toJson(),
  };

  factory Aquarium3DModel.fromJson(Map<String, dynamic> json) {
    return Aquarium3DModel(
      id: json['id'],
      aquariumId: json['aquariumId'],
      shape: AquariumShape.values.firstWhere(
        (s) => s.value == json['shape'],
        orElse: () => AquariumShape.rectangular,
      ),
      length: json['length'].toDouble(),
      width: json['width'].toDouble(),
      height: json['height'].toDouble(),
      waterLevel: json['waterLevel']?.toDouble() ?? 90,
      waterColor: Color(json['waterColor'] ?? 0x4D03A9F4),
      glassColor: Color(json['glassColor'] ?? 0x1A000000),
      glassThickness: json['glassThickness']?.toDouble() ?? 1.0,
      decorations: (json['decorations'] as List? ?? [])
          .map((d) => Decoration3D.fromJson(d))
          .toList(),
      equipment: (json['equipment'] as List? ?? [])
          .map((e) => Equipment3D.fromJson(e))
          .toList(),
      fish: (json['fish'] as List? ?? [])
          .map((f) => Fish3D.fromJson(f))
          .toList(),
      lighting: LightingSetup.fromJson(json['lighting']),
      substrate: SubstrateLayer.fromJson(json['substrate']),
      background: json['background'] != null 
          ? BackgroundImage.fromJson(json['background'])
          : null,
    );
  }
}

class Decoration3D {
  final String id;
  final DecorationType type;
  final String name;
  final Position3D position;
  final Rotation3D rotation;
  final Scale3D scale;
  final Color color;
  final String? modelPath;
  final Map<String, dynamic> properties;

  Decoration3D({
    required this.id,
    required this.type,
    required this.name,
    required this.position,
    required this.rotation,
    required this.scale,
    required this.color,
    this.modelPath,
    this.properties = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.value,
    'name': name,
    'position': position.toJson(),
    'rotation': rotation.toJson(),
    'scale': scale.toJson(),
    'color': color.value,
    'modelPath': modelPath,
    'properties': properties,
  };

  factory Decoration3D.fromJson(Map<String, dynamic> json) {
    return Decoration3D(
      id: json['id'],
      type: DecorationType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => DecorationType.rock,
      ),
      name: json['name'],
      position: Position3D.fromJson(json['position']),
      rotation: Rotation3D.fromJson(json['rotation']),
      scale: Scale3D.fromJson(json['scale']),
      color: Color(json['color']),
      modelPath: json['modelPath'],
      properties: json['properties'] ?? {},
    );
  }
}

class Equipment3D {
  final String id;
  final String equipmentId;
  final String name;
  final String type;
  final Position3D position;
  final Rotation3D rotation;
  final Scale3D scale;
  final bool isActive;
  final Map<String, dynamic> properties;

  Equipment3D({
    required this.id,
    required this.equipmentId,
    required this.name,
    required this.type,
    required this.position,
    required this.rotation,
    required this.scale,
    this.isActive = true,
    this.properties = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'equipmentId': equipmentId,
    'name': name,
    'type': type,
    'position': position.toJson(),
    'rotation': rotation.toJson(),
    'scale': scale.toJson(),
    'isActive': isActive,
    'properties': properties,
  };

  factory Equipment3D.fromJson(Map<String, dynamic> json) {
    return Equipment3D(
      id: json['id'],
      equipmentId: json['equipmentId'],
      name: json['name'],
      type: json['type'],
      position: Position3D.fromJson(json['position']),
      rotation: Rotation3D.fromJson(json['rotation']),
      scale: Scale3D.fromJson(json['scale']),
      isActive: json['isActive'] ?? true,
      properties: json['properties'] ?? {},
    );
  }
}

class Fish3D {
  final String id;
  final String inhabitantId;
  final String species;
  final String name;
  final double size; // cm
  final Color primaryColor;
  final Color? secondaryColor;
  final String? pattern;
  final Position3D position;
  final double swimSpeed;
  final SwimPattern swimPattern;
  final String? modelPath;

  Fish3D({
    required this.id,
    required this.inhabitantId,
    required this.species,
    required this.name,
    required this.size,
    required this.primaryColor,
    this.secondaryColor,
    this.pattern,
    required this.position,
    this.swimSpeed = 1.0,
    this.swimPattern = SwimPattern.random,
    this.modelPath,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'inhabitantId': inhabitantId,
    'species': species,
    'name': name,
    'size': size,
    'primaryColor': primaryColor.value,
    'secondaryColor': secondaryColor?.value,
    'pattern': pattern,
    'position': position.toJson(),
    'swimSpeed': swimSpeed,
    'swimPattern': swimPattern.name,
    'modelPath': modelPath,
  };

  factory Fish3D.fromJson(Map<String, dynamic> json) {
    return Fish3D(
      id: json['id'],
      inhabitantId: json['inhabitantId'],
      species: json['species'],
      name: json['name'],
      size: json['size'].toDouble(),
      primaryColor: Color(json['primaryColor']),
      secondaryColor: json['secondaryColor'] != null 
          ? Color(json['secondaryColor'])
          : null,
      pattern: json['pattern'],
      position: Position3D.fromJson(json['position']),
      swimSpeed: json['swimSpeed']?.toDouble() ?? 1.0,
      swimPattern: SwimPattern.values.firstWhere(
        (p) => p.name == json['swimPattern'],
        orElse: () => SwimPattern.random,
      ),
      modelPath: json['modelPath'],
    );
  }
}

enum SwimPattern {
  random,
  circular,
  backAndForth,
  schooling,
  surface,
  bottom,
  territorial,
}

class Position3D {
  final double x;
  final double y;
  final double z;

  Position3D({required this.x, required this.y, required this.z});

  Map<String, dynamic> toJson() => {'x': x, 'y': y, 'z': z};

  factory Position3D.fromJson(Map<String, dynamic> json) {
    return Position3D(
      x: json['x'].toDouble(),
      y: json['y'].toDouble(),
      z: json['z'].toDouble(),
    );
  }

  Position3D operator +(Position3D other) {
    return Position3D(
      x: x + other.x,
      y: y + other.y,
      z: z + other.z,
    );
  }

  Position3D operator *(double scalar) {
    return Position3D(
      x: x * scalar,
      y: y * scalar,
      z: z * scalar,
    );
  }

  double distanceTo(Position3D other) {
    final dx = x - other.x;
    final dy = y - other.y;
    final dz = z - other.z;
    return math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

class Rotation3D {
  final double x; // pitch
  final double y; // yaw
  final double z; // roll

  Rotation3D({required this.x, required this.y, required this.z});

  Map<String, dynamic> toJson() => {'x': x, 'y': y, 'z': z};

  factory Rotation3D.fromJson(Map<String, dynamic> json) {
    return Rotation3D(
      x: json['x'].toDouble(),
      y: json['y'].toDouble(),
      z: json['z'].toDouble(),
    );
  }
}

class Scale3D {
  final double x;
  final double y;
  final double z;

  Scale3D({required this.x, required this.y, required this.z});

  factory Scale3D.uniform(double scale) {
    return Scale3D(x: scale, y: scale, z: scale);
  }

  Map<String, dynamic> toJson() => {'x': x, 'y': y, 'z': z};

  factory Scale3D.fromJson(Map<String, dynamic> json) {
    return Scale3D(
      x: json['x'].toDouble(),
      y: json['y'].toDouble(),
      z: json['z'].toDouble(),
    );
  }
}

class LightingSetup {
  final Color ambientColor;
  final double ambientIntensity;
  final List<Light3D> lights;
  final bool isDayNightCycleEnabled;
  final Duration? currentTime;

  LightingSetup({
    this.ambientColor = Colors.white,
    this.ambientIntensity = 0.3,
    this.lights = const [],
    this.isDayNightCycleEnabled = false,
    this.currentTime,
  });

  Map<String, dynamic> toJson() => {
    'ambientColor': ambientColor.value,
    'ambientIntensity': ambientIntensity,
    'lights': lights.map((l) => l.toJson()).toList(),
    'isDayNightCycleEnabled': isDayNightCycleEnabled,
    'currentTime': currentTime?.inSeconds,
  };

  factory LightingSetup.fromJson(Map<String, dynamic> json) {
    return LightingSetup(
      ambientColor: Color(json['ambientColor'] ?? Colors.white.value),
      ambientIntensity: json['ambientIntensity']?.toDouble() ?? 0.3,
      lights: (json['lights'] as List? ?? [])
          .map((l) => Light3D.fromJson(l))
          .toList(),
      isDayNightCycleEnabled: json['isDayNightCycleEnabled'] ?? false,
      currentTime: json['currentTime'] != null
          ? Duration(seconds: json['currentTime'])
          : null,
    );
  }
}

class Light3D {
  final String id;
  final LightType type;
  final Position3D position;
  final Color color;
  final double intensity;
  final double range;
  final bool castShadows;

  Light3D({
    required this.id,
    required this.type,
    required this.position,
    required this.color,
    this.intensity = 1.0,
    this.range = 100,
    this.castShadows = true,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'position': position.toJson(),
    'color': color.value,
    'intensity': intensity,
    'range': range,
    'castShadows': castShadows,
  };

  factory Light3D.fromJson(Map<String, dynamic> json) {
    return Light3D(
      id: json['id'],
      type: LightType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => LightType.point,
      ),
      position: Position3D.fromJson(json['position']),
      color: Color(json['color']),
      intensity: json['intensity']?.toDouble() ?? 1.0,
      range: json['range']?.toDouble() ?? 100,
      castShadows: json['castShadows'] ?? true,
    );
  }
}

enum LightType {
  directional,
  point,
  spot,
  area,
}

class SubstrateLayer {
  final String type;
  final Color color;
  final double thickness; // cm
  final double grainSize; // mm
  final String? texture;

  SubstrateLayer({
    required this.type,
    required this.color,
    required this.thickness,
    this.grainSize = 2.0,
    this.texture,
  });

  Map<String, dynamic> toJson() => {
    'type': type,
    'color': color.value,
    'thickness': thickness,
    'grainSize': grainSize,
    'texture': texture,
  };

  factory SubstrateLayer.fromJson(Map<String, dynamic> json) {
    return SubstrateLayer(
      type: json['type'],
      color: Color(json['color']),
      thickness: json['thickness'].toDouble(),
      grainSize: json['grainSize']?.toDouble() ?? 2.0,
      texture: json['texture'],
    );
  }
}

class BackgroundImage {
  final String? imagePath;
  final Color? solidColor;
  final Gradient? gradient;
  final double opacity;

  BackgroundImage({
    this.imagePath,
    this.solidColor,
    this.gradient,
    this.opacity = 1.0,
  });

  Map<String, dynamic> toJson() => {
    'imagePath': imagePath,
    'solidColor': solidColor?.value,
    'opacity': opacity,
    // Note: Gradient serialization would need custom implementation
  };

  factory BackgroundImage.fromJson(Map<String, dynamic> json) {
    return BackgroundImage(
      imagePath: json['imagePath'],
      solidColor: json['solidColor'] != null 
          ? Color(json['solidColor'])
          : null,
      opacity: json['opacity']?.toDouble() ?? 1.0,
    );
  }
}