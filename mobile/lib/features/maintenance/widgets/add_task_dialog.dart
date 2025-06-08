import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/maintenance_task.dart';
import '../services/maintenance_service.dart';

class AddTaskDialog extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;
  final MaintenanceTask? task;
  final VoidCallback onTaskAdded;

  const AddTaskDialog({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
    this.task,
    required this.onTaskAdded,
  });

  @override
  State<AddTaskDialog> createState() => _AddTaskDialogState();
}

class _AddTaskDialogState extends State<AddTaskDialog> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();
  
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _intervalController = TextEditingController();
  
  MaintenanceCategory _selectedCategory = MaintenanceCategory.general;
  MaintenancePriority _selectedPriority = MaintenancePriority.medium;
  DateTime? _dueDate;
  RecurrenceType? _recurrence;
  bool _isLoading = false;
  
  bool get isEditing => widget.task != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _populateFields();
    }
  }

  void _populateFields() {
    final task = widget.task!;
    _titleController.text = task.title;
    _descriptionController.text = task.description ?? '';
    _selectedCategory = task.category;
    _selectedPriority = task.priority;
    _dueDate = task.dueDate;
    _recurrence = task.recurrence;
    if (task.recurrenceInterval != null) {
      _intervalController.text = task.recurrenceInterval.toString();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _intervalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Row(
                    children: [
                      Icon(
                        isEditing ? Icons.edit : Icons.add_task,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isEditing ? 'Edit Task' : 'Add Task',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Title
                  CustomTextField(
                    controller: _titleController,
                    labelText: 'Task Title',
                    hintText: 'e.g., Weekly water change',
                    prefixIcon: Icons.title,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a title';
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Description
                  CustomTextField(
                    controller: _descriptionController,
                    labelText: 'Description (Optional)',
                    hintText: 'Additional details about the task',
                    prefixIcon: Icons.description,
                    maxLines: 2,
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Category
                  Text(
                    'Category',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildCategorySelector(),
                  
                  const SizedBox(height: 20),
                  
                  // Priority
                  Text(
                    'Priority',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildPrioritySelector(),
                  
                  const SizedBox(height: 20),
                  
                  // Due Date
                  _buildDueDateSection(),
                  
                  const SizedBox(height: 20),
                  
                  // Recurrence
                  _buildRecurrenceSection(),
                  
                  const SizedBox(height: 32),
                  
                  // Actions
                  Row(
                    children: [
                      Expanded(
                        child: CustomButton(
                          text: 'Cancel',
                          variant: ButtonVariant.outline,
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: CustomButton(
                          text: isEditing ? 'Update' : 'Add',
                          icon: Icons.save,
                          onPressed: _handleSubmit,
                          isLoading: _isLoading,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: MaintenanceCategory.values.map((category) {
        final isSelected = _selectedCategory == category;
        
        return InkWell(
          onTap: () {
            setState(() {
              _selectedCategory = category;
            });
          },
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected 
                  ? category.color.withOpacity(0.2)
                  : Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected 
                    ? category.color 
                    : Colors.grey[300]!,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  category.icon,
                  size: 20,
                  color: isSelected ? category.color : Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  category.displayName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? category.color : Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPrioritySelector() {
    return Row(
      children: MaintenancePriority.values.map((priority) {
        final isSelected = _selectedPriority == priority;
        
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: priority != MaintenancePriority.values.last ? 8 : 0,
            ),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedPriority = priority;
                });
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected 
                      ? priority.color.withOpacity(0.2)
                      : Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected 
                        ? priority.color 
                        : Colors.grey[300]!,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    priority.displayName,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? priority.color : Colors.grey[700],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDueDateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Due Date',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: _selectDueDate,
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
                  Icons.calendar_today,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _dueDate != null 
                        ? DateFormat('MMM d, yyyy').format(_dueDate!)
                        : 'Select due date',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: _dueDate != null ? null : Colors.grey[600],
                    ),
                  ),
                ),
                if (_dueDate != null)
                  IconButton(
                    icon: Icon(
                      Icons.clear,
                      color: Colors.grey[600],
                    ),
                    onPressed: () {
                      setState(() {
                        _dueDate = null;
                      });
                    },
                  )
                else
                  Icon(
                    Icons.arrow_drop_down,
                    color: Colors.grey[600],
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecurrenceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Recurrence',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const Spacer(),
            Switch(
              value: _recurrence != null,
              onChanged: (value) {
                setState(() {
                  if (value) {
                    _recurrence = RecurrenceType.weekly;
                    _intervalController.text = '7';
                  } else {
                    _recurrence = null;
                    _intervalController.clear();
                  }
                });
              },
              activeColor: AppTheme.primaryColor,
            ),
          ],
        ),
        
        if (_recurrence != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<RecurrenceType>(
                  value: _recurrence,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                  items: RecurrenceType.values.map((type) {
                    return DropdownMenuItem(
                      value: type,
                      child: Text(type.displayName),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _recurrence = value;
                      if (value != RecurrenceType.custom) {
                        _intervalController.text = value!.defaultInterval.toString();
                      }
                    });
                  },
                ),
              ),
              if (_recurrence == RecurrenceType.custom) ...[
                const SizedBox(width: 12),
                SizedBox(
                  width: 100,
                  child: CustomTextField(
                    controller: _intervalController,
                    labelText: 'Days',
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    validator: (value) {
                      if (_recurrence == RecurrenceType.custom) {
                        if (value == null || value.isEmpty) {
                          return 'Required';
                        }
                        final days = int.tryParse(value);
                        if (days == null || days < 1) {
                          return 'Invalid';
                        }
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ],
          ),
        ],
      ],
    );
  }

  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    
    if (picked != null) {
      setState(() {
        _dueDate = picked;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState?.validate() == true) {
      setState(() => _isLoading = true);
      
      try {
        int? recurrenceInterval;
        if (_recurrence != null) {
          if (_recurrence == RecurrenceType.custom) {
            recurrenceInterval = int.parse(_intervalController.text);
          } else {
            recurrenceInterval = _recurrence!.defaultInterval;
          }
        }
        
        final task = MaintenanceTask(
          id: widget.task?.id ?? _uuid.v4(),
          aquariumId: widget.aquariumId,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty 
              ? null 
              : _descriptionController.text.trim(),
          category: _selectedCategory,
          priority: _selectedPriority,
          dueDate: _dueDate,
          recurrence: _recurrence,
          recurrenceInterval: recurrenceInterval,
          isCompleted: widget.task?.isCompleted ?? false,
          completedDate: widget.task?.completedDate,
          completedBy: widget.task?.completedBy,
          createdAt: widget.task?.createdAt ?? DateTime.now(),
          updatedAt: DateTime.now(),
        );
        
        await MaintenanceService.saveTask(task, widget.aquariumName);
        
        if (mounted) {
          widget.onTaskAdded();
          Navigator.pop(context);
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isEditing 
                    ? 'Task updated successfully'
                    : 'Task added successfully',
              ),
              backgroundColor: AppTheme.successColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to save task: $e'),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }
}