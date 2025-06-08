import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../models/iot_device.dart';

class DeviceControlWidget extends StatefulWidget {
  final IoTDevice device;
  final DeviceCapability capability;
  final Function(CommandType, [Map<String, dynamic>?]) onCommand;

  const DeviceControlWidget({
    super.key,
    required this.device,
    required this.capability,
    required this.onCommand,
  });

  @override
  State<DeviceControlWidget> createState() => _DeviceControlWidgetState();
}

class _DeviceControlWidgetState extends State<DeviceControlWidget> {
  late dynamic _currentValue;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _currentValue = widget.capability.currentValue ?? 
        (widget.capability.type == CapabilityType.switch_ ? false : 0);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getCapabilityIcon(),
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.capability.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (widget.capability.metadata['description'] != null)
                        Text(
                          widget.capability.metadata['description'],
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
                if (_isUpdating)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _buildControl(),
          ],
        ),
      ),
    );
  }

  Widget _buildControl() {
    switch (widget.capability.type) {
      case CapabilityType.switch_:
        return _buildSwitchControl();
      case CapabilityType.dimmer:
        return _buildDimmerControl();
      case CapabilityType.thermostat:
        return _buildThermostatControl();
      case CapabilityType.timer:
        return _buildTimerControl();
      case CapabilityType.schedule:
        return _buildScheduleControl();
      default:
        return const Text('Unsupported control type');
    }
  }

  Widget _buildSwitchControl() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          _currentValue ? 'On' : 'Off',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: _currentValue ? AppTheme.successColor : Colors.grey,
          ),
        ),
        Switch(
          value: _currentValue,
          onChanged: widget.device.isOnline && !_isUpdating
              ? (value) {
                  setState(() {
                    _currentValue = value;
                    _isUpdating = true;
                  });
                  
                  widget.onCommand(
                    value ? CommandType.turnOn : CommandType.turnOff,
                    {'capability': widget.capability.id},
                  );
                  
                  // Reset updating state after delay
                  Future.delayed(const Duration(seconds: 2), () {
                    if (mounted) {
                      setState(() {
                        _isUpdating = false;
                      });
                    }
                  });
                }
              : null,
          activeColor: AppTheme.primaryColor,
        ),
      ],
    );
  }

  Widget _buildDimmerControl() {
    final min = widget.capability.minValue?.toDouble() ?? 0.0;
    final max = widget.capability.maxValue?.toDouble() ?? 100.0;
    final value = (_currentValue as num).toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$value${widget.capability.unit ?? ''}',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (widget.capability.metadata['presets'] != null)
              _buildPresetButtons(),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: AppTheme.primaryColor,
            inactiveTrackColor: AppTheme.primaryColor.withOpacity(0.3),
            thumbColor: AppTheme.primaryColor,
            overlayColor: AppTheme.primaryColor.withOpacity(0.2),
          ),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: ((max - min) / (widget.capability.metadata['step'] ?? 1)).round(),
            label: '$value${widget.capability.unit ?? ''}',
            onChanged: widget.device.isOnline && !_isUpdating
                ? (newValue) {
                    setState(() {
                      _currentValue = newValue;
                    });
                  }
                : null,
            onChangeEnd: (newValue) {
              setState(() {
                _isUpdating = true;
              });
              
              widget.onCommand(
                CommandType.setValue,
                {
                  'capability': widget.capability.id,
                  'value': newValue,
                },
              );
              
              Future.delayed(const Duration(seconds: 2), () {
                if (mounted) {
                  setState(() {
                    _isUpdating = false;
                  });
                }
              });
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$min${widget.capability.unit ?? ''}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
            Text(
              '$max${widget.capability.unit ?? ''}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPresetButtons() {
    final presets = widget.capability.metadata['presets'] as List<dynamic>;
    
    return Row(
      children: presets.map((preset) {
        return Padding(
          padding: const EdgeInsets.only(left: 8),
          child: OutlinedButton(
            onPressed: widget.device.isOnline && !_isUpdating
                ? () {
                    setState(() {
                      _currentValue = preset['value'];
                      _isUpdating = true;
                    });
                    
                    widget.onCommand(
                      CommandType.setValue,
                      {
                        'capability': widget.capability.id,
                        'value': preset['value'],
                      },
                    );
                    
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) {
                        setState(() {
                          _isUpdating = false;
                        });
                      }
                    });
                  }
                : null,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
            ),
            child: Text(
              preset['name'],
              style: const TextStyle(fontSize: 12),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildThermostatControl() {
    final targetTemp = (_currentValue as num).toDouble();
    final currentTemp = widget.device.currentReadings['temperature'] ?? targetTemp;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Column(
              children: [
                Text(
                  'Current',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$currentTemp°',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Column(
              children: [
                Text(
                  'Target',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: widget.device.isOnline && !_isUpdating
                          ? () => _adjustThermostat(targetTemp - 0.5)
                          : null,
                    ),
                    Text(
                      '$targetTemp°',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: widget.device.isOnline && !_isUpdating
                          ? () => _adjustThermostat(targetTemp + 0.5)
                          : null,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (widget.capability.metadata['modes'] != null)
          _buildThermostatModes(),
      ],
    );
  }

  Widget _buildThermostatModes() {
    final modes = widget.capability.metadata['modes'] as List<dynamic>;
    final currentMode = widget.capability.metadata['currentMode'] ?? modes.first;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: modes.map((mode) {
        final isSelected = mode == currentMode;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: ChoiceChip(
            label: Text(mode),
            selected: isSelected,
            onSelected: widget.device.isOnline && !_isUpdating
                ? (selected) {
                    if (selected) {
                      setState(() {
                        _isUpdating = true;
                      });
                      
                      widget.onCommand(
                        CommandType.setValue,
                        {
                          'capability': widget.capability.id,
                          'mode': mode,
                        },
                      );
                      
                      Future.delayed(const Duration(seconds: 2), () {
                        if (mounted) {
                          setState(() {
                            _isUpdating = false;
                          });
                        }
                      });
                    }
                  }
                : null,
          ),
        );
      }).toList(),
    );
  }

  void _adjustThermostat(double newValue) {
    final min = widget.capability.minValue?.toDouble() ?? 20.0;
    final max = widget.capability.maxValue?.toDouble() ?? 30.0;
    
    if (newValue >= min && newValue <= max) {
      setState(() {
        _currentValue = newValue;
        _isUpdating = true;
      });
      
      widget.onCommand(
        CommandType.setValue,
        {
          'capability': widget.capability.id,
          'value': newValue,
        },
      );
      
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _isUpdating = false;
          });
        }
      });
    }
  }

  Widget _buildTimerControl() {
    final duration = Duration(seconds: (_currentValue as num).toInt());
    final isRunning = widget.capability.metadata['isRunning'] ?? false;

    return Column(
      children: [
        Text(
          _formatDuration(duration),
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (!isRunning) ...[
              OutlinedButton.icon(
                onPressed: widget.device.isOnline && !_isUpdating
                    ? () => _showTimerDialog()
                    : null,
                icon: const Icon(Icons.timer),
                label: const Text('Set Timer'),
              ),
              const SizedBox(width: 16),
              ElevatedButton.icon(
                onPressed: widget.device.isOnline && !_isUpdating && _currentValue > 0
                    ? () => _startTimer()
                    : null,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.successColor,
                ),
              ),
            ] else ...[
              ElevatedButton.icon(
                onPressed: widget.device.isOnline && !_isUpdating
                    ? () => _stopTimer()
                    : null,
                icon: const Icon(Icons.stop),
                label: const Text('Stop'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.errorColor,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildScheduleControl() {
    final schedules = widget.capability.metadata['schedules'] as List<dynamic>? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (schedules.isEmpty)
          Center(
            child: Column(
              children: [
                Icon(
                  Icons.schedule,
                  size: 48,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 8),
                Text(
                  'No schedules set',
                  style: TextStyle(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          )
        else
          ...schedules.map((schedule) => _buildScheduleItem(schedule)),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton.icon(
            onPressed: widget.device.isOnline
                ? () => _showScheduleDialog()
                : null,
            icon: const Icon(Icons.add),
            label: const Text('Add Schedule'),
          ),
        ),
      ],
    );
  }

  Widget _buildScheduleItem(dynamic schedule) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.access_time,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  schedule['name'] ?? 'Schedule',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${schedule['time']} - ${schedule['days']}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: schedule['enabled'] ?? true,
            onChanged: widget.device.isOnline
                ? (value) => _toggleSchedule(schedule['id'], value)
                : null,
            activeColor: AppTheme.primaryColor,
          ),
        ],
      ),
    );
  }

  IconData _getCapabilityIcon() {
    switch (widget.capability.type) {
      case CapabilityType.switch_:
        return Icons.power_settings_new;
      case CapabilityType.dimmer:
        return Icons.brightness_6;
      case CapabilityType.thermostat:
        return Icons.thermostat;
      case CapabilityType.timer:
        return Icons.timer;
      case CapabilityType.schedule:
        return Icons.schedule;
      case CapabilityType.alarm:
        return Icons.alarm;
      default:
        return Icons.settings;
    }
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;
    
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } else {
      return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
  }

  void _showTimerDialog() {
    int hours = 0;
    int minutes = 0;
    int seconds = 0;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Set Timer'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Hours
                  Column(
                    children: [
                      const Text('Hours'),
                      const SizedBox(height: 8),
                      Container(
                        width: 80,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_up),
                              onPressed: () {
                                setDialogState(() {
                                  if (hours < 23) hours++;
                                });
                              },
                            ),
                            Text(
                              hours.toString().padLeft(2, '0'),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_down),
                              onPressed: () {
                                setDialogState(() {
                                  if (hours > 0) hours--;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  const Text(
                    ':',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Minutes
                  Column(
                    children: [
                      const Text('Minutes'),
                      const SizedBox(height: 8),
                      Container(
                        width: 80,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_up),
                              onPressed: () {
                                setDialogState(() {
                                  if (minutes < 59) minutes++;
                                });
                              },
                            ),
                            Text(
                              minutes.toString().padLeft(2, '0'),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_down),
                              onPressed: () {
                                setDialogState(() {
                                  if (minutes > 0) minutes--;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  const Text(
                    ':',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Seconds
                  Column(
                    children: [
                      const Text('Seconds'),
                      const SizedBox(height: 8),
                      Container(
                        width: 80,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_up),
                              onPressed: () {
                                setDialogState(() {
                                  if (seconds < 59) seconds++;
                                });
                              },
                            ),
                            Text(
                              seconds.toString().padLeft(2, '0'),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_down),
                              onPressed: () {
                                setDialogState(() {
                                  if (seconds > 0) seconds--;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Quick presets
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(
                    label: const Text('5 min'),
                    onPressed: () {
                      setDialogState(() {
                        hours = 0;
                        minutes = 5;
                        seconds = 0;
                      });
                    },
                  ),
                  ActionChip(
                    label: const Text('15 min'),
                    onPressed: () {
                      setDialogState(() {
                        hours = 0;
                        minutes = 15;
                        seconds = 0;
                      });
                    },
                  ),
                  ActionChip(
                    label: const Text('30 min'),
                    onPressed: () {
                      setDialogState(() {
                        hours = 0;
                        minutes = 30;
                        seconds = 0;
                      });
                    },
                  ),
                  ActionChip(
                    label: const Text('1 hour'),
                    onPressed: () {
                      setDialogState(() {
                        hours = 1;
                        minutes = 0;
                        seconds = 0;
                      });
                    },
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                final totalSeconds = hours * 3600 + minutes * 60 + seconds;
                if (totalSeconds > 0) {
                  Navigator.pop(context);
                  setState(() {
                    _currentValue = totalSeconds;
                  });
                }
              },
              child: const Text('Set'),
            ),
          ],
        ),
      ),
    );
  }

  void _startTimer() {
    widget.onCommand(
      CommandType.turnOn,
      {
        'capability': widget.capability.id,
        'duration': _currentValue,
      },
    );
  }

  void _stopTimer() {
    widget.onCommand(
      CommandType.turnOff,
      {'capability': widget.capability.id},
    );
  }

  void _showScheduleDialog() {
    TimeOfDay selectedTime = const TimeOfDay(hour: 8, minute: 0);
    List<bool> selectedDays = List.filled(7, false);
    String scheduleName = '';
    CommandType selectedCommand = CommandType.turnOn;
    Map<String, dynamic> commandParams = {};

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Schedule'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Schedule name
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Schedule Name',
                    hintText: 'e.g., Morning Light',
                  ),
                  onChanged: (value) => scheduleName = value,
                ),
                const SizedBox(height: 24),
                
                // Time picker
                const Text(
                  'Time',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: selectedTime,
                    );
                    if (time != null) {
                      setDialogState(() {
                        selectedTime = time;
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.access_time),
                        const SizedBox(width: 16),
                        Text(
                          selectedTime.format(context),
                          style: const TextStyle(fontSize: 18),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Days of week
                const Text(
                  'Days',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (int i = 0; i < 7; i++)
                      FilterChip(
                        label: Text(_getDayName(i)),
                        selected: selectedDays[i],
                        onSelected: (selected) {
                          setDialogState(() {
                            selectedDays[i] = selected;
                          });
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Command selection
                const Text(
                  'Action',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<CommandType>(
                  value: selectedCommand,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                  ),
                  items: _getAvailableCommands().map((cmd) {
                    return DropdownMenuItem(
                      value: cmd,
                      child: Text(_getCommandName(cmd)),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() {
                        selectedCommand = value;
                        commandParams = _getDefaultParams(value);
                      });
                    }
                  },
                ),
                
                // Command parameters
                if (commandParams.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  ..._buildCommandParams(commandParams, setDialogState),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (scheduleName.isNotEmpty && selectedDays.contains(true)) {
                  Navigator.pop(context);
                  
                  final schedule = {
                    'id': DateTime.now().millisecondsSinceEpoch.toString(),
                    'name': scheduleName,
                    'time': selectedTime.format(context),
                    'days': _formatSelectedDays(selectedDays),
                    'enabled': true,
                    'command': selectedCommand,
                    'params': commandParams,
                  };
                  
                  widget.onCommand(
                    CommandType.setSchedule,
                    {
                      'capability': widget.capability.id,
                      'schedule': schedule,
                    },
                  );
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  String _getDayName(int index) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[index];
  }

  String _formatSelectedDays(List<bool> selectedDays) {
    final days = <String>[];
    for (int i = 0; i < selectedDays.length; i++) {
      if (selectedDays[i]) {
        days.add(_getDayName(i));
      }
    }
    return days.join(', ');
  }

  List<CommandType> _getAvailableCommands() {
    switch (widget.capability.type) {
      case CapabilityType.switch_:
        return [CommandType.turnOn, CommandType.turnOff];
      case CapabilityType.dimmer:
      case CapabilityType.thermostat:
        return [CommandType.setValue, CommandType.turnOn, CommandType.turnOff];
      default:
        return [CommandType.turnOn, CommandType.turnOff];
    }
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

  Map<String, dynamic> _getDefaultParams(CommandType type) {
    if (type == CommandType.setValue) {
      switch (widget.capability.type) {
        case CapabilityType.dimmer:
          return {'value': widget.capability.currentValue ?? 50};
        case CapabilityType.thermostat:
          return {'value': widget.capability.currentValue ?? 25};
        default:
          return {};
      }
    }
    return {};
  }

  List<Widget> _buildCommandParams(Map<String, dynamic> params, StateSetter setDialogState) {
    final widgets = <Widget>[];
    
    params.forEach((key, value) {
      if (key == 'value' && value is num) {
        widgets.add(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Value',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Slider(
                      value: value.toDouble(),
                      min: widget.capability.minValue?.toDouble() ?? 0,
                      max: widget.capability.maxValue?.toDouble() ?? 100,
                      onChanged: (newValue) {
                        setDialogState(() {
                          params[key] = newValue;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    '$value${widget.capability.unit ?? ''}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        );
      }
    });
    
    return widgets;
  }

  void _toggleSchedule(String scheduleId, bool enabled) {
    widget.onCommand(
      CommandType.setSchedule,
      {
        'capability': widget.capability.id,
        'scheduleId': scheduleId,
        'enabled': enabled,
      },
    );
  }
}