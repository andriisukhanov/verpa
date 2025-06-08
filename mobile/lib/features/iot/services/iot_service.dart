import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/iot_device.dart';
import '../../aquarium/models/water_parameters.dart';

class IoTService {
  static const String _devicesKey = 'iot_devices';
  static const String _mqttBroker = 'broker.hivemq.com';
  static const int _mqttPort = 1883;
  
  static MqttServerClient? _mqttClient;
  static final Map<String, StreamController<IoTDevice>> _deviceStreams = {};
  static final Map<String, Timer> _pollingTimers = {};
  static Timer? _discoveryTimer;
  
  // Initialize IoT service
  static Future<void> initialize() async {
    await _initializeMQTT();
    await _startDeviceDiscovery();
  }

  // Initialize MQTT connection
  static Future<void> _initializeMQTT() async {
    try {
      _mqttClient = MqttServerClient(_mqttBroker, 'verpa_${const Uuid().v4()}');
      _mqttClient!.port = _mqttPort;
      _mqttClient!.logging(on: false);
      _mqttClient!.keepAlivePeriod = 30;
      _mqttClient!.autoReconnect = true;
      
      final connMessage = MqttConnectMessage()
          .withClientIdentifier(_mqttClient!.clientIdentifier)
          .startClean()
          .withWillQos(MqttQos.atLeastOnce);
      
      _mqttClient!.connectionMessage = connMessage;
      
      await _mqttClient!.connect();
      
      _mqttClient!.updates!.listen((List<MqttReceivedMessage<MqttMessage>> messages) {
        for (final message in messages) {
          _handleMQTTMessage(message);
        }
      });
    } catch (e) {
      print('MQTT connection failed: $e');
    }
  }

  // Handle incoming MQTT messages
  static void _handleMQTTMessage(MqttReceivedMessage<MqttMessage> message) {
    final topic = message.topic;
    final payload = MqttPublishPayload.bytesToStringAsString(
      (message.payload as MqttPublishMessage).payload.message,
    );
    
    try {
      final data = json.decode(payload);
      
      // Parse device ID from topic (format: verpa/device/{deviceId}/status)
      final parts = topic.split('/');
      if (parts.length >= 3 && parts[0] == 'verpa' && parts[1] == 'device') {
        final deviceId = parts[2];
        
        // Update device status
        if (parts.length >= 4 && parts[3] == 'status') {
          _updateDeviceFromMQTT(deviceId, data);
        }
      }
    } catch (e) {
      print('Failed to parse MQTT message: $e');
    }
  }

  // Update device from MQTT data
  static Future<void> _updateDeviceFromMQTT(String deviceId, Map<String, dynamic> data) async {
    final devices = await getDevices();
    final deviceIndex = devices.indexWhere((d) => d.id == deviceId);
    
    if (deviceIndex != -1) {
      final device = devices[deviceIndex];
      final updatedDevice = device.copyWith(
        status: DeviceStatus.connected,
        currentReadings: data['readings'] ?? {},
        lastSeen: DateTime.now(),
      );
      
      devices[deviceIndex] = updatedDevice;
      await _saveDevices(devices);
      
      // Notify listeners
      _deviceStreams[deviceId]?.add(updatedDevice);
    }
  }

  // Start device discovery
  static Future<void> _startDeviceDiscovery() async {
    _discoveryTimer?.cancel();
    _discoveryTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _discoverDevices();
    });
    
    // Initial discovery
    _discoverDevices();
  }

  // Discover IoT devices on network
  static Future<void> _discoverDevices() async {
    // Check permissions
    final wifiPermission = await Permission.locationWhenInUse.request();
    if (!wifiPermission.isGranted) return;
    
    try {
      // Discover via mDNS/Bonjour
      await _discoverMDNSDevices();
      
      // Discover via Bluetooth
      await _discoverBluetoothDevices();
      
      // Discover via network scan
      await _discoverNetworkDevices();
    } catch (e) {
      print('Device discovery error: $e');
    }
  }

  // Discover devices via mDNS
  static Future<void> _discoverMDNSDevices() async {
    // This would use a package like multicast_dns to discover devices
    // For now, we'll simulate discovery
    
    // Simulated discovered device
    final device = IoTDevice(
      id: 'sim_temp_001',
      aquariumId: '',
      name: 'Smart Temperature Sensor',
      type: DeviceType.temperatureSensor,
      connectionType: ConnectionType.wifi,
      manufacturer: 'AquaTech',
      model: 'AT-TEMP-01',
      status: DeviceStatus.disconnected,
      lastSeen: DateTime.now(),
      addedAt: DateTime.now(),
      capabilities: [
        DeviceCapability(
          id: 'temperature',
          type: CapabilityType.sensor,
          name: 'Temperature',
          minValue: 0,
          maxValue: 50,
          currentValue: 25.5,
          unit: '°C',
          isReadOnly: true,
        ),
      ],
    );
    
    // Emit discovery event
    _onDeviceDiscovered(device);
  }

  // Discover Bluetooth devices
  static Future<void> _discoverBluetoothDevices() async {
    try {
      final bluetoothEnabled = await FlutterBluetoothSerial.instance.isEnabled;
      if (!bluetoothEnabled) return;
      
      final devices = await FlutterBluetoothSerial.instance.getBondedDevices();
      
      for (final device in devices) {
        if (_isAquariumDevice(device.name ?? '')) {
          final iotDevice = IoTDevice(
            id: device.address ?? const Uuid().v4(),
            aquariumId: '',
            name: device.name ?? 'Unknown Device',
            type: _detectDeviceType(device.name ?? ''),
            connectionType: ConnectionType.bluetooth,
            status: DeviceStatus.disconnected,
            lastSeen: DateTime.now(),
            addedAt: DateTime.now(),
            connectionInfo: ConnectionInfo(
              macAddress: device.address,
            ),
          );
          
          _onDeviceDiscovered(iotDevice);
        }
      }
    } catch (e) {
      print('Bluetooth discovery error: $e');
    }
  }

  // Discover devices on local network
  static Future<void> _discoverNetworkDevices() async {
    try {
      final info = NetworkInfo();
      final wifiIP = await info.getWifiIP();
      
      if (wifiIP != null) {
        // Scan common IoT ports
        // This is a simplified example - real implementation would be more sophisticated
        final subnet = wifiIP.substring(0, wifiIP.lastIndexOf('.'));
        
        for (int i = 1; i <= 254; i++) {
          final ip = '$subnet.$i';
          // Check if device responds to API calls
          _checkDeviceAPI(ip);
        }
      }
    } catch (e) {
      print('Network discovery error: $e');
    }
  }

  // Check if IP has aquarium device API
  static Future<void> _checkDeviceAPI(String ip) async {
    // This would make HTTP requests to check for device APIs
    // For now, we'll skip implementation
  }

  // Check if device name indicates aquarium device
  static bool _isAquariumDevice(String name) {
    final keywords = [
      'aqua', 'fish', 'reef', 'marine', 'temp', 'ph',
      'light', 'pump', 'filter', 'heater', 'doser',
      'wave', 'protein', 'skimmer', 'water'
    ];
    
    final lowerName = name.toLowerCase();
    return keywords.any((keyword) => lowerName.contains(keyword));
  }

  // Detect device type from name
  static DeviceType _detectDeviceType(String name) {
    final lowerName = name.toLowerCase();
    
    if (lowerName.contains('temp')) return DeviceType.temperatureSensor;
    if (lowerName.contains('ph')) return DeviceType.phSensor;
    if (lowerName.contains('light')) return DeviceType.lightController;
    if (lowerName.contains('heat')) return DeviceType.heaterController;
    if (lowerName.contains('filter')) return DeviceType.filterController;
    if (lowerName.contains('feed')) return DeviceType.feeder;
    if (lowerName.contains('dos')) return DeviceType.dosingPump;
    if (lowerName.contains('wave')) return DeviceType.wavemaker;
    if (lowerName.contains('skim')) return DeviceType.proteinSkimmer;
    
    return DeviceType.multiParameter;
  }

  // Handle discovered device
  static void _onDeviceDiscovered(IoTDevice device) {
    // Notify UI about discovered device
    // This could use an event bus or stream
    print('Discovered device: ${device.name}');
  }

  // Get all devices
  static Future<List<IoTDevice>> getDevices() async {
    final prefs = await SharedPreferences.getInstance();
    final devicesJson = prefs.getString(_devicesKey);
    
    if (devicesJson != null) {
      final List<dynamic> devicesList = json.decode(devicesJson);
      return devicesList.map((d) => IoTDevice.fromJson(d)).toList();
    }
    
    return [];
  }

  // Get devices for aquarium
  static Future<List<IoTDevice>> getDevicesForAquarium(String aquariumId) async {
    final devices = await getDevices();
    return devices.where((d) => d.aquariumId == aquariumId).toList();
  }

  // Add device to aquarium
  static Future<void> addDevice(IoTDevice device) async {
    final devices = await getDevices();
    devices.add(device);
    await _saveDevices(devices);
    
    // Subscribe to device updates
    if (device.connectionType == ConnectionType.mqtt && _mqttClient?.connectionStatus?.state == MqttConnectionState.connected) {
      final topic = 'verpa/device/${device.id}/+';
      _mqttClient!.subscribe(topic, MqttQos.atLeastOnce);
    }
    
    // Start polling if needed
    _startDevicePolling(device);
  }

  // Update device
  static Future<void> updateDevice(IoTDevice device) async {
    final devices = await getDevices();
    final index = devices.indexWhere((d) => d.id == device.id);
    
    if (index != -1) {
      devices[index] = device;
      await _saveDevices(devices);
      _deviceStreams[device.id]?.add(device);
    }
  }

  // Remove device
  static Future<void> removeDevice(String deviceId) async {
    final devices = await getDevices();
    devices.removeWhere((d) => d.id == deviceId);
    await _saveDevices(devices);
    
    // Unsubscribe from MQTT
    if (_mqttClient?.connectionStatus?.state == MqttConnectionState.connected) {
      final topic = 'verpa/device/$deviceId/+';
      _mqttClient!.unsubscribe(topic);
    }
    
    // Stop polling
    _pollingTimers[deviceId]?.cancel();
    _pollingTimers.remove(deviceId);
    
    // Close stream
    _deviceStreams[deviceId]?.close();
    _deviceStreams.remove(deviceId);
  }

  // Save devices
  static Future<void> _saveDevices(List<IoTDevice> devices) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _devicesKey,
      json.encode(devices.map((d) => d.toJson()).toList()),
    );
  }

  // Connect to device
  static Future<bool> connectDevice(String deviceId) async {
    final devices = await getDevices();
    final device = devices.firstWhere((d) => d.id == deviceId);
    
    switch (device.connectionType) {
      case ConnectionType.wifi:
      case ConnectionType.api:
        return _connectWiFiDevice(device);
      case ConnectionType.bluetooth:
        return _connectBluetoothDevice(device);
      case ConnectionType.mqtt:
        return _connectMQTTDevice(device);
      default:
        return false;
    }
  }

  // Connect to WiFi device
  static Future<bool> _connectWiFiDevice(IoTDevice device) async {
    // Implement WiFi/API connection
    // This would make HTTP requests to the device
    
    // Simulate connection
    await Future.delayed(const Duration(seconds: 2));
    
    await updateDevice(device.copyWith(
      status: DeviceStatus.connected,
      lastSeen: DateTime.now(),
    ));
    
    return true;
  }

  // Connect to Bluetooth device
  static Future<bool> _connectBluetoothDevice(IoTDevice device) async {
    try {
      final bluetooth = FlutterBluetoothSerial.instance;
      
      // Connect to device
      final connection = await BluetoothConnection.toAddress(
        device.connectionInfo?.macAddress ?? '',
      );
      
      // Handle data
      connection.input?.listen((data) {
        _handleBluetoothData(device.id, data);
      });
      
      await updateDevice(device.copyWith(
        status: DeviceStatus.connected,
        lastSeen: DateTime.now(),
      ));
      
      return true;
    } catch (e) {
      print('Bluetooth connection failed: $e');
      return false;
    }
  }

  // Connect to MQTT device
  static Future<bool> _connectMQTTDevice(IoTDevice device) async {
    if (_mqttClient?.connectionStatus?.state != MqttConnectionState.connected) {
      await _initializeMQTT();
    }
    
    if (_mqttClient?.connectionStatus?.state == MqttConnectionState.connected) {
      // Subscribe to device topics
      final topic = 'verpa/device/${device.id}/+';
      _mqttClient!.subscribe(topic, MqttQos.atLeastOnce);
      
      // Send connect command
      final connectTopic = 'verpa/device/${device.id}/command';
      final builder = MqttClientPayloadBuilder();
      builder.addString(json.encode({'command': 'connect'}));
      
      _mqttClient!.publishMessage(
        connectTopic,
        MqttQos.exactlyOnce,
        builder.payload!,
      );
      
      return true;
    }
    
    return false;
  }

  // Handle Bluetooth data
  static void _handleBluetoothData(String deviceId, List<int> data) {
    try {
      final jsonStr = String.fromCharCodes(data);
      final jsonData = json.decode(jsonStr);
      
      _updateDeviceFromData(deviceId, jsonData);
    } catch (e) {
      print('Failed to parse Bluetooth data: $e');
    }
  }

  // Update device from received data
  static Future<void> _updateDeviceFromData(String deviceId, Map<String, dynamic> data) async {
    final devices = await getDevices();
    final deviceIndex = devices.indexWhere((d) => d.id == deviceId);
    
    if (deviceIndex != -1) {
      final device = devices[deviceIndex];
      final updatedDevice = device.copyWith(
        currentReadings: data,
        lastSeen: DateTime.now(),
      );
      
      devices[deviceIndex] = updatedDevice;
      await _saveDevices(devices);
      
      _deviceStreams[deviceId]?.add(updatedDevice);
      
      // Check for alerts
      _checkDeviceAlerts(updatedDevice);
    }
  }

  // Start device polling
  static void _startDevicePolling(IoTDevice device) {
    if (device.connectionType == ConnectionType.api ||
        device.connectionType == ConnectionType.wifi) {
      
      _pollingTimers[device.id]?.cancel();
      
      _pollingTimers[device.id] = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _pollDevice(device),
      );
      
      // Initial poll
      _pollDevice(device);
    }
  }

  // Poll device for updates
  static Future<void> _pollDevice(IoTDevice device) async {
    // This would make HTTP requests to get device status
    // For now, simulate with random data
    
    final random = DateTime.now().millisecondsSinceEpoch % 100;
    final readings = {
      'temperature': 25.0 + (random / 100),
      'status': 'online',
      'lastUpdate': DateTime.now().toIso8601String(),
    };
    
    await _updateDeviceFromData(device.id, readings);
  }

  // Send command to device
  static Future<bool> sendCommand(DeviceCommand command) async {
    final devices = await getDevices();
    final device = devices.firstWhere((d) => d.id == command.deviceId);
    
    switch (device.connectionType) {
      case ConnectionType.mqtt:
        return _sendMQTTCommand(device, command);
      case ConnectionType.api:
      case ConnectionType.wifi:
        return _sendAPICommand(device, command);
      case ConnectionType.bluetooth:
        return _sendBluetoothCommand(device, command);
      default:
        return false;
    }
  }

  // Send MQTT command
  static Future<bool> _sendMQTTCommand(IoTDevice device, DeviceCommand command) async {
    if (_mqttClient?.connectionStatus?.state != MqttConnectionState.connected) {
      return false;
    }
    
    final topic = 'verpa/device/${device.id}/command';
    final builder = MqttClientPayloadBuilder();
    builder.addString(json.encode(command.toJson()));
    
    _mqttClient!.publishMessage(
      topic,
      MqttQos.exactlyOnce,
      builder.payload!,
    );
    
    return true;
  }

  // Send API command
  static Future<bool> _sendAPICommand(IoTDevice device, DeviceCommand command) async {
    // This would make HTTP requests to device API
    // For now, simulate success
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }

  // Send Bluetooth command
  static Future<bool> _sendBluetoothCommand(IoTDevice device, DeviceCommand command) async {
    // This would send data via Bluetooth connection
    // For now, simulate success
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }

  // Get device stream
  static Stream<IoTDevice> getDeviceStream(String deviceId) {
    _deviceStreams[deviceId] ??= StreamController<IoTDevice>.broadcast();
    return _deviceStreams[deviceId]!.stream;
  }

  // Check device alerts
  static void _checkDeviceAlerts(IoTDevice device) {
    final alerts = <DeviceAlert>[];
    
    // Check temperature
    if (device.type == DeviceType.temperatureSensor) {
      final temp = device.currentReadings['temperature'] as double?;
      if (temp != null) {
        if (temp < 22) {
          alerts.add(DeviceAlert(
            id: const Uuid().v4(),
            severity: AlertSeverity.warning,
            title: 'Low Temperature',
            message: 'Temperature is below optimal range',
            triggeredAt: DateTime.now(),
            data: {'temperature': temp},
          ));
        } else if (temp > 28) {
          alerts.add(DeviceAlert(
            id: const Uuid().v4(),
            severity: AlertSeverity.warning,
            title: 'High Temperature',
            message: 'Temperature is above optimal range',
            triggeredAt: DateTime.now(),
            data: {'temperature': temp},
          ));
        }
      }
    }
    
    // Update device with alerts
    if (alerts.isNotEmpty) {
      updateDevice(device.copyWith(activeAlerts: alerts));
    }
  }

  // Create water parameters from device readings
  static WaterParameters? createParametersFromDevices(List<IoTDevice> devices) {
    double? temperature;
    double? ph;
    double? ammonia;
    double? nitrite;
    double? nitrate;
    
    for (final device in devices) {
      switch (device.type) {
        case DeviceType.temperatureSensor:
          temperature ??= device.currentReadings['temperature'] as double?;
          break;
        case DeviceType.phSensor:
          ph ??= device.currentReadings['ph'] as double?;
          break;
        case DeviceType.multiParameter:
          temperature ??= device.currentReadings['temperature'] as double?;
          ph ??= device.currentReadings['ph'] as double?;
          ammonia ??= device.currentReadings['ammonia'] as double?;
          nitrite ??= device.currentReadings['nitrite'] as double?;
          nitrate ??= device.currentReadings['nitrate'] as double?;
          break;
        default:
          break;
      }
    }
    
    if (temperature != null || ph != null || ammonia != null || 
        nitrite != null || nitrate != null) {
      return WaterParameters(
        temperature: temperature,
        ph: ph,
        ammonia: ammonia,
        nitrite: nitrite,
        nitrate: nitrate,
        recordedAt: DateTime.now(),
        notes: 'Recorded from IoT devices',
      );
    }
    
    return null;
  }

  // Cleanup
  static void dispose() {
    _discoveryTimer?.cancel();
    
    for (final timer in _pollingTimers.values) {
      timer.cancel();
    }
    _pollingTimers.clear();
    
    for (final stream in _deviceStreams.values) {
      stream.close();
    }
    _deviceStreams.clear();
    
    _mqttClient?.disconnect();
  }
}