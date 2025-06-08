import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/feeding_schedule.dart';

class FeedingScheduleForm extends StatefulWidget {
  final FeedingSchedule? schedule;
  final Function(String name, TimeOfDay time, List<int> weekdays, String? notes) onSave;

  const FeedingScheduleForm({
    super.key,
    this.schedule,
    required this.onSave,
  });

  @override
  State<FeedingScheduleForm> createState() => _FeedingScheduleFormState();
}

class _FeedingScheduleFormState extends State<FeedingScheduleForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _notesController = TextEditingController();
  
  late TimeOfDay _selectedTime;
  late List<int> _selectedWeekdays;
  
  bool get isEditing => widget.schedule != null;

  @override
  void initState() {
    super.initState();
    
    if (isEditing) {
      _nameController.text = widget.schedule!.name;
      _notesController.text = widget.schedule!.notes ?? '';
      _selectedTime = widget.schedule!.time;
      _selectedWeekdays = List.from(widget.schedule!.weekdays);
    } else {
      _selectedTime = const TimeOfDay(hour: 8, minute: 0);
      _selectedWeekdays = [1, 2, 3, 4, 5, 6, 7]; // All days by default
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            children: [
              Expanded(
                child: Text(
                  isEditing ? 'Edit Feeding Schedule' : 'Add Feeding Schedule',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                CustomTextField(
                  controller: _nameController,
                  labelText: 'Schedule Name',
                  hintText: 'e.g., Morning Feeding, Evening Snack',
                  prefixIcon: Icons.label,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter a name';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 20),
                
                // Time
                Text(
                  'Feeding Time',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: _selectTime,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.borderColor,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          color: AppTheme.primaryColor,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          _formatTime(_selectedTime),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const Spacer(),
                        Icon(
                          Icons.arrow_drop_down,
                          color: Colors.grey[600],
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Weekdays
                Text(
                  'Repeat On',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
                const SizedBox(height: 12),
                _buildWeekdaySelector(),
                
                const SizedBox(height: 20),
                
                // Notes
                CustomTextField(
                  controller: _notesController,
                  labelText: 'Notes (Optional)',
                  hintText: 'e.g., Special diet, medication mixed in',
                  prefixIcon: Icons.notes,
                  maxLines: 3,
                  minLines: 2,
                ),
                
                const SizedBox(height: 32),
                
                // Save Button
                CustomButton(
                  text: isEditing ? 'Update Schedule' : 'Add Schedule',
                  icon: Icons.save,
                  onPressed: _handleSave,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdaySelector() {
    const weekdays = [
      {'day': 1, 'name': 'Mon'},
      {'day': 2, 'name': 'Tue'},
      {'day': 3, 'name': 'Wed'},
      {'day': 4, 'name': 'Thu'},
      {'day': 5, 'name': 'Fri'},
      {'day': 6, 'name': 'Sat'},
      {'day': 7, 'name': 'Sun'},
    ];

    return Wrap(
      spacing: 8,
      children: weekdays.map((weekday) {
        final day = weekday['day'] as int;
        final name = weekday['name'] as String;
        final isSelected = _selectedWeekdays.contains(day);

        return FilterChip(
          label: Text(name),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                _selectedWeekdays.add(day);
                _selectedWeekdays.sort();
              } else {
                _selectedWeekdays.remove(day);
              }
            });
          },
          selectedColor: AppTheme.primaryColor.withOpacity(0.2),
          checkmarkColor: AppTheme.primaryColor,
          labelStyle: TextStyle(
            color: isSelected ? AppTheme.primaryColor : Colors.grey[700],
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        );
      }).toList(),
    );
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '$hour:$minute $period';
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );

    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  void _handleSave() {
    if (_formKey.currentState?.validate() == true) {
      if (_selectedWeekdays.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select at least one day'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      widget.onSave(
        _nameController.text.trim(),
        _selectedTime,
        _selectedWeekdays,
        _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      Navigator.pop(context);
    }
  }
}