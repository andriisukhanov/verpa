import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/iot_device.dart';
import '../services/iot_service.dart';

class IoTDeviceScheduleScreen extends StatefulWidget {
  final String aquariumId;
  final IoTDevice device;

  const IoTDeviceScheduleScreen({
    super.key,
    required this.aquariumId,
    required this.device,
  });

  @override
  State<IoTDeviceScheduleScreen> createState() => _IoTDeviceScheduleScreenState();
}

class _IoTDeviceScheduleScreenState extends State<IoTDeviceScheduleScreen> {
  List<DeviceSchedule> _schedules = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSchedules();
  }

  Future<void> _loadSchedules() async {
    // Simulate loading schedules
    setState(() {
      _schedules = [
        DeviceSchedule(
          id: '1',
          deviceId: widget.device.id,
          name: 'Morning Light',
          entries: [
            ScheduleEntry(
              time: const TimeOfDay(hour: 8, minute: 0),
              daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
              command: CommandType.turnOn,
              parameters: {'capability': 'power'},
            ),
          ],
        ),
        DeviceSchedule(
          id: '2',
          deviceId: widget.device.id,
          name: 'Evening Dim',
          entries: [
            ScheduleEntry(
              time: const TimeOfDay(hour: 20, minute: 0),
              daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
              command: CommandType.setValue,
              parameters: {'capability': 'brightness', 'value': 30},
            ),
          ],
        ),
        DeviceSchedule(
          id: '3',
          deviceId: widget.device.id,
          name: 'Night Off',
          isEnabled: false,
          entries: [
            ScheduleEntry(
              time: const TimeOfDay(hour: 22, minute: 0),
              daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
              command: CommandType.turnOff,
              parameters: {'capability': 'power'},
            ),
          ],
        ),
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Device Schedules'),
            Text(
              widget.device.name,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _schedules.isEmpty
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _schedules.length,
                itemBuilder: (context, index) {
                  return _buildScheduleCard(_schedules[index]);
                },
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createSchedule,
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.schedule,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No Schedules',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create schedules to automate your device',
            style: TextStyle(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          CustomButton(
            text: 'Create Schedule',
            icon: Icons.add,
            onPressed: _createSchedule,
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(DeviceSchedule schedule) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: [
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: schedule.isEnabled
                    ? AppTheme.primaryColor.withOpacity(0.1)
                    : Colors.grey.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.schedule,
                color: schedule.isEnabled ? AppTheme.primaryColor : Colors.grey,
              ),
            ),
            title: Text(
              schedule.name,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              _getScheduleDescription(schedule),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
            trailing: Switch(
              value: schedule.isEnabled,
              onChanged: (value) => _toggleSchedule(schedule, value),
              activeColor: AppTheme.primaryColor,
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: schedule.entries.map((entry) {
                return _buildScheduleEntry(entry);
              }).toList(),
            ),
          ),
          const Divider(height: 1),
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _editSchedule(schedule),
                  icon: const Icon(Icons.edit),
                  label: const Text('Edit'),
                ),
              ),
              const SizedBox(
                height: 40,
                child: VerticalDivider(),
              ),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _deleteSchedule(schedule),
                  icon: const Icon(Icons.delete, color: Colors.red),
                  label: const Text('Delete', style: TextStyle(color: Colors.red)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleEntry(ScheduleEntry entry) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.access_time,
            size: 20,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.time.format(context),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatDays(entry.daysOfWeek),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              _getCommandDescription(entry),
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getScheduleDescription(DeviceSchedule schedule) {
    if (schedule.entries.isEmpty) return 'No actions';
    
    final entry = schedule.entries.first;
    final time = entry.time.format(context);
    final action = _getCommandDescription(entry);
    
    return '$action at $time';
  }

  String _getCommandDescription(ScheduleEntry entry) {
    switch (entry.command) {
      case CommandType.turnOn:
        return 'Turn On';
      case CommandType.turnOff:
        return 'Turn Off';
      case CommandType.setValue:
        if (entry.parameters['value'] != null) {
          final capability = widget.device.capabilities.firstWhere(
            (c) => c.id == entry.parameters['capability'],
            orElse: () => DeviceCapability(
              id: entry.parameters['capability'],
              type: CapabilityType.dimmer,
              name: 'Value',
            ),
          );
          return 'Set to ${entry.parameters['value']}${capability.unit ?? ''}';
        }
        return 'Set Value';
      default:
        return entry.command.value;
    }
  }

  String _formatDays(List<int> days) {
    if (days.length == 7) {
      return 'Every day';
    }
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final selectedDays = days.map((d) => dayNames[d - 1]).toList();
    
    // Check for weekdays
    if (days.length == 5 && days.every((d) => d >= 1 && d <= 5)) {
      return 'Weekdays';
    }
    
    // Check for weekends
    if (days.length == 2 && days.contains(6) && days.contains(7)) {
      return 'Weekends';
    }
    
    return selectedDays.join(', ');
  }

  Future<void> _toggleSchedule(DeviceSchedule schedule, bool enabled) async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Update schedule
      final updatedSchedule = DeviceSchedule(
        id: schedule.id,
        deviceId: schedule.deviceId,
        name: schedule.name,
        isEnabled: enabled,
        entries: schedule.entries,
        parameters: schedule.parameters,
      );

      // Send command to device
      await IoTService.sendCommand(
        DeviceCommand(
          deviceId: widget.device.id,
          type: CommandType.setSchedule,
          parameters: {
            'schedule': updatedSchedule.toJson(),
            'enabled': enabled,
          },
        ),
      );

      setState(() {
        final index = _schedules.indexWhere((s) => s.id == schedule.id);
        if (index != -1) {
          _schedules[index] = updatedSchedule;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Schedule ${enabled ? 'enabled' : 'disabled'}'),
          backgroundColor: AppTheme.successColor,
        ),
      );
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

  void _createSchedule() {
    _showScheduleEditor();
  }

  void _editSchedule(DeviceSchedule schedule) {
    _showScheduleEditor(schedule: schedule);
  }

  void _showScheduleEditor({DeviceSchedule? schedule}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ScheduleEditorSheet(
        device: widget.device,
        schedule: schedule,
        onSave: (updatedSchedule) {
          setState(() {
            if (schedule == null) {
              _schedules.add(updatedSchedule);
            } else {
              final index = _schedules.indexWhere((s) => s.id == schedule.id);
              if (index != -1) {
                _schedules[index] = updatedSchedule;
              }
            }
          });
        },
      ),
    );
  }

  Future<void> _deleteSchedule(DeviceSchedule schedule) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Schedule?'),
        content: Text('Are you sure you want to delete "${schedule.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() {
        _schedules.removeWhere((s) => s.id == schedule.id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Schedule deleted'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }
}

class ScheduleEditorSheet extends StatefulWidget {
  final IoTDevice device;
  final DeviceSchedule? schedule;
  final Function(DeviceSchedule) onSave;

  const ScheduleEditorSheet({
    super.key,
    required this.device,
    this.schedule,
    required this.onSave,
  });

  @override
  State<ScheduleEditorSheet> createState() => _ScheduleEditorSheetState();
}

class _ScheduleEditorSheetState extends State<ScheduleEditorSheet> {
  late TextEditingController _nameController;
  List<ScheduleEntry> _entries = [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.schedule?.name ?? '');
    if (widget.schedule != null) {
      _entries = List.from(widget.schedule!.entries);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.schedule == null ? 'Create Schedule' : 'Edit Schedule',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Schedule Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Actions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _addEntry,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Action'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (_entries.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Text(
                      'No actions added',
                      style: TextStyle(
                        color: Colors.grey[600],
                      ),
                    ),
                  )
                else
                  ..._entries.asMap().entries.map((entry) {
                    return _buildEntryCard(entry.key, entry.value);
                  }).toList(),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: CustomButton(
                        text: 'Cancel',
                        variant: ButtonVariant.outline,
                        onPressed: () => Navigator.pop(context),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: CustomButton(
                        text: 'Save',
                        onPressed: _save,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEntryCard(int index, ScheduleEntry entry) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(entry.time.format(context)),
        subtitle: Text(_formatDays(entry.daysOfWeek)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getCommandName(entry.command),
              style: TextStyle(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () {
                setState(() {
                  _entries.removeAt(index);
                });
              },
            ),
          ],
        ),
        onTap: () => _editEntry(index),
      ),
    );
  }

  String _formatDays(List<int> days) {
    if (days.length == 7) return 'Every day';
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d) => dayNames[d - 1]).join(', ');
  }

  String _getCommandName(CommandType type) {
    switch (type) {
      case CommandType.turnOn:
        return 'Turn On';
      case CommandType.turnOff:
        return 'Turn Off';
      case CommandType.setValue:
        return 'Set Value';
      default:
        return type.value;
    }
  }

  void _addEntry() {
    _editEntry(null);
  }

  void _editEntry(int? index) {
    // This would show a dialog to edit the entry
    // For now, add a sample entry
    setState(() {
      final newEntry = ScheduleEntry(
        time: const TimeOfDay(hour: 8, minute: 0),
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        command: CommandType.turnOn,
        parameters: {'capability': 'power'},
      );
      
      if (index == null) {
        _entries.add(newEntry);
      } else {
        _entries[index] = newEntry;
      }
    });
  }

  void _save() {
    if (_nameController.text.isEmpty || _entries.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please provide a name and at least one action'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    final schedule = DeviceSchedule(
      id: widget.schedule?.id ?? const Uuid().v4(),
      deviceId: widget.device.id,
      name: _nameController.text,
      isEnabled: widget.schedule?.isEnabled ?? true,
      entries: _entries,
    );

    widget.onSave(schedule);
    Navigator.pop(context);
  }
}