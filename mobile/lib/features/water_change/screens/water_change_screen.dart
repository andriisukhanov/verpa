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
import '../models/water_change.dart';
import '../services/water_change_service.dart';

class WaterChangeScreen extends StatefulWidget {
  final String aquariumId;
  final WaterChange? waterChange;

  const WaterChangeScreen({
    super.key,
    required this.aquariumId,
    this.waterChange,
  });

  @override
  State<WaterChangeScreen> createState() => _WaterChangeScreenState();
}

class _WaterChangeScreenState extends State<WaterChangeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();
  
  final _volumeController = TextEditingController();
  final _notesController = TextEditingController();
  
  DateTime _selectedDate = DateTime.now();
  WaterChangeType _selectedType = WaterChangeType.partial;
  double _percentage = 0;
  String _volumeUnit = 'liters';
  bool _isLoading = false;
  Aquarium? _aquarium;
  
  final List<String> _commonProducts = [
    'Water Conditioner',
    'Stress Coat',
    'Prime',
    'Stability',
    'Aquarium Salt',
    'pH Adjuster',
    'Alkalinity Buffer',
    'Calcium Supplement',
  ];
  
  List<String> _selectedProducts = [];
  Map<String, double> _parametersBeforeChange = {};
  bool _recordParametersBefore = false;
  
  bool get isEditing => widget.waterChange != null;

  @override
  void initState() {
    super.initState();
    _loadAquarium();
    if (isEditing) {
      _populateFields();
    }
  }

  void _loadAquarium() {
    context.read<AquariumBloc>().add(
      AquariumLoadRequested(aquariumId: widget.aquariumId),
    );
  }

  void _populateFields() {
    final change = widget.waterChange!;
    _volumeController.text = change.amount.toString();
    _notesController.text = change.notes ?? '';
    _selectedDate = change.date;
    _selectedType = change.type;
    _percentage = change.percentage;
    _volumeUnit = change.unit;
    _selectedProducts = List.from(change.productsUsed ?? []);
    if (change.parametersBeforeChange != null) {
      _parametersBeforeChange = Map.from(change.parametersBeforeChange!);
      _recordParametersBefore = true;
    }
  }

  @override
  void dispose() {
    _volumeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Water Change' : 'Record Water Change'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          if (state is AquariumLoaded) {
            setState(() {
              _aquarium = state.aquarium;
              _volumeUnit = _aquarium!.volumeUnit;
            });
            
            // Calculate recommended change
            if (!isEditing && _aquarium!.currentParameters != null) {
              final recommendation = WaterChangeService.calculateRecommendedChange(
                aquariumVolume: _aquarium!.volume,
                volumeUnit: _aquarium!.volumeUnit,
                currentParameters: {
                  'nitrate': _aquarium!.currentParameters!.nitrate ?? 0,
                  'phosphate': _aquarium!.currentParameters!.phosphate ?? 0,
                },
              );
              
              if (_volumeController.text.isEmpty) {
                _volumeController.text = recommendation['volume'].toStringAsFixed(1);
                _percentage = recommendation['percentage'];
              }
            }
          }
        },
        child: LoadingOverlay(
          isLoading: _isLoading,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Date Selection
                    _buildDateSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Water Change Type
                    _buildTypeSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Volume Input
                    _buildVolumeSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Products Used
                    _buildProductsSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Parameters Before Change
                    _buildParametersSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Notes
                    _buildNotesSection(),
                    
                    const SizedBox(height: 32),
                    
                    // Submit Button
                    CustomButton(
                      text: isEditing ? 'Update Water Change' : 'Record Water Change',
                      icon: Icons.save,
                      onPressed: _handleSubmit,
                      isLoading: _isLoading,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDateSection() {
    final formatter = DateFormat('MMM d, yyyy - h:mm a');
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Date & Time',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        InkWell(
          onTap: _selectDateTime,
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
                    formatter.format(_selectedDate),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
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

  Widget _buildTypeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Change Type',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        ...WaterChangeType.values.map((type) {
          final isSelected = _selectedType == type;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedType = type;
                });
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected 
                      ? AppTheme.primaryColor.withOpacity(0.1)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected 
                        ? AppTheme.primaryColor 
                        : AppTheme.borderColor,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isSelected 
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked,
                      color: isSelected 
                          ? AppTheme.primaryColor 
                          : Colors.grey,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      type.displayName,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: isSelected 
                            ? FontWeight.w600 
                            : FontWeight.normal,
                        color: isSelected 
                            ? AppTheme.primaryColor 
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ],
    );
  }

  Widget _buildVolumeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Volume Changed',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _volumeController,
                labelText: 'Volume',
                hintText: '0.0',
                suffixText: _volumeUnit == 'liters' ? 'L' : 'gal',
                prefixIcon: Icons.water_drop,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
                ],
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter volume';
                  }
                  final volume = double.tryParse(value);
                  if (volume == null || volume <= 0) {
                    return 'Please enter a valid volume';
                  }
                  return null;
                },
                onChanged: (value) {
                  _calculatePercentage();
                },
              ),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.secondaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Text(
                    '${_percentage.toStringAsFixed(1)}%',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.secondaryColor,
                    ),
                  ),
                  Text(
                    'of total',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        
        if (_aquarium != null) ...[
          const SizedBox(height: 8),
          Text(
            'Aquarium volume: ${_aquarium!.volume} ${_aquarium!.volumeUnit}',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildProductsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Products Used (Optional)',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _commonProducts.map((product) {
            final isSelected = _selectedProducts.contains(product);
            
            return FilterChip(
              label: Text(product),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedProducts.add(product);
                  } else {
                    _selectedProducts.remove(product);
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
        ),
      ],
    );
  }

  Widget _buildParametersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Parameters Before Change',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Switch(
              value: _recordParametersBefore,
              onChanged: (value) {
                setState(() {
                  _recordParametersBefore = value;
                  if (!value) {
                    _parametersBeforeChange.clear();
                  }
                });
              },
              activeColor: AppTheme.primaryColor,
            ),
          ],
        ),
        
        if (_recordParametersBefore) ...[
          const SizedBox(height: 16),
          Text(
            'Record current parameters before the water change',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          
          // Parameter inputs
          Row(
            children: [
              Expanded(
                child: _buildParameterInput(
                  label: 'Nitrate',
                  suffix: 'ppm',
                  parameter: 'nitrate',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildParameterInput(
                  label: 'Nitrite',
                  suffix: 'ppm',
                  parameter: 'nitrite',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildParameterInput(
                  label: 'Ammonia',
                  suffix: 'ppm',
                  parameter: 'ammonia',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildParameterInput(
                  label: 'pH',
                  suffix: '',
                  parameter: 'ph',
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildParameterInput({
    required String label,
    required String suffix,
    required String parameter,
  }) {
    return TextFormField(
      initialValue: _parametersBeforeChange[parameter]?.toString() ?? '',
      decoration: InputDecoration(
        labelText: label,
        suffixText: suffix.isNotEmpty ? suffix : null,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
      ),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
      ],
      onChanged: (value) {
        final doubleValue = double.tryParse(value);
        if (doubleValue != null) {
          _parametersBeforeChange[parameter] = doubleValue;
        } else {
          _parametersBeforeChange.remove(parameter);
        }
      },
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
          hintText: 'Any observations or special conditions...',
          prefixIcon: Icons.notes,
          maxLines: 3,
          minLines: 2,
        ),
      ],
    );
  }

  void _calculatePercentage() {
    if (_aquarium == null) return;
    
    final volume = double.tryParse(_volumeController.text) ?? 0;
    setState(() {
      _percentage = (volume / _aquarium!.volume * 100).clamp(0, 100);
    });
  }

  Future<void> _selectDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    
    if (date != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_selectedDate),
      );
      
      if (time != null && mounted) {
        setState(() {
          _selectedDate = DateTime(
            date.year,
            date.month,
            date.day,
            time.hour,
            time.minute,
          );
        });
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState?.validate() == true && _aquarium != null) {
      setState(() => _isLoading = true);
      
      try {
        final waterChange = WaterChange(
          id: widget.waterChange?.id ?? _uuid.v4(),
          aquariumId: widget.aquariumId,
          date: _selectedDate,
          amount: double.parse(_volumeController.text),
          unit: _volumeUnit,
          percentage: _percentage,
          type: _selectedType,
          notes: _notesController.text.trim().isEmpty 
              ? null 
              : _notesController.text.trim(),
          parametersBeforeChange: _recordParametersBefore && _parametersBeforeChange.isNotEmpty
              ? _parametersBeforeChange
              : null,
          productsUsed: _selectedProducts.isEmpty ? null : _selectedProducts,
          createdAt: widget.waterChange?.createdAt ?? DateTime.now(),
        );
        
        await WaterChangeService.saveWaterChange(waterChange);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                isEditing 
                    ? 'Water change updated successfully'
                    : 'Water change recorded successfully',
              ),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to save water change: $e'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }
}