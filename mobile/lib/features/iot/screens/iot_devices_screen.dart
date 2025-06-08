import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/iot_device.dart';
import '../services/iot_service.dart';

class IoTDevicesScreen extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;

  const IoTDevicesScreen({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
  });

  @override
  State<IoTDevicesScreen> createState() => _IoTDevicesScreenState();
}

class _IoTDevicesScreenState extends State<IoTDevicesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<IoTDevice>? _devices;
  List<IoTDevice> _discoveredDevices = [];
  bool _isLoading = true;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadDevices();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDevices() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final devices = await IoTService.getDevicesForAquarium(widget.aquariumId);
      setState(() {
        _devices = devices;
        _isLoading = false;
      });

      // Subscribe to device updates
      for (final device in devices) {
        IoTService.getDeviceStream(device.id).listen((updatedDevice) {
          if (mounted) {
            setState(() {
              final index = _devices!.indexWhere((d) => d.id == updatedDevice.id);
              if (index != -1) {
                _devices![index] = updatedDevice;
              }
            });
          }
        });
      }
    } catch (e) {
      setState(() {
        _devices = [];
        _isLoading = false;
      });
    }
  }

  Future<void> _scanForDevices() async {
    setState(() {
      _isScanning = true;
      _discoveredDevices.clear();
    });

    // Simulate device discovery
    await Future.delayed(const Duration(seconds: 3));

    setState(() {
      _discoveredDevices = [
        IoTDevice(
          id: 'demo_temp_001',
          aquariumId: '',
          name: 'Smart Temperature Monitor',
          type: DeviceType.temperatureSensor,
          connectionType: ConnectionType.wifi,
          manufacturer: 'AquaTech',
          model: 'AT-TEMP-PRO',
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
              unit: '°C',
            ),
          ],
        ),
        IoTDevice(
          id: 'demo_ph_001',
          aquariumId: '',
          name: 'pH Controller',
          type: DeviceType.phSensor,
          connectionType: ConnectionType.bluetooth,
          manufacturer: 'ReefMaster',
          model: 'RM-PH-2000',
          status: DeviceStatus.disconnected,
          lastSeen: DateTime.now(),
          addedAt: DateTime.now(),
          isControllable: true,
          capabilities: [
            DeviceCapability(
              id: 'ph',
              type: CapabilityType.sensor,
              name: 'pH Level',
              minValue: 0,
              maxValue: 14,
              unit: '',
            ),
            DeviceCapability(
              id: 'calibrate',
              type: CapabilityType.switch_,
              name: 'Calibration Mode',
              isReadOnly: false,
            ),
          ],
        ),
        IoTDevice(
          id: 'demo_light_001',
          aquariumId: '',
          name: 'LED Light Controller',
          type: DeviceType.lightController,
          connectionType: ConnectionType.wifi,
          manufacturer: 'AquaIlluminate',
          model: 'AI-PRIME-HD',
          status: DeviceStatus.disconnected,
          lastSeen: DateTime.now(),
          addedAt: DateTime.now(),
          isControllable: true,
          capabilities: [
            DeviceCapability(
              id: 'power',
              type: CapabilityType.switch_,
              name: 'Power',
              isReadOnly: false,
            ),
            DeviceCapability(
              id: 'brightness',
              type: CapabilityType.dimmer,
              name: 'Brightness',
              minValue: 0,
              maxValue: 100,
              unit: '%',
              isReadOnly: false,
            ),
            DeviceCapability(
              id: 'color_temp',
              type: CapabilityType.dimmer,
              name: 'Color Temperature',
              minValue: 2700,
              maxValue: 6500,
              unit: 'K',
              isReadOnly: false,
            ),
          ],
        ),
      ];
      _isScanning = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('IoT Devices'),
            Text(
              widget.aquariumName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'My Devices'),
            Tab(text: 'Add Device'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: _showHelpDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : TabBarView(
              controller: _tabController,
              children: [
                _buildMyDevicesTab(),
                _buildAddDeviceTab(),
              ],
            ),
    );
  }

  Widget _buildMyDevicesTab() {
    if (_devices == null || _devices!.isEmpty) {
      return EmptyState(
        icon: Icons.devices,
        title: 'No IoT Devices',
        message: 'Connect smart devices to automate your aquarium',
        actionLabel: 'Add Device',
        onAction: () {
          _tabController.animateTo(1);
        },
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDevices,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _devices!.length,
        itemBuilder: (context, index) {
          final device = _devices![index];
          return _buildDeviceCard(device);
        },
      ),
    );
  }

  Widget _buildDeviceCard(IoTDevice device) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          context.push(
            '/iot-device-details/${widget.aquariumId}',
            extra: device,
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: device.status.color.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      device.type.icon,
                      color: device.status.color,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          device.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              _getConnectionIcon(device.connectionType),
                              size: 16,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              device.connectionType.displayName,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            if (device.manufacturer != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                '• ${device.manufacturer}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(device.status),
                ],
              ),
              const SizedBox(height: 16),
              
              // Current readings
              if (device.currentReadings.isNotEmpty) ...[
                _buildReadingsRow(device),
                const SizedBox(height: 12),
              ],
              
              // Capabilities
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: device.capabilities.map((cap) {
                  return Chip(
                    label: Text(
                      cap.name,
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: Colors.grey[200],
                    visualDensity: VisualDensity.compact,
                  );
                }).toList(),
              ),
              
              // Last seen
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Last seen: ${_formatLastSeen(device.lastSeen)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  if (device.activeAlerts.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.warning,
                            size: 16,
                            color: AppTheme.errorColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${device.activeAlerts.length} Alert${device.activeAlerts.length > 1 ? 's' : ''}',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.errorColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReadingsRow(IoTDevice device) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: device.currentReadings.entries.take(3).map((entry) {
          final capability = device.capabilities.firstWhere(
            (c) => c.id == entry.key,
            orElse: () => DeviceCapability(
              id: entry.key,
              type: CapabilityType.sensor,
              name: entry.key,
            ),
          );
          
          return Column(
            children: [
              Text(
                capability.name,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${entry.value}${capability.unit ?? ''}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildStatusChip(DeviceStatus status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: status.color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: status.color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: status.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.displayName,
            style: TextStyle(
              color: status.color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddDeviceTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Scan button
          CustomButton(
            text: _isScanning ? 'Scanning...' : 'Scan for Devices',
            icon: Icons.radar,
            isLoading: _isScanning,
            onPressed: _isScanning ? null : _scanForDevices,
          ),
          
          const SizedBox(height: 24),
          
          // Manual add section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.add_circle_outline, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      const Text(
                        'Add Manually',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'If your device doesn\'t appear in the scan, you can add it manually using its connection details.',
                    style: TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  CustomButton(
                    text: 'Add Device Manually',
                    variant: ButtonVariant.outline,
                    onPressed: () {
                      _showManualAddDialog();
                    },
                  ),
                ],
              ),
            ),
          ),
          
          // Discovered devices
          if (_discoveredDevices.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Discovered Devices',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ..._discoveredDevices.map((device) => _buildDiscoveredDeviceCard(device)),
          ],
          
          // Compatible devices section
          const SizedBox(height: 24),
          Text(
            'Compatible Devices',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildCompatibleDevicesList(),
        ],
      ),
    );
  }

  Widget _buildDiscoveredDeviceCard(IoTDevice device) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(device.type.icon, color: AppTheme.primaryColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${device.manufacturer ?? 'Unknown'} - ${device.model ?? 'Unknown Model'}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _getConnectionIcon(device.connectionType),
                  size: 20,
                  color: Colors.grey[600],
                ),
              ],
            ),
            const SizedBox(height: 16),
            CustomButton(
              text: 'Connect',
              size: ButtonSize.small,
              onPressed: () async {
                final success = await _connectToDevice(device);
                if (success) {
                  await _loadDevices();
                  _tabController.animateTo(0);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompatibleDevicesList() {
    final compatibleDevices = [
      {
        'brand': 'AquaTech',
        'devices': ['Temperature Monitor', 'pH Controller', 'Multi-Parameter Hub'],
      },
      {
        'brand': 'ReefMaster',
        'devices': ['LED Controller', 'Wave Maker', 'Dosing System'],
      },
      {
        'brand': 'SmartReef',
        'devices': ['Auto Feeder', 'Protein Skimmer Controller', 'Water Level Sensor'],
      },
    ];

    return Column(
      children: compatibleDevices.map((brand) {
        return ExpansionTile(
          title: Text(brand['brand'] as String),
          children: (brand['devices'] as List<String>).map((device) {
            return ListTile(
              leading: const Icon(Icons.check_circle, color: Colors.green),
              title: Text(device),
              dense: true,
            );
          }).toList(),
        );
      }).toList(),
    );
  }

  Future<bool> _connectToDevice(IoTDevice device) async {
    // Show connecting dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('Connecting to ${device.name}...'),
          ],
        ),
      ),
    );

    try {
      // Add device to aquarium
      final connectedDevice = device.copyWith(aquariumId: widget.aquariumId);
      await IoTService.addDevice(connectedDevice);
      
      // Connect to device
      final success = await IoTService.connectDevice(device.id);
      
      Navigator.pop(context); // Close dialog
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connected to ${device.name}'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        
        // Remove from discovered list
        setState(() {
          _discoveredDevices.removeWhere((d) => d.id == device.id);
        });
        
        return true;
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to connect to ${device.name}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return false;
      }
    } catch (e) {
      Navigator.pop(context); // Close dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return false;
    }
  }

  IconData _getConnectionIcon(ConnectionType type) {
    switch (type) {
      case ConnectionType.wifi:
        return Icons.wifi;
      case ConnectionType.bluetooth:
        return Icons.bluetooth;
      case ConnectionType.zigbee:
      case ConnectionType.zwave:
        return Icons.hub;
      case ConnectionType.mqtt:
        return Icons.cloud;
      case ConnectionType.api:
        return Icons.api;
    }
  }

  String _formatLastSeen(DateTime lastSeen) {
    final now = DateTime.now();
    final difference = now.difference(lastSeen);
    
    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return DateFormat('MMM d, h:mm a').format(lastSeen);
    }
  }

  void _showManualAddDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Device Manually'),
        content: const Text(
          'This feature allows you to add devices by entering their connection details manually.\n\n'
          'You\'ll need:\n'
          '• Device IP address or Bluetooth MAC\n'
          '• Device type and model\n'
          '• Authentication credentials (if any)',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Navigate to manual add screen
            },
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('IoT Device Integration'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Connect smart aquarium devices to:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Monitor parameters in real-time\n'
                '• Automate equipment control\n'
                '• Receive instant alerts\n'
                '• Schedule device operations\n'
                '• Track historical data',
              ),
              SizedBox(height: 16),
              Text(
                'Supported Connections:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Wi-Fi - For cloud-connected devices\n'
                '• Bluetooth - For nearby devices\n'
                '• MQTT - For advanced IoT setups\n'
                '• API - For web-enabled devices',
              ),
              SizedBox(height: 16),
              Text(
                'Tips:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Ensure devices are powered on\n'
                '• Keep devices within range\n'
                '• Have device credentials ready\n'
                '• Check device compatibility',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}