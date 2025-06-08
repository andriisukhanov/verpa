import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:async';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/iot_device.dart';
import '../services/iot_service.dart';
import '../widgets/device_control_widget.dart';

class IoTDeviceDetailsScreen extends StatefulWidget {
  final String aquariumId;
  final IoTDevice device;

  const IoTDeviceDetailsScreen({
    super.key,
    required this.aquariumId,
    required this.device,
  });

  @override
  State<IoTDeviceDetailsScreen> createState() => _IoTDeviceDetailsScreenState();
}

class _IoTDeviceDetailsScreenState extends State<IoTDeviceDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late IoTDevice _device;
  StreamSubscription<IoTDevice>? _deviceSubscription;
  bool _isLoading = false;
  List<DataPoint> _historyData = [];
  String? _selectedCapability;

  @override
  void initState() {
    super.initState();
    _device = widget.device;
    _tabController = TabController(length: 4, vsync: this);
    
    // Subscribe to device updates
    _deviceSubscription = IoTService.getDeviceStream(_device.id).listen((device) {
      if (mounted) {
        setState(() {
          _device = device;
          _updateHistoryData();
        });
      }
    });
    
    // Select first capability by default
    if (_device.capabilities.isNotEmpty) {
      _selectedCapability = _device.capabilities.first.id;
    }
    
    _generateSampleHistory();
  }

  @override
  void dispose() {
    _deviceSubscription?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  void _updateHistoryData() {
    if (_selectedCapability != null && _device.currentReadings.containsKey(_selectedCapability)) {
      final value = _device.currentReadings[_selectedCapability];
      if (value is num) {
        _historyData.add(DataPoint(DateTime.now(), value.toDouble()));
        
        // Keep only last 50 points
        if (_historyData.length > 50) {
          _historyData.removeAt(0);
        }
      }
    }
  }

  void _generateSampleHistory() {
    // Generate sample historical data for demonstration
    final now = DateTime.now();
    final random = DateTime.now().millisecondsSinceEpoch % 100;
    
    for (int i = 24; i >= 0; i--) {
      final time = now.subtract(Duration(hours: i));
      final value = 25.0 + (random % 5) - 2.5 + (i % 3) * 0.5;
      _historyData.add(DataPoint(time, value));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_device.name),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Controls'),
            Tab(text: 'History'),
            Tab(text: 'Settings'),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              switch (value) {
                case 'calibrate':
                  _showCalibrationDialog();
                  break;
                case 'remove':
                  _showRemoveDialog();
                  break;
              }
            },
            itemBuilder: (context) => [
              if (_device.capabilities.any((c) => c.type == CapabilityType.sensor))
                const PopupMenuItem(
                  value: 'calibrate',
                  child: Row(
                    children: [
                      Icon(Icons.tune, color: Colors.black54),
                      SizedBox(width: 8),
                      Text('Calibrate'),
                    ],
                  ),
                ),
              const PopupMenuItem(
                value: 'remove',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Remove Device', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            _buildControlsTab(),
            _buildHistoryTab(),
            _buildSettingsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status card
          _buildStatusCard(),
          
          const SizedBox(height: 16),
          
          // Current readings
          if (_device.currentReadings.isNotEmpty) ...[
            _buildCurrentReadingsCard(),
            const SizedBox(height: 16),
          ],
          
          // Device info
          _buildDeviceInfoCard(),
          
          const SizedBox(height: 16),
          
          // Alerts
          if (_device.activeAlerts.isNotEmpty) ...[
            _buildAlertsCard(),
            const SizedBox(height: 16),
          ],
          
          // Quick actions
          _buildQuickActionsCard(),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _device.status.color.withOpacity(0.2),
                border: Border.all(
                  color: _device.status.color,
                  width: 3,
                ),
              ),
              child: Center(
                child: Icon(
                  _device.type.icon,
                  color: _device.status.color,
                  size: 36,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _device.status.displayName,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _device.status.color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Last update: ${_formatDateTime(_device.lastSeen)}',
                    style: TextStyle(
                      color: Colors.grey[600],
                    ),
                  ),
                  if (_device.connectionInfo?.signalStrength != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.signal_wifi_4_bar,
                          size: 16,
                          color: _getSignalColor(_device.connectionInfo!.signalStrength!),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Signal: ${_device.connectionInfo!.signalStrength}%',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (_device.status == DeviceStatus.disconnected)
              CustomButton(
                text: 'Connect',
                size: ButtonSize.small,
                onPressed: _connectDevice,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentReadingsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.sensors, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Current Readings',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ..._device.currentReadings.entries.map((entry) {
              final capability = _device.capabilities.firstWhere(
                (c) => c.id == entry.key,
                orElse: () => DeviceCapability(
                  id: entry.key,
                  type: CapabilityType.sensor,
                  name: entry.key,
                ),
              );
              
              return _buildReadingTile(capability, entry.value);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildReadingTile(DeviceCapability capability, dynamic value) {
    final isInRange = capability.minValue != null && 
        capability.maxValue != null &&
        value is num &&
        value >= capability.minValue &&
        value <= capability.maxValue;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  capability.name,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (capability.minValue != null && capability.maxValue != null)
                  Text(
                    'Range: ${capability.minValue} - ${capability.maxValue}${capability.unit ?? ''}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isInRange || capability.minValue == null
                  ? AppTheme.successColor.withOpacity(0.1)
                  : AppTheme.errorColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isInRange || capability.minValue == null
                    ? AppTheme.successColor.withOpacity(0.3)
                    : AppTheme.errorColor.withOpacity(0.3),
              ),
            ),
            child: Text(
              '$value${capability.unit ?? ''}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: isInRange || capability.minValue == null
                    ? AppTheme.successColor
                    : AppTheme.errorColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Device Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Type', _device.type.displayName),
            _buildInfoRow('Connection', _device.connectionType.displayName),
            if (_device.manufacturer != null)
              _buildInfoRow('Manufacturer', _device.manufacturer!),
            if (_device.model != null)
              _buildInfoRow('Model', _device.model!),
            if (_device.serialNumber != null)
              _buildInfoRow('Serial Number', _device.serialNumber!),
            if (_device.firmwareVersion != null)
              _buildInfoRow('Firmware', _device.firmwareVersion!),
            if (_device.connectionInfo?.ipAddress != null)
              _buildInfoRow('IP Address', _device.connectionInfo!.ipAddress!),
            if (_device.connectionInfo?.macAddress != null)
              _buildInfoRow('MAC Address', _device.connectionInfo!.macAddress!),
            _buildInfoRow('Added', DateFormat('MMM d, yyyy').format(_device.addedAt)),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertsCard() {
    return Card(
      color: AppTheme.errorColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: AppTheme.errorColor),
                const SizedBox(width: 8),
                Text(
                  'Active Alerts (${_device.activeAlerts.length})',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.errorColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._device.activeAlerts.map((alert) => _buildAlertTile(alert)),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertTile(DeviceAlert alert) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            alert.severity == AlertSeverity.critical
                ? Icons.error
                : alert.severity == AlertSeverity.error
                    ? Icons.warning
                    : Icons.info,
            color: alert.severity.color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  alert.message,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM d, h:mm a').format(alert.triggeredAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          if (!alert.isAcknowledged)
            TextButton(
              onPressed: () {
                // TODO: Acknowledge alert
              },
              child: const Text('Dismiss'),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.flash_on, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Quick Actions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_device.status == DeviceStatus.connected && _device.isControllable)
                  ActionChip(
                    label: const Text('Turn Off'),
                    avatar: const Icon(Icons.power_settings_new, size: 18),
                    onPressed: () => _sendCommand(CommandType.turnOff),
                  ),
                if (_device.status == DeviceStatus.disconnected)
                  ActionChip(
                    label: const Text('Reconnect'),
                    avatar: const Icon(Icons.refresh, size: 18),
                    onPressed: _connectDevice,
                  ),
                ActionChip(
                  label: const Text('Refresh'),
                  avatar: const Icon(Icons.sync, size: 18),
                  onPressed: _refreshDevice,
                ),
                if (_device.capabilities.any((c) => c.type == CapabilityType.sensor))
                  ActionChip(
                    label: const Text('Calibrate'),
                    avatar: const Icon(Icons.tune, size: 18),
                    onPressed: _showCalibrationDialog,
                  ),
                ActionChip(
                  label: const Text('Schedule'),
                  avatar: const Icon(Icons.schedule, size: 18),
                  onPressed: () {
                    context.push('/iot-device-schedule/${widget.aquariumId}', extra: _device);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlsTab() {
    if (!_device.isControllable) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.info_outline,
              size: 64,
              color: Colors.grey,
            ),
            SizedBox(height: 16),
            Text(
              'This device doesn\'t have controls',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    final controllableCapabilities = _device.capabilities
        .where((c) => !c.isReadOnly)
        .toList();

    if (controllableCapabilities.isEmpty) {
      return const Center(
        child: Text('No controllable features available'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: controllableCapabilities.map((capability) {
          return DeviceControlWidget(
            device: _device,
            capability: capability,
            onCommand: _sendCommand,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHistoryTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Capability selector
          if (_device.capabilities.length > 1) ...[
            DropdownButtonFormField<String>(
              value: _selectedCapability,
              decoration: const InputDecoration(
                labelText: 'Select Parameter',
                border: OutlineInputBorder(),
              ),
              items: _device.capabilities
                  .where((c) => c.type == CapabilityType.sensor)
                  .map((capability) => DropdownMenuItem(
                        value: capability.id,
                        child: Text(capability.name),
                      ))
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCapability = value;
                });
              },
            ),
            const SizedBox(height: 16),
          ],
          
          // Chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '24 Hour History',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: _buildHistoryChart(),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Statistics
          _buildStatisticsCard(),
        ],
      ),
    );
  }

  Widget _buildHistoryChart() {
    if (_historyData.isEmpty) {
      return const Center(
        child: Text('No historical data available'),
      );
    }

    final capability = _device.capabilities.firstWhere(
      (c) => c.id == _selectedCapability,
      orElse: () => _device.capabilities.first,
    );

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 1,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: Colors.grey[300]!,
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toStringAsFixed(1),
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                if (value.toInt() < 0 || value.toInt() >= _historyData.length) {
                  return const SizedBox.shrink();
                }
                final date = _historyData[value.toInt()].time;
                return Text(
                  DateFormat('HH:mm').format(date),
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: _historyData.length.toDouble() - 1,
        minY: _historyData.map((p) => p.value).reduce((a, b) => a < b ? a : b) - 1,
        maxY: _historyData.map((p) => p.value).reduce((a, b) => a > b ? a : b) + 1,
        lineBarsData: [
          LineChartBarData(
            spots: _historyData
                .asMap()
                .entries
                .map((entry) => FlSpot(entry.key.toDouble(), entry.value.value))
                .toList(),
            isCurved: true,
            color: AppTheme.primaryColor,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: AppTheme.primaryColor.withOpacity(0.1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatisticsCard() {
    if (_historyData.isEmpty) {
      return const SizedBox.shrink();
    }

    final values = _historyData.map((p) => p.value).toList();
    final min = values.reduce((a, b) => a < b ? a : b);
    final max = values.reduce((a, b) => a > b ? a : b);
    final avg = values.reduce((a, b) => a + b) / values.length;

    final capability = _device.capabilities.firstWhere(
      (c) => c.id == _selectedCapability,
      orElse: () => _device.capabilities.first,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Statistics',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  'Minimum',
                  '${min.toStringAsFixed(1)}${capability.unit ?? ''}',
                  Colors.blue,
                ),
                _buildStatItem(
                  'Average',
                  '${avg.toStringAsFixed(1)}${capability.unit ?? ''}',
                  Colors.green,
                ),
                _buildStatItem(
                  'Maximum',
                  '${max.toStringAsFixed(1)}${capability.unit ?? ''}',
                  Colors.orange,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Device name
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Device Name',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: TextEditingController(text: _device.name),
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Enter device name',
                    ),
                    onSubmitted: (value) {
                      _updateDeviceName(value);
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Alert settings
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.notifications, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      const Text(
                        'Alert Settings',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ..._device.capabilities
                      .where((c) => c.type == CapabilityType.sensor)
                      .map((capability) => _buildAlertSettingTile(capability)),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Advanced settings
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Advanced Settings',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: const Icon(Icons.update),
                    title: const Text('Check for Updates'),
                    subtitle: Text('Current firmware: ${_device.firmwareVersion ?? 'Unknown'}'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: _checkForUpdates,
                  ),
                  ListTile(
                    leading: const Icon(Icons.restore),
                    title: const Text('Factory Reset'),
                    subtitle: const Text('Reset device to default settings'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: _showFactoryResetDialog,
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Remove device button
          CustomButton(
            text: 'Remove Device',
            icon: Icons.delete,
            variant: ButtonVariant.danger,
            onPressed: _showRemoveDialog,
          ),
        ],
      ),
    );
  }

  Widget _buildAlertSettingTile(DeviceCapability capability) {
    return SwitchListTile(
      title: Text(capability.name),
      subtitle: capability.minValue != null && capability.maxValue != null
          ? Text('Alert when outside ${capability.minValue} - ${capability.maxValue}${capability.unit ?? ''}')
          : null,
      value: true, // TODO: Get from device settings
      onChanged: (value) {
        // TODO: Update alert settings
      },
    );
  }

  Future<void> _connectDevice() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final success = await IoTService.connectDevice(_device.id);
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Device connected successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to connect to device'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshDevice() async {
    // TODO: Implement device refresh
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Device refreshed'),
      ),
    );
  }

  Future<void> _sendCommand(CommandType type, [Map<String, dynamic>? parameters]) async {
    final command = DeviceCommand(
      deviceId: _device.id,
      type: type,
      parameters: parameters ?? {},
    );

    setState(() {
      _isLoading = true;
    });

    try {
      final success = await IoTService.sendCommand(command);
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Command sent successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send command'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showCalibrationDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Device Calibration'),
        content: const Text(
          'Follow the device manufacturer\'s instructions for calibration.\n\n'
          'This typically involves:\n'
          '1. Preparing calibration solutions\n'
          '2. Cleaning the sensor\n'
          '3. Following the calibration sequence',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _sendCommand(CommandType.calibrate);
            },
            child: const Text('Start Calibration'),
          ),
        ],
      ),
    );
  }

  void _showRemoveDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Device?'),
        content: Text(
          'Are you sure you want to remove "${_device.name}" from your aquarium?\n\n'
          'This will delete all device settings and history.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await IoTService.removeDevice(_device.id);
              
              if (mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Device removed'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _showFactoryResetDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Factory Reset'),
        content: const Text(
          'This will reset the device to factory settings.\n\n'
          'All custom settings and schedules will be lost.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _sendCommand(CommandType.reset);
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateDeviceName(String name) async {
    final updatedDevice = _device.copyWith(name: name);
    await IoTService.updateDevice(updatedDevice);
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Device name updated'),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  Future<void> _checkForUpdates() async {
    setState(() {
      _isLoading = true;
    });

    // Simulate checking for updates
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _isLoading = false;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Firmware Update'),
        content: const Text('Your device is up to date.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Color _getSignalColor(int strength) {
    if (strength >= 75) return Colors.green;
    if (strength >= 50) return Colors.orange;
    return Colors.red;
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return DateFormat('MMM d, h:mm a').format(dateTime);
    }
  }
}

class DataPoint {
  final DateTime time;
  final double value;

  DataPoint(this.time, this.value);
}