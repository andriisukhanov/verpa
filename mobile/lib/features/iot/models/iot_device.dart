import 'package:flutter/material.dart';

enum DeviceType {
  temperatureSensor('temperature_sensor', 'Temperature Sensor', Icons.thermostat),
  phSensor('ph_sensor', 'pH Sensor', Icons.science),
  lightController('light_controller', 'Light Controller', Icons.light_mode),
  heaterController('heater_controller', 'Heater Controller', Icons.local_fire_department),
  filterController('filter_controller', 'Filter Controller', Icons.air),
  feeder('auto_feeder', 'Auto Feeder', Icons.restaurant),
  dosingPump('dosing_pump', 'Dosing Pump', Icons.water_drop),
  wavemaker('wavemaker', 'Wavemaker', Icons.waves),
  proteinSkimmer('protein_skimmer', 'Protein Skimmer', Icons.bubble_chart),
  waterLevelSensor('water_level', 'Water Level Sensor', Icons.water),
  multiParameter('multi_parameter', 'Multi-Parameter Monitor', Icons.dashboard);

  final String value;
  final String displayName;
  final IconData icon;

  const DeviceType(this.value, this.displayName, this.icon);
}

enum ConnectionType {
  wifi('wifi', 'Wi-Fi'),
  bluetooth('bluetooth', 'Bluetooth'),
  zigbee('zigbee', 'Zigbee'),
  zwave('zwave', 'Z-Wave'),
  mqtt('mqtt', 'MQTT'),
  api('api', 'API');

  final String value;
  final String displayName;

  const ConnectionType(this.value, this.displayName);
}

enum DeviceStatus {
  connected('connected', 'Connected', Color(0xFF4CAF50)),
  disconnected('disconnected', 'Disconnected', Color(0xFF9E9E9E)),
  error('error', 'Error', Color(0xFFF44336)),
  updating('updating', 'Updating', Color(0xFF2196F3)),
  configuring('configuring', 'Configuring', Color(0xFFFF9800));

  final String value;
  final String displayName;
  final Color color;

  const DeviceStatus(this.value, this.displayName, this.color);
}

class IoTDevice {
  final String id;
  final String aquariumId;
  final String name;
  final DeviceType type;
  final ConnectionType connectionType;
  final String? manufacturer;
  final String? model;
  final String? serialNumber;
  final String? firmwareVersion;
  final DeviceStatus status;
  final Map<String, dynamic> configuration;
  final Map<String, dynamic> currentReadings;
  final DateTime lastSeen;
  final DateTime addedAt;
  final bool isControllable;
  final List<DeviceCapability> capabilities;
  final List<DeviceAlert> activeAlerts;
  final ConnectionInfo? connectionInfo;

  IoTDevice({
    required this.id,
    required this.aquariumId,
    required this.name,
    required this.type,
    required this.connectionType,
    this.manufacturer,
    this.model,
    this.serialNumber,
    this.firmwareVersion,
    this.status = DeviceStatus.disconnected,
    this.configuration = const {},
    this.currentReadings = const {},
    required this.lastSeen,
    required this.addedAt,
    this.isControllable = false,
    this.capabilities = const [],
    this.activeAlerts = const [],
    this.connectionInfo,
  });

  bool get isOnline => status == DeviceStatus.connected;

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'name': name,
    'type': type.value,
    'connectionType': connectionType.value,
    'manufacturer': manufacturer,
    'model': model,
    'serialNumber': serialNumber,
    'firmwareVersion': firmwareVersion,
    'status': status.value,
    'configuration': configuration,
    'currentReadings': currentReadings,
    'lastSeen': lastSeen.toIso8601String(),
    'addedAt': addedAt.toIso8601String(),
    'isControllable': isControllable,
    'capabilities': capabilities.map((c) => c.toJson()).toList(),
    'activeAlerts': activeAlerts.map((a) => a.toJson()).toList(),
    'connectionInfo': connectionInfo?.toJson(),
  };

  factory IoTDevice.fromJson(Map<String, dynamic> json) {
    return IoTDevice(
      id: json['id'],
      aquariumId: json['aquariumId'],
      name: json['name'],
      type: DeviceType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => DeviceType.temperatureSensor,
      ),
      connectionType: ConnectionType.values.firstWhere(
        (t) => t.value == json['connectionType'],
        orElse: () => ConnectionType.wifi,
      ),
      manufacturer: json['manufacturer'],
      model: json['model'],
      serialNumber: json['serialNumber'],
      firmwareVersion: json['firmwareVersion'],
      status: DeviceStatus.values.firstWhere(
        (s) => s.value == json['status'],
        orElse: () => DeviceStatus.disconnected,
      ),
      configuration: json['configuration'] ?? {},
      currentReadings: json['currentReadings'] ?? {},
      lastSeen: DateTime.parse(json['lastSeen']),
      addedAt: DateTime.parse(json['addedAt']),
      isControllable: json['isControllable'] ?? false,
      capabilities: (json['capabilities'] as List? ?? [])
          .map((c) => DeviceCapability.fromJson(c))
          .toList(),
      activeAlerts: (json['activeAlerts'] as List? ?? [])
          .map((a) => DeviceAlert.fromJson(a))
          .toList(),
      connectionInfo: json['connectionInfo'] != null
          ? ConnectionInfo.fromJson(json['connectionInfo'])
          : null,
    );
  }

  IoTDevice copyWith({
    String? name,
    DeviceStatus? status,
    Map<String, dynamic>? configuration,
    Map<String, dynamic>? currentReadings,
    DateTime? lastSeen,
    List<DeviceAlert>? activeAlerts,
  }) {
    return IoTDevice(
      id: id,
      aquariumId: aquariumId,
      name: name ?? this.name,
      type: type,
      connectionType: connectionType,
      manufacturer: manufacturer,
      model: model,
      serialNumber: serialNumber,
      firmwareVersion: firmwareVersion,
      status: status ?? this.status,
      configuration: configuration ?? this.configuration,
      currentReadings: currentReadings ?? this.currentReadings,
      lastSeen: lastSeen ?? this.lastSeen,
      addedAt: addedAt,
      isControllable: isControllable,
      capabilities: capabilities,
      activeAlerts: activeAlerts ?? this.activeAlerts,
      connectionInfo: connectionInfo,
    );
  }
}

class DeviceCapability {
  final String id;
  final CapabilityType type;
  final String name;
  final dynamic minValue;
  final dynamic maxValue;
  final dynamic currentValue;
  final String? unit;
  final bool isReadOnly;
  final Map<String, dynamic> metadata;

  DeviceCapability({
    required this.id,
    required this.type,
    required this.name,
    this.minValue,
    this.maxValue,
    this.currentValue,
    this.unit,
    this.isReadOnly = true,
    this.metadata = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.value,
    'name': name,
    'minValue': minValue,
    'maxValue': maxValue,
    'currentValue': currentValue,
    'unit': unit,
    'isReadOnly': isReadOnly,
    'metadata': metadata,
  };

  factory DeviceCapability.fromJson(Map<String, dynamic> json) {
    return DeviceCapability(
      id: json['id'],
      type: CapabilityType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => CapabilityType.sensor,
      ),
      name: json['name'],
      minValue: json['minValue'],
      maxValue: json['maxValue'],
      currentValue: json['currentValue'],
      unit: json['unit'],
      isReadOnly: json['isReadOnly'] ?? true,
      metadata: json['metadata'] ?? {},
    );
  }
}

enum CapabilityType {
  sensor('sensor', 'Sensor'),
  switch_('switch', 'Switch'),
  dimmer('dimmer', 'Dimmer'),
  thermostat('thermostat', 'Thermostat'),
  timer('timer', 'Timer'),
  schedule('schedule', 'Schedule'),
  alarm('alarm', 'Alarm');

  final String value;
  final String displayName;

  const CapabilityType(this.value, this.displayName);
}

class DeviceAlert {
  final String id;
  final AlertSeverity severity;
  final String title;
  final String message;
  final DateTime triggeredAt;
  final bool isAcknowledged;
  final Map<String, dynamic> data;

  DeviceAlert({
    required this.id,
    required this.severity,
    required this.title,
    required this.message,
    required this.triggeredAt,
    this.isAcknowledged = false,
    this.data = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'severity': severity.value,
    'title': title,
    'message': message,
    'triggeredAt': triggeredAt.toIso8601String(),
    'isAcknowledged': isAcknowledged,
    'data': data,
  };

  factory DeviceAlert.fromJson(Map<String, dynamic> json) {
    return DeviceAlert(
      id: json['id'],
      severity: AlertSeverity.values.firstWhere(
        (s) => s.value == json['severity'],
        orElse: () => AlertSeverity.info,
      ),
      title: json['title'],
      message: json['message'],
      triggeredAt: DateTime.parse(json['triggeredAt']),
      isAcknowledged: json['isAcknowledged'] ?? false,
      data: json['data'] ?? {},
    );
  }
}

enum AlertSeverity {
  info('info', 'Info', Color(0xFF2196F3)),
  warning('warning', 'Warning', Color(0xFFFF9800)),
  error('error', 'Error', Color(0xFFF44336)),
  critical('critical', 'Critical', Color(0xFF9C27B0));

  final String value;
  final String displayName;
  final Color color;

  const AlertSeverity(this.value, this.displayName, this.color);
}

class ConnectionInfo {
  final String? ipAddress;
  final String? macAddress;
  final int? port;
  final String? ssid;
  final int? signalStrength;
  final Map<String, dynamic> additionalInfo;

  ConnectionInfo({
    this.ipAddress,
    this.macAddress,
    this.port,
    this.ssid,
    this.signalStrength,
    this.additionalInfo = const {},
  });

  Map<String, dynamic> toJson() => {
    'ipAddress': ipAddress,
    'macAddress': macAddress,
    'port': port,
    'ssid': ssid,
    'signalStrength': signalStrength,
    'additionalInfo': additionalInfo,
  };

  factory ConnectionInfo.fromJson(Map<String, dynamic> json) {
    return ConnectionInfo(
      ipAddress: json['ipAddress'],
      macAddress: json['macAddress'],
      port: json['port'],
      ssid: json['ssid'],
      signalStrength: json['signalStrength'],
      additionalInfo: json['additionalInfo'] ?? {},
    );
  }
}

class DeviceCommand {
  final String deviceId;
  final CommandType type;
  final Map<String, dynamic> parameters;
  final DateTime timestamp;

  DeviceCommand({
    required this.deviceId,
    required this.type,
    this.parameters = const {},
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'deviceId': deviceId,
    'type': type.value,
    'parameters': parameters,
    'timestamp': timestamp.toIso8601String(),
  };
}

enum CommandType {
  turnOn('turn_on'),
  turnOff('turn_off'),
  setValue('set_value'),
  setSchedule('set_schedule'),
  calibrate('calibrate'),
  reset('reset'),
  updateFirmware('update_firmware'),
  reboot('reboot');

  final String value;

  const CommandType(this.value);
}

class DeviceSchedule {
  final String id;
  final String deviceId;
  final String name;
  final bool isEnabled;
  final List<ScheduleEntry> entries;
  final Map<String, dynamic> parameters;

  DeviceSchedule({
    required this.id,
    required this.deviceId,
    required this.name,
    this.isEnabled = true,
    required this.entries,
    this.parameters = const {},
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'deviceId': deviceId,
    'name': name,
    'isEnabled': isEnabled,
    'entries': entries.map((e) => e.toJson()).toList(),
    'parameters': parameters,
  };

  factory DeviceSchedule.fromJson(Map<String, dynamic> json) {
    return DeviceSchedule(
      id: json['id'],
      deviceId: json['deviceId'],
      name: json['name'],
      isEnabled: json['isEnabled'] ?? true,
      entries: (json['entries'] as List? ?? [])
          .map((e) => ScheduleEntry.fromJson(e))
          .toList(),
      parameters: json['parameters'] ?? {},
    );
  }
}

class ScheduleEntry {
  final TimeOfDay time;
  final List<int> daysOfWeek; // 1-7, where 1 is Monday
  final CommandType command;
  final Map<String, dynamic> parameters;

  ScheduleEntry({
    required this.time,
    required this.daysOfWeek,
    required this.command,
    this.parameters = const {},
  });

  Map<String, dynamic> toJson() => {
    'time': '${time.hour}:${time.minute}',
    'daysOfWeek': daysOfWeek,
    'command': command.value,
    'parameters': parameters,
  };

  factory ScheduleEntry.fromJson(Map<String, dynamic> json) {
    final timeParts = (json['time'] as String).split(':');
    return ScheduleEntry(
      time: TimeOfDay(
        hour: int.parse(timeParts[0]),
        minute: int.parse(timeParts[1]),
      ),
      daysOfWeek: List<int>.from(json['daysOfWeek'] ?? []),
      command: CommandType.values.firstWhere(
        (c) => c.value == json['command'],
        orElse: () => CommandType.turnOn,
      ),
      parameters: json['parameters'] ?? {},
    );
  }
}