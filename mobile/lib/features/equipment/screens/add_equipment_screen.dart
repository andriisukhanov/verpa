import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';

class AddEquipmentScreen extends StatefulWidget {
  final String aquariumId;
  final Equipment? equipment;

  const AddEquipmentScreen({
    super.key,
    required this.aquariumId,
    this.equipment,
  });

  @override
  State<AddEquipmentScreen> createState() => _AddEquipmentScreenState();
}

class _AddEquipmentScreenState extends State<AddEquipmentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();
  
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _notesController = TextEditingController();
  
  EquipmentType _selectedType = EquipmentType.filter;
  DateTime? _purchaseDate;
  DateTime? _lastMaintenanceDate;
  DateTime? _nextMaintenanceDate;
  bool _isActive = true;
  bool _isLoading = false;

  bool get isEditing => widget.equipment != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _populateFields();
    }
  }

  void _populateFields() {
    final equipment = widget.equipment!;
    _nameController.text = equipment.name;
    _brandController.text = equipment.brand ?? '';
    _modelController.text = equipment.model ?? '';
    _notesController.text = equipment.notes ?? '';
    _selectedType = equipment.type;
    _purchaseDate = equipment.purchaseDate;
    _lastMaintenanceDate = equipment.lastMaintenanceDate;
    _nextMaintenanceDate = equipment.nextMaintenanceDate;
    _isActive = equipment.isActive;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Equipment' : 'Add Equipment'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          setState(() {
            _isLoading = state is AquariumLoading;
          });

          if (state is AquariumEquipmentAdded || state is AquariumEquipmentUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isEditing 
                    ? 'Equipment updated successfully'
                    : 'Equipment added successfully'
                ),
                backgroundColor: AppTheme.successColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
            context.pop();
          } else if (state is AquariumError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.errorColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: LoadingOverlay(
          isLoading: _isLoading,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Equipment Type
                    _buildTypeSelector(),
                    
                    const SizedBox(height: 24),
                    
                    // Basic Information
                    _buildBasicInfoSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Purchase & Maintenance
                    _buildDatesSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Status
                    _buildStatusSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Notes
                    _buildNotesSection(),
                    
                    const SizedBox(height: 32),
                    
                    // Submit Button
                    CustomButton(
                      text: isEditing ? 'Update Equipment' : 'Add Equipment',
                      icon: Icons.save,
                      onPressed: _isLoading ? null : _handleSubmit,
                      isLoading: _isLoading,
                    ),
                    
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Equipment Type',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            childAspectRatio: 1.2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: EquipmentType.values.length,
          itemBuilder: (context, index) {
            final type = EquipmentType.values[index];
            final isSelected = _selectedType == type;
            
            return InkWell(
              onTap: () {
                setState(() {
                  _selectedType = type;
                });
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected 
                    ? type.color.withOpacity(0.2)
                    : Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? type.color : Colors.grey[300]!,
                    width: 2,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      type.icon,
                      color: isSelected ? type.color : Colors.grey[600],
                      size: 28,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      type.displayName,
                      style: TextStyle(
                        color: isSelected ? type.color : Colors.grey[600],
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildBasicInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Basic Information',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _nameController,
          labelText: 'Equipment Name',
          hintText: 'e.g., Main Filter, UV Sterilizer',
          prefixIcon: Icons.label,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter equipment name';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _brandController,
                labelText: 'Brand (Optional)',
                hintText: 'e.g., Fluval, Eheim',
                prefixIcon: Icons.business,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _modelController,
                labelText: 'Model (Optional)',
                hintText: 'e.g., FX6, 2217',
                prefixIcon: Icons.category,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDatesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Purchase & Maintenance',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Purchase Date
        _buildDateField(
          label: 'Purchase Date (Optional)',
          date: _purchaseDate,
          onTap: () => _selectDate(
            initialDate: _purchaseDate ?? DateTime.now(),
            onSelected: (date) => setState(() => _purchaseDate = date),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Last Maintenance
        _buildDateField(
          label: 'Last Maintenance (Optional)',
          date: _lastMaintenanceDate,
          onTap: () => _selectDate(
            initialDate: _lastMaintenanceDate ?? DateTime.now(),
            onSelected: (date) => setState(() => _lastMaintenanceDate = date),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Next Maintenance
        _buildDateField(
          label: 'Next Maintenance (Optional)',
          date: _nextMaintenanceDate,
          onTap: () => _selectDate(
            initialDate: _nextMaintenanceDate ?? DateTime.now().add(const Duration(days: 30)),
            firstDate: DateTime.now(),
            onSelected: (date) => setState(() => _nextMaintenanceDate = date),
          ),
        ),
        
        if (_nextMaintenanceDate != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.infoColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: AppTheme.infoColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You\'ll receive a reminder for maintenance',
                    style: TextStyle(
                      color: AppTheme.infoColor,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
  }) {
    final formatter = DateFormat('MMM d, yyyy');
    
    return InkWell(
      onTap: onTap,
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    date != null ? formatter.format(date) : 'Tap to select',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: date != null ? FontWeight.w500 : FontWeight.normal,
                      color: date != null ? null : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
            if (date != null)
              IconButton(
                icon: const Icon(Icons.clear, size: 20),
                onPressed: () {
                  setState(() {
                    if (label.contains('Purchase')) _purchaseDate = null;
                    if (label.contains('Last')) _lastMaintenanceDate = null;
                    if (label.contains('Next')) _nextMaintenanceDate = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Status',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.borderColor,
              width: 1,
            ),
          ),
          child: SwitchListTile(
            title: const Text('Equipment Active'),
            subtitle: Text(
              _isActive 
                ? 'Equipment is currently in use'
                : 'Equipment is not in use',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
            value: _isActive,
            onChanged: (value) {
              setState(() {
                _isActive = value;
              });
            },
            activeColor: AppTheme.successColor,
          ),
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Notes (Optional)',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _notesController,
          labelText: 'Additional Notes',
          hintText: 'Any additional information about this equipment',
          prefixIcon: Icons.notes,
          maxLines: 3,
          minLines: 3,
        ),
      ],
    );
  }

  Future<void> _selectDate({
    required DateTime initialDate,
    DateTime? firstDate,
    required Function(DateTime) onSelected,
  }) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate ?? DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    
    if (picked != null) {
      onSelected(picked);
    }
  }

  void _handleSubmit() {
    if (_formKey.currentState?.validate() == true) {
      final equipment = Equipment(
        id: widget.equipment?.id ?? _uuid.v4(),
        name: _nameController.text.trim(),
        type: _selectedType,
        brand: _brandController.text.trim().isEmpty ? null : _brandController.text.trim(),
        model: _modelController.text.trim().isEmpty ? null : _modelController.text.trim(),
        purchaseDate: _purchaseDate,
        lastMaintenanceDate: _lastMaintenanceDate,
        nextMaintenanceDate: _nextMaintenanceDate,
        isActive: _isActive,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      if (isEditing) {
        context.read<AquariumBloc>().add(
          AquariumEquipmentUpdateRequested(
            aquariumId: widget.aquariumId,
            equipment: equipment,
          ),
        );
      } else {
        context.read<AquariumBloc>().add(
          AquariumEquipmentAddRequested(
            aquariumId: widget.aquariumId,
            equipment: equipment,
          ),
        );
      }
    }
  }
}